/** 验发布产物：原始 HTML、发现文件、路由元数据与无 JS 交互。 */
import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { serveDist } from './lib/serve.mjs'
import siteUrl from '../src/content/site-url.json' with { type: 'json' }

const root = fileURLToPath(new URL('../', import.meta.url))
// 与当前内容源核对，避免测试抄写另一份品牌、所在地和渠道列表。
const sourceServer = await createServer({
  root, logLevel: 'error', server: { middlewareMode: true, hmr: false },
})
let source
let caseSource
try {
  ;[source, caseSource] = await Promise.all([
    sourceServer.ssrLoadModule('/src/content/site.ts'),
    sourceServer.ssrLoadModule('/src/content/cases.ts'),
  ])
} finally { await sourceServer.close() }
const { AS_OF, contact, metric, profile, profileLabel, profileTitleLabel, services, trackA, trackB } = source
const { cases } = caseSource
const dist = `${root}/dist`
const origin = siteUrl.url
const router = await readFile(`${root}/src/router.tsx`, 'utf8')
const routes = [...router.match(/export const ROUTES[^=]*=\s*\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
const { server, url } = await serveDist({ dist, port: 0 })
const encodedSeparators = ['case%2Frepair/', 'case%2frepair/', 'case%5Crepair/']
let browser
let checks = 0
const check = (condition, message) => { assert.ok(condition, message); checks++; console.log(`✓ ${message}`) }
const equal = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message)
  checks++
  console.log(`✓ ${message}`)
}
const inspectHead = () => ({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.content,
  author: document.querySelector('meta[name="author"]')?.content,
  robots: document.querySelector('meta[name="robots"]')?.content,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  ogUrl: document.querySelector('meta[property="og:url"]')?.content,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  ogDescription: document.querySelector('meta[property="og:description"]')?.content,
  image: document.querySelector('meta[property="og:image"]')?.content,
  schema: JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || 'null'),
})

