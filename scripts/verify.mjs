/**
 * 验收：一条命令，四段闸门。跑法：npm run verify（要先 npm run build）
 *
 *   A 事实   —— 产物里的数字必须等于 site.ts / cases.ts 里的当前值，旧值一个不剩
 *   B 交互   —— 看起来能操作的东西必须真的能操作，四种输入逐个验
 *   C 结构   —— 三档宽度下无横向溢出、无控制台报错、包体在预算内
 *   D 纪律   —— 被判掉过的那批 CSS 一个都不许回来
 *
 * 为什么必须是脚本而不是人眼看截图：上一轮被用户点名的三条 bug
 * （叠卡不能翻、横推轨滚不动、墨影落在饱和面上）全都「看起来是对的」。
 * 截图能看出丑，看不出不能用。
 *
 * 服务器用 scripts/lib/serve.mjs：它把产物挂在 /website/ 子路径下并开 gzip，
 * 和 GitHub Pages 的行为一致，所以验的是真正要发出去的那份东西。
 */

import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFile, readdir, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveDist } from './lib/serve.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const PORT = 5187

/** JS / CSS 的 gzip 预算。超了就红 —— 字体与脚本一失控，LCP 跟着走。 */
const BUDGET_JS_KB = 320
const BUDGET_CSS_KB = 24