try {
  // 中文数量是编辑文案；服务与案例均用同一策略，列表变化时要求同步改文案。
  check(services.length === 6, '服务数量须与“六项服务 / 六件事”一致；增删服务时请同步导语')
  check(cases.length === 6, '案例数量须与“六个项目”一致；增删案例时请同步导语')
  check(contact.channels.every((channel) => typeof channel.isProfile === 'boolean'), '每个联系渠道显式声明是否属于身份链接')
  const profileLinks = contact.channels.filter((channel) => channel.isProfile).map((channel) => channel.href)
  const sitemap = await readFile(`${dist}/sitemap.xml`, 'utf8')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  equal(locations, routes.map((r) => origin + r.slice(1)), 'sitemap 地址与正式路由表逐项一致')
  check(new Set(locations).size === routes.length, 'sitemap 恰好覆盖全部正式路由，无重复或旧域名')
  check(!sitemap.includes('<lastmod>'), 'sitemap 不冒用快照日或构建日')
  const robots = await readFile(`${dist}/robots.txt`, 'utf8')
  check(robots === `User-agent: *\nAllow: /\n\nSitemap: ${origin}sitemap.xml\n`, '通用抓取规则保持开放，Sitemap 使用正式域名')
  check((await readFile(`${dist}/CNAME`, 'utf8')).trim() === new URL(origin).hostname, 'CNAME 与正式域名一致')
  for (const name of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
    const response = await fetch(url + name)
    check(response.status === 200 && !(await response.text()).includes('<!doctype html>'), `${name} 根路径可取到真实文件`)
  }
  const notFound = await fetch(url + 'missing/deep/page/')
  check(notFound.status === 404 && /name="robots" content="noindex, follow"/.test(await notFound.text()), '不存在路径返回 404 和 noindex，无首页软 404')
  const redirect = await fetch(url + 'case/repair', { redirect: 'manual' })
  check(redirect.status === 301 && redirect.headers.get('location') === '/case/repair/', '案例目录无尾斜杠时跳至规范路径')

  browser = await chromium.launch()
  const nojs = await browser.newContext({ javaScriptEnabled: false })
  const page = await nojs.newPage()
  const expected = new Map()
  const titles = new Set()
  const descriptions = new Set()
  for (const route of routes) {
    const response = await page.goto(url + route.slice(1))
    const head = await page.evaluate(inspectHead)
    const canonical = origin + route.slice(1)
    check(response.status() === 200 && await page.locator('h1').count() === 1, `${route} 无 JS：200、单个 H1`)
    check(await page.locator('#root').getAttribute('data-route') === route, `${route} 预渲染根节点 data-route 与实际路由一致，保留水合契约`)
    check(head.canonical === canonical && head.ogUrl === canonical, `${route} canonical / og:url 一致`)
    check(head.ogTitle === head.title && head.ogDescription === head.description && typeof head.description === 'string' && head.description.length > 30, `${route} 标题与分享摘要一致且非空`)
    check([...head.description].length <= 100, `${route} 摘要符合本站 100 字符维护预算（非搜索引擎限制），当前 ${[...head.description].length} 字符`)
    check(!descriptions.has(head.description), `${route} 搜索与分享摘要独立`)
    descriptions.add(head.description)
    check(head.image === origin + 'og.png', `${route} 分享图使用绝对 URL`)
    check(await page.locator('title').count() === 1 && await page.locator('link[rel="canonical"]').count() === 1 && await page.locator('script[type="application/ld+json"]').count() === 1, `${route} 元数据没有重复`)
    check(Array.isArray(head.schema?.['@graph']), `${route} JSON-LD 包含有效 graph`)
    const graph = head.schema['@graph']
    const ids = new Set(graph.map((item) => item['@id']))
    const dangling = []
    const inspectReferences = (value) => {
      if (!value || typeof value !== 'object') return
      if (Object.keys(value).length === 1 && value['@id'] && !ids.has(value['@id'])) dangling.push(value['@id'])
      Object.values(value).forEach(inspectReferences)
    }
    graph.forEach(inspectReferences)
    check(ids.size === graph.length && dangling.length === 0, `${route} JSON-LD 节点唯一且引用完整`)
    const person = graph.find((item) => item['@type'] === 'Person')
    check(head.schema['@context'] === 'https://schema.org' && person?.name === profile.name && person.alternateName === profile.handle && person.url === origin, `${route} JSON-LD 可解析，品牌身份一致`)
    equal(person.sameAs, profileLinks, `${route} sameAs 身份链接与内容源一致`)
    check(head.author === profileLabel, `${route} 作者与内容源一致`)
    check(!JSON.stringify(head).includes('https://88lin.github.io/website/'), `${route} head 无旧站址`)
    check(typeof head.robots === 'string' && /(?:^|,)\s*index\s*(?:,|$)/i.test(head.robots) && !/\bnoindex\b/i.test(head.robots), `${route} robots 标签存在且正常页允许索引`)
    if (route !== '/') {
      const article = graph.find((item) => item['@type'] === 'TechArticle')
      const caseStudy = cases.find((item) => route === `/case/${item.slug}/`)
      check(Boolean(caseStudy), `${route} 对应实际案例内容源`)
      check(article.headline === (await page.locator('h1').textContent()).trim(), `${route} 结构化标题与可见案例标题一致`)
      equal(head.description, caseStudy.seoDescription, `${route} 搜索摘要使用案例专用短描述`)
      equal(article.description, head.description, `${route} 结构化描述与搜索、分享短摘要一致`)
      equal(await page.locator('.cpage__summary').textContent(), caseStudy.summary, `${route} 可见介绍保留完整案例叙述`)
      check(await page.locator('.step h2').count() === 3 && await page.locator('.cpage__byline a').getAttribute('href') === article.citation, `${route} 三段语义标题和源码证据齐全`)
      for (const heading of await page.locator('.step h2').all()) {
        const label = await heading.locator('span').textContent()
        check(await page.getByRole('heading', { level: 2, name: label, exact: true }).count() === 1, `${route} 标题「${label}」的无障碍名称不含装饰编号`)
      }
      check(!/(?:Agent|Skill)案例/.test(head.title), `${route} 案例标题中英间距正确`)
      const crumbs = graph.find((item) => item['@type'] === 'BreadcrumbList')
      check(crumbs.itemListElement[1].item === canonical && await page.locator('nav[aria-label="面包屑"]').count() === 1, `${route} 面包屑与实际位置一致`)
    } else {
      const serviceNodes = graph.filter((item) => item['@type'] === 'Service')
      check(serviceNodes.length === await page.locator('.svc__item[id]').count(), '结构化数据覆盖每项可见服务')
      for (const service of serviceNodes) {
        const id = new URL(service.url).hash
        check(await page.locator(`${id} h3`).textContent() === service.name, `服务结构化数据对应可见锚点 ${id}`)
        check(service.serviceType === service.name, `Service 节点使用实际服务名称 ${id}`)
      }
      check(person.address === profile.location, '人物地址与公开的所在地一致')
      const heroText = await page.locator('.hero__body').textContent()
      check(heroText.startsWith(profileLabel), '首屏介绍明确品牌、身份和服务')
      check(head.title.startsWith(`${profileTitleLabel}｜`), '首页标题用并列品牌写法')
      check(heroText.includes('下面六项服务') && (await page.locator('#services .chap__intro').textContent()).startsWith('六件'), '首屏与服务区导语保留中文数量，与六项服务一致')
      check((await page.locator('#cases .chap__intro').textContent()).startsWith('六个项目'), '案例导语保留中文数量，与六个案例一致')
      const evidence = head.description.split('。')[0]
      check(evidence.includes(`${metric('repos').value} 个原创仓库`) && evidence.includes(`${metric('stars').value} Star`) && head.description.includes(AS_OF), '摘要第一句含当前仓库、Star 证据，且保留真实快照日')
      const topics = [...trackA.items, ...trackB.items].map((item) => item.title)
      equal(await page.locator('.track__list h4').allTextContents(), topics, '主线可见标题与内容源逐项一致')
      equal(person.knowsAbout, [...new Set(topics)], 'knowsAbout 仅使用可见主线主题，服务由 Service 节点表达')
      const visibleChannels = await page.locator('.chans a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))
      check(person.sameAs.every((href) => visibleChannels.includes(href)), '所有身份链接均可在联系方式中核对')
    }
    check(!titles.has(head.title), `${route} 标题独立`)
    titles.add(head.title)
    expected.set(route, head)
  }

  await page.goto(url)
  const llms = await readFile(`${dist}/llms.txt`, 'utf8')
  check(llms.startsWith(`# ${profileLabel}\n`), 'llms 品牌写法与首页一致')
  const links = [...llms.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((m) => m[1]).filter((href) => href.startsWith(origin))
  for (const href of links) {
    const target = new URL(href)
    check(routes.includes(target.pathname), `llms 索引指向实际页面 ${target.pathname}`)
    if (target.hash) check(await page.locator(target.hash).count() === 1, `llms 锚点存在 ${target.hash}`)
  }
  for (const details of await page.locator('.cooperation details').all()) {
    const summary = details.locator('summary')
    await summary.focus()
    await page.keyboard.press('Enter')
    check(await details.evaluate((node) => node.open) && await details.locator('p').isVisible(), '合作问答无 JS 可用键盘展开、正文可见')
    await page.keyboard.press('Enter')
    check(!await details.evaluate((node) => node.open), '合作问答可再次折叠')
  }
  await page.locator('.case__say a').first().click()
  check(new URL(page.url()).pathname.startsWith('/case/'), '禁用 JS 时原生案例链接正常')
  await page.locator('.cpage__back a').click()
  check(page.url() === url, '禁用 JS 时面包屑能回首页')
  await nojs.close()

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const active = await context.newPage()
  const errors = []
  active.on('pageerror', (error) => errors.push(error.message))
  active.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  async function currentHead(route) {
    // SSR head 原本就有 canonical，必须等客户端真正启动后再比较。
    await active.waitForFunction(() => document.documentElement.dataset.booted === '1')
    await active.waitForFunction((canonical) => document.querySelector('link[rel="canonical"]')?.href === canonical, origin + route.slice(1))
    equal(await active.evaluate(inspectHead), expected.get(route), `${route} 客户端 head 与预渲染结果完全一致`)
  }
  for (const route of routes) {
    await active.goto(url + route.slice(1), { waitUntil: 'networkidle' })
    await currentHead(route)
  }
  await active.goto(url)
  await currentHead('/')
  await active.locator('.case__say a').first().click()
  const first = new URL(active.url()).pathname
  await currentHead(first)
  await active.locator('.cpage__more a').first().click()
  const second = new URL(active.url()).pathname
  await currentHead(second)
  await active.goBack()
  await currentHead(first)
  await active.goForward()
  await currentHead(second)
  await active.locator('.cpage__back a').click()
  await currentHead('/')
  await mkdir(`${root}/.shots`, { recursive: true })
  await active.screenshot({ path: `${root}/.shots/seo-home-desktop.png` })
  await active.goto(url + 'case/repair/')
  await currentHead('/case/repair/')
  await active.screenshot({ path: `${root}/.shots/seo-case-desktop.png` })
  await active.setViewportSize({ width: 390, height: 844 })
  await active.screenshot({ path: `${root}/.shots/seo-case-mobile.png` })
  await active.goto(url)
  await active.evaluate(() => document.fonts.ready)
  check(await active.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '首页新文案在 390px 无横向溢出')
  await active.screenshot({ path: `${root}/.shots/seo-home-mobile.png` })
  await active.goto(url + '#services')
  await active.locator('.cooperation summary').first().click()
  await active.locator('.cooperation').scrollIntoViewIfNeeded()
  check(await active.locator('.cooperation details').first().evaluate((node) => node.open), '移动端合作问答可点击展开')
  check(await active.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '新增内容在 390px 无横向溢出')
  await active.screenshot({ path: `${root}/.shots/seo-services-mobile.png` })
  check(errors.length === 0, `路由切换和问答无运行时 / 水合报错 ${errors.join('; ')}`)
  await context.close()

  // 开启动效检查新摘要与作者行，并快速切换案例，覆盖组件复用导致动画漏初始化。
  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const motionPage = await motionContext.newPage()
  await motionPage.goto(url + 'case/repair/')
  await motionPage.locator('.cpage__more a').first().evaluate((link) => link.click())
  await motionPage.waitForFunction(() => ['.cpage__claim', '.cpage__summary', '.cpage__byline'].every((selector) => {
    const node = document.querySelector(selector)
    return node?.classList.contains('is-in') && Number(getComputedStyle(node).opacity) === 1
  }))
  check(true, '快速切换案例后标题、摘要与作者行完成入场且可见')
  await motionContext.close()

  async function verify404(baseUrl) {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    try {
      const tab = await ctx.newPage()
      for (const missingPath of ['missing/deep/page/', 'missing', 'case/nope/', ...encodedSeparators]) {
        const response = await tab.goto(baseUrl + missingPath)
        check(response.status() === 404 && await tab.locator('meta[name="robots"]').getAttribute('content') === 'noindex, follow', `${baseUrl}${missingPath} 无 JS 返回真实 404 与 noindex`)
        check(await tab.locator('a').getAttribute('href') === origin && (await tab.locator('link[rel="icon"]').getAttribute('href')).startsWith(origin + 'favicon.svg?v='), '独立 404 的首页和图标固定使用正式域名，不随错误路径改变')
      }
    } finally { await ctx.close() }
  }

  async function verifyFallback(baseUrl) {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' })
    try {
      const tab = await ctx.newPage()
      const fallbackErrors = []
      tab.on('pageerror', (error) => fallbackErrors.push(error.message))
      tab.on('console', (message) => { if (message.type() === 'error') fallbackErrors.push(message.text()) })
      // 仅模拟入口资源已正确配置的 SPA 托管。原始相对资源外壳不能直接
      // 用于任意深层路径；生产静态托管必须使用独立 404，而不是首页 fallback。
      const shell = (await readFile(`${dist}/index.html`, 'utf8')).replace(/(href|src)="\.\//g, `$1="${baseUrl}`)
      const paths = ['foo/', 'foo', 'missing/deep/page/', 'showcase/repair/', 'case/nope/', 'case/REPAIR/', ...encodedSeparators]
      for (const missingPath of paths) {
        await ctx.route(baseUrl + missingPath, (route) => route.fulfill({
          status: 200,
          contentType: 'text/html',
          headers: { 'x-test-spa-fallback': missingPath },
          body: shell,
        }))
      }
      await tab.goto(baseUrl + 'foo/', { waitUntil: 'networkidle' })
      await tab.evaluate((pathname) => {
        history.pushState(null, '', pathname)
        dispatchEvent(new PopStateEvent('popstate'))
      }, new URL(baseUrl).pathname + 'foo')
      await tab.waitForFunction((base) => document.querySelector('.cpage__miss a')?.href === base, baseUrl)
      check(await tab.locator('.cpage__miss a').evaluate((a) => a.href) === baseUrl, '只改变尾斜杠的历史切换也会更新原生返回链接')
      for (const missingPath of paths) {
        const response = await tab.goto(baseUrl + missingPath)
        check(response.status() === 200 && response.headers()['x-test-spa-fallback'] === missingPath, `${baseUrl}${missingPath} 确实命中 SPA 外壳拦截，未落到真实 404`)
        await tab.waitForFunction(() => document.documentElement.dataset.booted === '1' && document.querySelector('meta[name="robots"]')?.content === 'noindex, follow')
        check(await tab.getByRole('heading', { name: '页面不存在', level: 1, exact: true }).count() === 1 && await tab.locator('.hero').count() === 0, `${baseUrl}${missingPath} SPA fallback 显示缺失态`)
        check(await tab.locator('link[rel="canonical"], meta[property^="og:"], script[type="application/ld+json"]').count() === 0, '错误页清除首页 canonical、分享元数据和结构化数据')
        check(await tab.locator('.cpage__miss a').evaluate((link) => link.href) === baseUrl, '错误页原生返回链接保留实际部署目录')
        if (baseUrl === url && missingPath === 'foo/') {
          await tab.setViewportSize({ width: 390, height: 844 })
          await tab.evaluate(() => document.fonts.ready)
          await tab.screenshot({ path: `${root}/.shots/seo-missing-mobile.png` })
        }
        await tab.locator('.cpage__miss a').click()
        await tab.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.startsWith('index,'))
        check(tab.url() === baseUrl && await tab.locator('.hero').count() === 1, '错误页可回首页并恢复正常元数据')
        await tab.goBack()
        await tab.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === 'noindex, follow')
      }
      check(fallbackErrors.length === 0, `SPA fallback 与前进后退无水合/运行时错误 ${fallbackErrors.join('; ')}`)
      // 有 JS 的子路径导航也必须正确，避免仅靠禁用 JS 的回归掩盖路由错误。
      await tab.goto(baseUrl + 'index.html')
      await tab.locator('.case__say a').first().click()
      await tab.waitForFunction(() => document.querySelector('.cpage__claim'))
      check(tab.url().startsWith(baseUrl + 'case/'), '有 JS 的案例链接保留部署目录')
      await tab.locator('.cpage__back a').click()
      check(tab.url() === baseUrl, '有 JS 的案例返回链接保留部署目录')
      for (const entry of ['case/%72epair/', 'case/repair/index.html', 'case/repair/?from=test#main']) {
        await tab.goto(baseUrl + entry, { waitUntil: 'networkidle' })
        const head = await tab.evaluate(inspectHead)
        equal(head, expected.get('/case/repair/'), `${baseUrl}${entry} 等价入口的 head 与规范案例一致`)
        check(await tab.locator('.cpage__claim').count() === 1 && await tab.locator('.cpage__back a').evaluate((a) => a.href) === baseUrl, `${entry} 正文、元数据和原生返回链接一致`)
      }
    } finally { await ctx.close() }
  }
  await verify404(url)
  await verifyFallback(url)

  // 相对资源与原生链接继续兼容旧的 /website/ 子路径预览。
  const legacy = await serveDist({ dist, port: 0, prefix: '/website/' })
  try {
    const legacyContext = await browser.newContext({ javaScriptEnabled: false })
    const legacyPage = await legacyContext.newPage()
    await legacyPage.goto(legacy.url)
    await legacyPage.locator('.case__say a').first().click()
    check(legacyPage.url().startsWith(legacy.url + 'case/'), '旧子路径预览的案例链接可用')
    await legacyPage.locator('.cpage__back a').click()
    check(legacyPage.url() === legacy.url, '旧子路径预览的返回链接可用')
    await legacyContext.close()
    await verify404(legacy.url)
    await verifyFallback(legacy.url)
  } finally { await new Promise((resolve) => legacy.server.close(resolve)) }
  console.log(`\nSEO/GEO：${checks} 项通过。仅验证本地产物，不代表线上已收录或已被 AI 引用。`)
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