let pass = 0
let fail = 0
const ok = (c, s) => {
  console.log(`${c ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${s}`)
  c ? pass++ : fail++
  return c
}
const head = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`)

try {
  await stat(path.join(DIST, 'index.html'))
} catch {
  console.error('verify: 没有 dist/index.html，先跑 npm run build')
  process.exit(1)
}

/*
  产物必须比源码新，否则你验的是上一次构建。

  这个坑刚吃过一次：sections.css 多了一个右括号，postcss 报错、构建以退出码 1
  失败，而那条命令的输出被 `>/dev/null 2>&1` 吞了 —— 于是后面整轮测量都跑在旧
  dist 上，量出来的字号、卡高、圆角全是上一版的值，据此得出的结论全错。
  闸门放在这儿比「记得看构建输出」可靠。
*/
const newestMtime = async (dir) => {
  let t = 0
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    t = Math.max(t, e.isDirectory() ? await newestMtime(p) : (await stat(p)).mtimeMs)
  }
  return t
}
{
  const srcT = Math.max(
    await newestMtime(path.join(ROOT, 'src')),
    (await stat(path.join(ROOT, 'index.html'))).mtimeMs,
  )
  const distT = await newestMtime(DIST)
  if (srcT > distT) {
    console.error(
      `verify: 源码比产物新 ${((srcT - distT) / 1000).toFixed(1)}s —— 先跑 npm run build，` +
        '并且别把它的输出重定向掉（构建失败时 dist 会停在上一版）',
    )
    process.exit(1)
  }
}

/* ══════════════════════════════════════════════ A 事实 */
head('A 事实一致性')

const site = await readFile(path.join(ROOT, 'src/content/site.ts'), 'utf8')
const casesSrc = await readFile(path.join(ROOT, 'src/content/cases.ts'), 'utf8')

const grab = (src, re, what) => {
  const m = src.match(re)
  if (!m) {
    console.error(`verify: 没在源码里找到${what}`)
    process.exit(1)
  }
  return m[1]
}

const asOf = grab(site, /AS_OF\s*=\s*'([\d.]+)'/, ' AS_OF')
const stars = grab(site, /value:\s*'([\d,]+)',\s*label:\s*'累计 Star'/, '累计 Star')
const repos = grab(site, /value:\s*'(\d+)',\s*label:\s*'原创仓库'/, '原创仓库')
/* video_vip 的 star 在 site.ts 的 projects 里（那是作品轨的数据源）。
   窗口放到 900 是因为 blurb 会随文案增删，700 曾经刚好卡在边界上。 */
const vipStars = grab(site, /slug:\s*'video_vip'[\s\S]{0,900}?stars:\s*(\d+)/, 'video_vip star')
const vipPretty = Number(vipStars).toLocaleString('en-US')

const htmls = []
const walk = async (dir) => {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) await walk(p)
    else if (e.name.endsWith('.html')) htmls.push([path.relative(DIST, p).replace(/\\/g, '/'), await readFile(p, 'utf8')])
  }
}
await walk(DIST)

const home = htmls.find(([f]) => f === 'index.html')[1]
ok(htmls.length >= 5, `产物 ${htmls.length} 个 HTML`)
for (const [v, what] of [
  [stars, '累计 Star'],
  [repos, '原创仓库数'],
  [asOf, '核实日期'],
]) {
  ok(home.includes(v), `首页含当前${what} ${v}`)
}

const desc = (home.match(/name="description" content="([^"]+)"/) || [])[1] || ''
const og = (home.match(/property="og:description" content="([^"]+)"/) || [])[1] || ''
ok(desc.includes(stars) && desc.includes(asOf), '首页 description 由 site.ts 现算（含当前数字与日期）')
ok(og === desc, 'og:description 与 description 一致')

/* 已知旧值黑名单。 */
const STALE = [
  '4,764',
  '4,791', // 08-21 那次的 Σstar
  '4,821', // 08-23 那次的 Σstar
  '5,772', // 09-20 那次的 Σstar
  '4,658',
  '4,669', // 08-21 那次的 video_vip
  '4,686', // 08-23 那次的 video_vip
  '4,956', // 09-20 那次的 video_vip
  '24 个原创',
  '25 个原创', // 08-23 那次的原创仓库数
  '1,794',
  '1,795', // 博客那个会倒退的「建站天数」，整个不收录
  '62 个 Playbook', // repair skill 08-23 的 playbook 数
  'v3.1.15', // video_vip 08-23 的版本号
  '2026.08.16',
  '2026.08.20',
  '2026.08.21',
  '2026.08.23',
  '2026.09.20',
  'Fraunces',
  'Caveat',
]
for (const s of STALE) {
  const hit = htmls.filter(([, h]) => h.includes(s)).map(([f]) => f)
  ok(hit.length === 0, `无旧值「${s}」${hit.length ? ' → ' + hit.join(', ') : ''}`)
}

const vip = htmls.find(([f]) => f.includes('video-vip'))
ok(Boolean(vip) && vip[1].includes(vipPretty), `video_vip 子页含当前 star ${vipPretty}`)

const routerSrc = await readFile(path.join(ROOT, 'src/router.tsx'), 'utf8')
const routes = [...routerSrc.match(/export const ROUTES[^=]*=\s*\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(
  (m) => m[1],
)
const sitemap = await readFile(path.join(ROOT, 'public/sitemap.xml'), 'utf8')
const missing = routes.filter((r) => !sitemap.includes(r === '/' ? 'website/</loc>' : `website${r}</loc>`))
ok(missing.length === 0, `sitemap 覆盖 ${routes.length} 条路由${missing.length ? ' 缺 ' + missing : ''}`)
ok(sitemap.includes(asOf.replace(/\./g, '-')), `sitemap lastmod = ${asOf.replace(/\./g, '-')}`)
for (const r of routes) {
  const f = r === '/' ? 'index.html' : r.replace(/^\/|\/$/g, '') + '/index.html'
  ok(
    htmls.some(([n]) => n === f),
    `路由 ${r} 有预渲染产物`,
  )
}

/* ══════════════════════════════════════════════ C 包体预算（不用浏览器，先算完） */
head('C 包体预算')

const assets = path.join(DIST, 'assets')
let js = 0
let css = 0
for (const f of await readdir(assets)) {
  const buf = await readFile(path.join(assets, f))
  const gz = gzipSync(buf, { level: 9 }).length
  if (f.endsWith('.js')) js += gz
  if (f.endsWith('.css')) css += gz
}
ok(js / 1024 <= BUDGET_JS_KB, `JS ${(js / 1024).toFixed(1)} KB gz ≤ ${BUDGET_JS_KB} KB`)
ok(css / 1024 <= BUDGET_CSS_KB, `CSS ${(css / 1024).toFixed(1)} KB gz ≤ ${BUDGET_CSS_KB} KB`)

const fonts = path.join(DIST, 'fonts')
let font = 0
for (const f of await readdir(fonts)) {
  if (f.endsWith('.woff2')) font += (await stat(path.join(fonts, f))).size
}
ok(font / 1024 <= 200, `字体 ${(font / 1024).toFixed(1)} KB ≤ 200 KB（硬预算）`)

/* ══════════════════════════════════════════════ D 设计纪律 */
head('D 设计纪律')

/* D1 禁用令牌扫描。 */
const cssFiles = (await readdir(assets)).filter((f) => f.endsWith('.css'))
let cssAll = ''
for (const f of cssFiles) cssAll += await readFile(path.join(assets, f), 'utf8')

const BANNED = [
  [/animation[^;}]*infinite/, '无限循环动画'],
  [/cubic-bezier\(\s*[\d.]+\s*,\s*-[\d.]+/, 'bounce / elastic 回弹曲线'],
  [/-webkit-text-fill-color\s*:\s*transparent/, '渐变文字'],
  [/text-shadow/, 'text-shadow（本站不用发光字）'],
  [/color-mix\(/, 'color-mix()（颜色只从语义令牌取）'],
  [/#000\b|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/, '纯黑（阴影一律染墨色）'],
  [/filter\s*:\s*blur/, 'filter: blur（玻璃拟态）'],
]
for (const [re, what] of BANNED) {
  ok(!re.test(cssAll), `产物 CSS 里没有${what}`)
}
/* backdrop-filter 只允许顶栏那一处 */
const backdrops = (cssAll.match(/backdrop-filter/g) || []).length
ok(backdrops <= 1, `backdrop-filter 只在顶栏用了 ${backdrops} 次`)

/* ══════════════════════════════════════════════ B 交互与结构 */
head('B 交互与结构')

const { server, url } = await serveDist({ dist: DIST, port: PORT })
const browser = await chromium.launch()

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message))

  /* ---- 入场开关：不许闪 ---- */
  await p.goto(url, { waitUntil: 'commit' })
  ok(
    await p.evaluate(() => document.documentElement.classList.contains('js')),
    '.js 在文档提交时已挂上（首帧不闪）',
  )
  await p.waitForLoadState('networkidle')

  /* ---- 叠卡：四种输入 ---- */
  const front = () => p.$eval('.dcard[data-slot="0"] .dcard__meta', (e) => e.textContent.trim())
  const c0 = await front()
  await p.click('.deck__arrow >> nth=1')
  await p.waitForTimeout(650)
  const c1 = await front()
  ok(c0 !== c1, `叠卡 · 箭头翻页 ${c0.slice(0, 7)} → ${c1.slice(0, 7)}`)

  const spine = () => p.$eval('.dcard[data-slot="0"] .dcard__spine', (e) => e.textContent.trim())
  await p.click('.deck__dots button >> nth=3')
  await p.waitForTimeout(650)
  const dotTarget = await p.$eval('.deck__dots button >> nth=3', (e) => e.getAttribute('aria-label'))
  ok((await spine()) === dotTarget, `叠卡 · 圆点直达「${dotTarget}」`)

  await p.click('.deck__stack')
  await p.keyboard.press('ArrowLeft')
  await p.waitForTimeout(650)
  const c3 = await spine()
  const prevTarget = await p.$eval('.deck__dots button >> nth=2', (e) => e.getAttribute('aria-label'))
  ok(c3 === prevTarget, `叠卡 · ← 键回上一张（${c3}）`)

  const box = await p.$eval('.deck__stack', (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await p.mouse.move(box.x, box.y)
  await p.mouse.down()
  for (let i = 1; i <= 7; i++) await p.mouse.move(box.x - i * 20, box.y)
  await p.mouse.up()
  await p.waitForTimeout(700)
  ok((await spine()) !== c3, '叠卡 · 拖拽翻页')

  /*
    ---- 叠卡最前那张的链接必须真的能点 ----
    这条是用户报的 bug：原来 pointerdown 就 setPointerCapture，而 Chrome 在指针被捕获时
    会把兼容鼠标事件（含 click）一并重定向到捕获元素上，于是 click 落在 .deck__stack
    而不是卡里的链接上，链接永远点不动。改成越过阈值才抢指针。

    叠卡放的是 star 最多的几个项目：有案例页的指向站内案例页（→），
    没有的指向线上页或仓库、新标签打开（↗）。两种都要认。
    **不真的跳出去**：外链那条要联网，会把闸门变成靠网络的。
    量的是那次 click 到底落在谁身上 —— 这才是当初出 bug 的地方。
  */
  await p.goto(url, { waitUntil: 'networkidle' })
  const go = await p.$eval('.dcard[data-slot="0"] .dcard__go', (e) => ({
    href: e.getAttribute('href'),
    target: e.getAttribute('target'),
    text: e.textContent.trim(),
  }))
  const internal = /\/case\/[a-z0-9-]+\/$/.test(go.href || '')
  const external = /^https:\/\/(88lin\.github\.io|github\.com\/88lin)/.test(go.href || '') && go.target === '_blank'
  ok(internal || external, `叠卡 · 最前那张的链接可达（${internal ? '站内案例页' : '外链新标签'}：${go.href}）`)

  const hit = await p.evaluate(async () => {
    let landed = null
    const onClick = (e) => {
      landed = e.target.closest('.dcard__go') ? 'link' : e.target.className || e.target.tagName
      e.preventDefault() // 只验命中，不真的跳走 / 不开新标签
    }
    document.addEventListener('click', onClick, true)
    document.querySelector('.dcard[data-slot="0"] .dcard__go').click()
    document.removeEventListener('click', onClick, true)
    return landed
  })
  ok(hit === 'link', `叠卡 · 点击落在链接上而不是拖拽面（落点：${hit}）`)

  /* ---- 叠卡名单：门槛必须真的生效 ---- */
  {
    const minStars = Number(grab(site, /DECK_MIN_STARS\s*=\s*(\d+)/, ' DECK_MIN_STARS'))
    const shown = await p.$$eval('.dcard', (els) => els.length)
    /* 只取 star 那一格。star 与 fork 的数字长得一样，不按 data-k 区分就会
       把 fork 当 star 判 —— 第一版这条断言就是这么误报的（agentrouter 33★ / 3 fork）。 */
    const stars = await p.$$eval('.dcard__nums span[data-k="star"] b', (els) =>
      els.map((e) => Number(e.textContent.replace(/,/g, ''))),
    )
    ok(shown >= 5 && shown <= 6, `叠卡 · ${shown} 张（要求 5–6 张）`)
    ok(
      stars.length === shown && Math.min(...stars) >= minStars,
      `叠卡 · ${stars.length}/${shown} 张都标了 star 且最低 ${Math.min(...stars)} ≥ ${minStars}`,
    )
  }

  /* ---- 横推轨自己一直在滚，悬停即停，移开接着走 ---- */
  /*
    这条必须排在下面那些手动输入之前：手动输入会把自动滚暂停 2.5s。
    第一版这里写死过一个 bug —— 一帧只走 0.5px，而 scrollLeft 会抹掉亚像素，
    写 0.51 读回来是 0，轨道五秒不动。所以断言要看「确实往前走了」，
    不能只看「函数被调用了」。
  */
  {
    /* 指针先挪走：上面那些叠卡测试把鼠标留在了页面中部，滚过来之后正好压在轨道上，
       而悬停就是暂停 —— 不挪走的话这里测到的是「悬停即停」，不是「不会自动滚」。 */
    await p.mouse.move(8, 8)
    await p.$eval('#work', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await p.waitForTimeout(600)
    const read = () => p.$eval('.rail', (e) => Math.round(e.scrollLeft))
    const a0 = await read()
    await p.waitForTimeout(1600)
    const a1 = await read()
    ok(a1 > a0 + 20, `横推轨 · 自动横滚 ${a0} → ${a1}`)

    const rbox = await p.$eval('.rail', (e) => {
      const r = e.getBoundingClientRect()
      return { x: r.x + 200, y: r.y + r.height / 2 }
    })
    await p.mouse.move(rbox.x, rbox.y)
    const h0 = await read()
    await p.waitForTimeout(1300)
    const h1 = await read()
    ok(Math.abs(h1 - h0) < 5, `横推轨 · 悬停即停（${h0} → ${h1}）`)

    await p.mouse.move(8, 8)
    await p.waitForTimeout(1500)
    const r1 = await read()
    ok(r1 > h1 + 10, `横推轨 · 移开后接着走（${h1} → ${r1}）`)
  }

  /* ---- 横推轨：滚轮 / 拖拽 / 键盘 / 到头交回页面 ---- */
  /* 上面那段自动推进把轨道推到了六成行程，先归零，否则后面几条没有剩余行程可推 */
  await p.$eval('.rail', (e) => {
    e.scrollLeft = 0
  })
  await p.waitForTimeout(200)
  await p.$eval('#work', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.waitForTimeout(700)
  const rb = await p.$eval('.rail', (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + 200, y: r.y + r.height / 2 }
  })
  const y0 = await p.evaluate(() => window.scrollY)
  await p.mouse.move(rb.x, rb.y)
  await p.mouse.wheel(0, 400)
  await p.waitForTimeout(400)
  const sl1 = await p.$eval('.rail', (e) => e.scrollLeft)
  ok(sl1 > 100, `横推轨 · 鼠标滚轮横移 → ${sl1}`)
  ok(Math.abs((await p.evaluate(() => window.scrollY)) - y0) < 3, '横推轨 · 横移时页面不跟着纵滚')

  await p.mouse.move(rb.x, rb.y)
  await p.mouse.down()
  for (let i = 1; i <= 6; i++) await p.mouse.move(rb.x - i * 30, rb.y)
  await p.mouse.up()
  await p.waitForTimeout(300)
  ok((await p.$eval('.rail', (e) => e.scrollLeft)) > sl1 + 100, '横推轨 · 拖拽横移')
  ok(await p.evaluate(() => location.hash === ''), '横推轨 · 拖完没误触卡里的链接')

  await p.$eval('.rail', (e) => {
    e.scrollLeft = 0
    e.focus()
  })
  await p.waitForTimeout(200)
  await p.keyboard.press('ArrowRight')
  await p.waitForTimeout(600)
  ok((await p.$eval('.rail', (e) => e.scrollLeft)) > 100, '横推轨 · 聚焦后方向键可推（键盘可达）')

  await p.$eval('.rail', (e) => (e.scrollLeft = e.scrollWidth))
  await p.waitForTimeout(350)
  ok(await p.$eval('.rail-nav button:nth-child(2)', (e) => e.disabled), '横推轨 · 到头右箭头置灰')
  const yA = await p.evaluate(() => window.scrollY)
  await p.mouse.move(rb.x, rb.y)
  await p.mouse.wheel(0, 500)
  await p.waitForTimeout(500)
  ok((await p.evaluate(() => window.scrollY)) > yA + 50, '横推轨 · 到头后滚动交回页面')

  /* ---- 顶栏当前章 + 左侧章序轨 ---- */
  await p.waitForTimeout(1200)
  for (const [id, label, no] of [
    ['services', '服务', '01'],
    ['cases', '案例', '02'],
    ['work', '作品', '03'],
    ['contact', '联系', '06'],
  ]) {
    await p.$eval(`#${id}`, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await p.waitForTimeout(700)
    /* 顶栏里还有 GitHub 与那枚下单按钮，它们不是锚点也不带 data-on，所以不参与计数 */
    const on = await p.$$eval('.nav-links a[data-on]', (els) => els.map((e) => e.textContent.trim()))
    ok(on.length === 1 && on[0] === label, `顶栏 · #${id} 高亮「${on.join(',') || '无'}」`)
    const rail = await p.$$eval('.crail a[data-on] b', (els) => els.map((e) => e.textContent.trim()))
    ok(rail.length === 1 && rail[0] === no, `章序轨 · #${id} 亮在 ${rail.join(',') || '无'}`)
  }

  /* ---- 数字出处可展开 ---- */
  await p.$eval('.prov summary', (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await p.click('.prov summary')
  await p.waitForTimeout(250)
  ok((await p.$$eval('.prov[open] .prow', (e) => e.length)) > 0, '数字出处 · 点开能看到逐条出处')

  /* ---- 章头开幕：像真人那样一路滚下去，六章都要被点着 ---- */
  /* 不能靠 scrollIntoView 逐章跳：把一个 2000px 高的章「居中」时，它的章头 早就跑到视口上方去了，IntersectionObserver 当然不开火 —— 这是测法的问题， 不是代码的问题。 */
  await p.evaluate(async () => {
    const step = 400
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 60))
    }
  })
  await p.waitForTimeout(500)
  const lit = await p.$$eval('.chap', (e) => e.filter((x) => x.classList.contains('is-in')).length)
  const chapTotal = await p.$$eval('.chap', (e) => e.length)
  ok(lit === chapTotal, `章头开幕 · ${lit} / ${chapTotal} 章都被点着`)

  ok(errs.length === 0, `首页无控制台报错${errs.length ? '：' + [...new Set(errs)].join(' | ') : ''}`)
  await ctx.close()

  /* ---- 三档宽度：无横向溢出、无报错、窄屏不叠字 ---- */
  for (const w of [1440, 834, 390]) {
    const c = await browser.newContext({
      viewport: { width: w, height: w < 700 ? 844 : 900 },
      isMobile: w < 700,
      hasTouch: w < 700,
    })
    const q = await c.newPage()
    const e2 = []
    q.on('console', (m) => m.type() === 'error' && e2.push(m.text()))
    q.on('pageerror', (e) => e2.push('pageerror: ' + e.message))
    await q.goto(url, { waitUntil: 'networkidle' })
    await q.evaluate(() => {
      document.documentElement.classList.remove('js')
      document.querySelectorAll('[data-stagger]').forEach((e) => e.classList.add('is-in'))
    })
    await q.waitForTimeout(400)

    const over = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok(over <= 1, `${w}px · 无横向溢出（${over}px）`)

    /* 案例行三块不许互相压住。390px 上曾经出现过编号轨压在论点上。 */
    const bad = await q.evaluate(() => {
      const out = []
      const hit = (a, b) =>
        a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1
      document.querySelectorAll('.case').forEach((row, i) => {
        const parts = ['.case__idx', '.case__say', '.case__data'].map((s) => row.querySelector(s))
        for (let x = 0; x < parts.length; x++)
          for (let y = x + 1; y < parts.length; y++)
            if (parts[x] && parts[y] && hit(parts[x].getBoundingClientRect(), parts[y].getBoundingClientRect()))
              out.push(`案例 ${i + 1}`)
      })
      return out
    })
    ok(bad.length === 0, `${w}px · 案例行三块互不重叠${bad.length ? '：' + bad.join(', ') : ''}`)
    ok(e2.length === 0, `${w}px · 无控制台报错${e2.length ? '：' + [...new Set(e2)].join(' | ') : ''}`)
    await c.close()
  }

  /* ---- 触控命中区：手机上点得中 ---- */
  /*
    量的是「手指点这一点算不算它」，不是 getBoundingClientRect ——
    命中区是用 padding / ::after 往外铺的，盒模型量不到，量了会全线误报。

    两个坑，踩过才写在这儿：
      · 必须逐屏滚 + 等落定再量。页面挂了 Lenis，scrollIntoView 之后坐标不立刻生效，
        抢着 elementFromPoint 会打在上一屏的东西上，于是每个元素都报「被挡住」被跳过，
        这个闸门就变成了自我安慰。
      · 吸顶导航会盖住视口顶上 70px。落在那条带里的按钮是被遮挡，不是尺寸不够，得排掉。

    底线取 WCAG 2.5.8 的 24px（AA）。叠卡圆点是唯一停在 24–44 之间的：
    一排五颗 + 两枚箭头，44 的格宽在 320px 上会把控制条挤爆，
    而「翻页」另有两条够 44 的路（箭头 44×44、卡片可直接拖）。
  */
  {
    const MIN = 24
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const q = await c.newPage()
    await q.goto(url, { waitUntil: 'networkidle' })
    await q.evaluate(() => {
      document.documentElement.classList.remove('js')
      document.querySelectorAll('[data-stagger]').forEach((e) => e.classList.add('is-in'))
    })
    await q.waitForTimeout(500)

    const pageH = await q.evaluate(() => document.documentElement.scrollHeight)
    const seen = new Map()
    for (let y = 0; y < pageH; y += 700) {
      await q.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y)
      await q.waitForTimeout(500)
      const found = await q.evaluate((MIN) => {
        const probe = (el, cx, cy, dx, dy) => {
          let far = 0
          for (let d = 1; d <= 40; d++) {
            const x = cx + dx * d
            const y = cy + dy * d
            if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) break
            const h = document.elementFromPoint(x, y)
            if (h && (h === el || el.contains(h))) far = d
            else break
          }
          return far
        }
        const res = []
        for (const el of document.querySelectorAll('a,button,[role=button],summary')) {
          const r = el.getBoundingClientRect()
          if (!r.width || !r.height) continue
          if (r.bottom > innerHeight - 4) continue
          if (!el.closest('.nav') && r.top < 70) continue
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const self = document.elementFromPoint(cx, cy)
          if (!(self === el || el.contains(self))) continue
          const w = probe(el, cx, cy, -1, 0) + probe(el, cx, cy, 1, 0) + 1
          const h = probe(el, cx, cy, 0, -1) + probe(el, cx, cy, 0, 1) + 1
          const label = (el.textContent || '').trim().slice(0, 14) || el.className || el.tagName
          res.push({ key: (el.className?.toString?.() || el.tagName) + '|' + label, label, w, h, ok: w >= MIN && h >= MIN })
        }
        return res
      }, MIN)
      for (const f of found) if (!seen.has(f.key) || !f.ok) seen.set(f.key, f)
    }
    const all = [...seen.values()]
    const tooSmall = all.filter((x) => !x.ok)
    ok(
      all.length >= 25,
      `390px · 命中区闸门真的量到了东西（${all.length} 个可点元素）`,
    )
    ok(
      tooSmall.length === 0,
      `390px · 可点元素命中区 ≥ ${MIN}px（${all.length} 个）${
        tooSmall.length ? '：' + tooSmall.map((x) => `${x.label} ${x.w}×${x.h}`).join(', ') : ''
      }`,
    )
    await c.close()
  }

  /* ---- 圆角语言：可点的东西要么胶囊要么卡，不许卡在中间 ---- */
  /*
    站内只有两种圆角语言：按钮/标签是胶囊（--r-pill），面是卡（16 / 20px）。
    这条闸门是补的 —— 之前 .chans a 在 @media (max-width: 560px) 里被显式降到
    --r-md，于是同一组按钮桌面是胶囊、手机变方角，跑了不知道多久没人发现
    （判词原话「不应该是圆角胶囊吗？现在四方形小圆角了」）。
    「拉成整行」是宽度的事，跟形状无关，全宽的胶囊照样是胶囊。

    所以量的是**移动端 computed 值**：这类降级只写在窄屏媒体查询里，
    桌面量不出来。
  */
  {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const q = await c.newPage()
    await q.goto(url, { waitUntil: 'networkidle' })
    await q.evaluate(() => {
      document.documentElement.classList.remove('js')
      document.querySelectorAll('[data-stagger]').forEach((e) => e.classList.add('is-in'))
    })
    await q.waitForTimeout(400)

    const odd = await q.evaluate(() => {
      const bad = []
      for (const el of document.querySelectorAll('a,button,[role=button],summary')) {
        const b = el.getBoundingClientRect()
        if (!b.width || !b.height) continue
        const cs = getComputedStyle(el)
        // 没有可见的面就没有形状可谈：叠卡那几个圆点的本体只是命中盒，
        // 点是 ::before 画的。不排掉的话闸门会对着一个透明盒子报圆角。
        const painted =
          cs.backgroundImage !== 'none' ||
          !/^rgba\(0, 0, 0, 0\)|^transparent$/.test(cs.backgroundColor) ||
          parseFloat(cs.borderTopWidth) > 0
        if (!painted) continue
        const r = parseFloat(cs.borderTopLeftRadius)
        // 0 = 纯文字链接，不参与；胶囊看的是「≥ 半高」而不是 999，
        // 因为 22×8 那颗指示条给 4px 就已经是胶囊了
        if (r === 0 || r >= Math.min(b.width, b.height) / 2 || r >= 16) continue
        bad.push(
          `${(el.className?.toString?.() || el.tagName).split(' ')[0]} ${r}px（${Math.round(b.width)}×${Math.round(b.height)}）`,
        )
      }
      return [...new Set(bad)]
    })
    ok(odd.length === 0, `390px · 可点元素圆角是胶囊或卡${odd.length ? '：' + odd.join(', ') : ''}`)

    /*
      被拉宽的按钮，里面的字要跟着居中。

      判词「按钮居中文字不居中」。那次是 .flow__cta 拉满了整行而文字还贴在左边 ——
      我写的是 `.flow__cta .btn { justify-content: center }`，而这个类直接挂在
      <a class="btn btn--blue flow__cta"> 上，它自己就是按钮，没有叫 .btn 的后代，
      选择器整条空转。实测内容中心偏左 72px。

      量内容墨迹而不是元素框：按钮被拉宽后元素框当然是满的，看不出字在哪。
      只挑「盒子明显比内容宽」的（扣掉左右 padding 还余 24px 以上），
      那就是被拉过的；本来就贴合内容的按钮不参与。
      .dcard__go 与「数字出处」那类块级链接不在 .btn 里，它们跟随文本流左对齐是对的。
    */
    const offCenter = await q.evaluate(() => {
      const bad = []
      for (const el of document.querySelectorAll('.btn')) {
        const box = el.getBoundingClientRect()
        if (!box.width || !box.height) continue
        const cs = getComputedStyle(el)
        const range = document.createRange()
        range.selectNodeContents(el)
        const ink = range.getBoundingClientRect()
        if (!ink.width) continue
        const slack = box.width - ink.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        if (slack < 24) continue
        const off = Math.round(ink.left + ink.width / 2 - (box.left + box.width / 2))
        if (Math.abs(off) <= 4) continue
        bad.push(`${(el.className?.toString?.() || el.tagName).split(' ').pop()} 偏 ${off}px`)
      }
      return [...new Set(bad)]
    })
    ok(
      offCenter.length === 0,
      `390px · 拉宽的按钮内容跟着居中${offCenter.length ? '：' + offCenter.join(', ') : ''}`,
    )
    await c.close()
  }

  /* ---- 配色配额：颜色只做重音，不做铺面 ---- */
  /* 整页截一张长图，按色相分桶数像素。 */
  {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const q = await c.newPage()
    await q.goto(url, { waitUntil: 'networkidle' })
    await q.evaluate(() => {
      document.documentElement.classList.remove('js')
      document.querySelectorAll('[data-stagger]').forEach((e) => e.classList.add('is-in'))
    })
    await q.waitForTimeout(400)
    const shot = await q.screenshot({ fullPage: true })
    await c.close()

    /* 分桶用**彩度（max-min）**而不是 HSL 的饱和度。 */
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true })
    const stride = 3
    let n = 0
    let paper = 0
    let tint = 0
    let accent = 0
    for (let y = 0; y < info.height; y += stride) {
      for (let x = 0; x < info.width; x += stride) {
        const i = (y * info.width + x) * info.channels
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255
        const mx = Math.max(r, g, b)
        const mn = Math.min(r, g, b)
        const l = (mx + mn) / 2
        const chroma = mx - mn
        n++
        if (chroma < 0.06 && l > 0.86) paper++
        else if (chroma < 0.18 && l > 0.8) tint++
        else if (chroma > 0.18 && l > 0.2 && l < 0.92) accent++
      }
    }
    const groundPct = ((paper + tint) / n) * 100
    const accentPct = (accent / n) * 100
    ok(groundPct >= 80, `地面是纸：纸 + 淡底占 ${groundPct.toFixed(1)}% ≥ 80%`)
    ok(accentPct <= 8, `彩色只做重音：饱和像素占 ${accentPct.toFixed(1)}% ≤ 8%`)
  }

  /* ---- 每条案例子页都能直链打开 ---- */
  for (const r of routes.filter((x) => x !== '/')) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const q = await c.newPage()
    const e3 = []
    q.on('pageerror', (e) => e3.push(e.message))
    const res = await q.goto(url.replace(/\/$/, '') + r, { waitUntil: 'networkidle' })
    const h1 = await q.$$eval('h1', (e) => e.length)
    ok(res.status() === 200 && h1 === 1 && e3.length === 0, `子页 ${r} 直链 200、单个 H1、无报错`)
    await c.close()
  }

  /* ---- 禁用 JS 时正文完整 ---- */
  {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false })
    const q = await c.newPage()
    await q.goto(url, { waitUntil: 'load' })
    const txt = await q.evaluate(() => document.body.innerText.length)
    const h1 = await q.$eval('h1', (e) => e.innerText.trim())
    ok(txt > 3000 && h1.length > 6, `禁用 JS 时正文完整（${txt} 字，H1「${h1.replace(/\s+/g, '')}」）`)

    /* 读数必须是**看得见的文字**，不能只躺在 aria-label 里。 */
    const shown = await q.evaluate(() =>
      Array.from(document.querySelectorAll('.stat b')).map((e) => e.innerText.trim()),
    )
    ok(
      shown.includes(stars) && !shown.includes('0'),
      `禁用 JS 时读数带印的是真值（${shown.join(' / ')}）`,
    )
    await c.close()
  }
} finally {
  await browser.close()
  server.close()
}

console.log(`\n${fail === 0 ? '\x1b[32m全部通过' : '\x1b[31m有失败项'}：${pass} 过 / ${fail} 败\x1b[0m`)
process.exit(fail === 0 ? 0 : 1)
