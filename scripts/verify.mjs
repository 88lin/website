/**
 * v13 验收：一条命令，三段闸门。跑法：npm run verify（要先 npm run build）
 *
 *   A 事实   —— 产物里的数字必须等于 site.ts / cases.ts 里的当前值，旧值一个不剩
 *   B 交互   —— 看起来能操作的东西必须真的能操作，四种输入逐个验
 *   C 结构   —— 三档宽度下无横向溢出、无控制台报错、包体在预算内
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
/* video_vip 的 star 在 site.ts 的 projects 里（那是作品轨的数据源） */
const vipStars = grab(site, /slug:\s*'video_vip'[\s\S]{0,700}?stars:\s*(\d+)/, 'video_vip star')
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

/*
  已知旧值黑名单。每一条都对应一次真实事故，删任何一条前先想清楚为什么。
  注释里也不许留 —— 会 view-source 的正是这个站的目标读者。
*/
const STALE = ['4,764', '4,658', '24 个原创', '1,794', '2026.08.16', '2026.08.20', 'Fraunces', 'Caveat']
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

/*
  D1 禁用令牌扫描。这些不是品味问题，是这个项目一路被判掉的具体东西：
  玻璃拟态、渐变文字、neon 光效、无限循环动画、bounce/elastic 回弹、纯黑。
  扫的是构建后的 CSS —— 源码里再怎么写注释，发出去的那份才算数。
*/
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

  await p.click('.deck__dots button >> nth=3')
  await p.waitForTimeout(650)
  ok((await front()).includes('04'), '叠卡 · 圆点直达第 4 张')

  await p.click('.deck__stack')
  await p.keyboard.press('ArrowLeft')
  await p.waitForTimeout(650)
  const c3 = await front()
  ok(c3.includes('03'), '叠卡 · ← 键回上一张')

  const box = await p.$eval('.deck__stack', (e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await p.mouse.move(box.x, box.y)
  await p.mouse.down()
  for (let i = 1; i <= 7; i++) await p.mouse.move(box.x - i * 20, box.y)
  await p.mouse.up()
  await p.waitForTimeout(700)
  ok((await front()) !== c3, '叠卡 · 拖拽翻页')

  /*
    ---- 叠卡「看完整案例」必须真的跳转 ----
    这条是用户报的 bug：原来 pointerdown 就 setPointerCapture，而 Chrome 在指针被捕获时
    会把兼容鼠标事件（含 click）一并重定向到捕获元素上，于是 click 落在 .deck__stack
    而不是卡里的链接上，链接永远点不动。改成越过阈值才抢指针。
  */
  await p.goto(url, { waitUntil: 'networkidle' })
  const slug = await p.$eval('.dcard[data-slot="0"] .dcard__go', (e) => e.getAttribute('href'))
  await p.click('.dcard[data-slot="0"] .dcard__go')
  await p.waitForTimeout(500)
  const landed = await p.evaluate(() => location.pathname)
  ok(
    slug !== null && landed.endsWith(slug.replace(/^\.\//, '')),
    `叠卡 · 点「看完整案例」跳到了 ${landed}`,
  )
  ok((await p.$$eval('h1', (e) => e.length)) === 1, '叠卡 · 跳过去之后是案例子页（单个 H1）')
  await p.goBack({ waitUntil: 'networkidle' })
  await p.waitForTimeout(300)

  /* ---- 横推轨随滚动自动推进，且读者一动手就永久让位 ---- */
  /*
    这条必须排在下面那些手动输入之前：一旦滚轮/拖拽发生过，自动推进就永久停手，
    顺序颠倒的话这条永远测不到。
  */
  {
    const top = await p.$eval('#work', (e) => e.getBoundingClientRect().top + window.scrollY)
    const at = async (dy) => {
      await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top + dy)
      await p.waitForTimeout(280)
      return p.$eval('.rail', (e) => Math.round(e.scrollLeft))
    }
    const a = await at(-500)
    const bb = await at(200)
    const cc = await at(600)
    ok(a === 0 && bb > 200 && cc > bb, `横推轨 · 随滚动推进 ${a} → ${bb} → ${cc}`)

    // 手动介入一次，再滚一屏，位置不该被自动推进改掉
    await p.$eval('.rail', (e) => {
      e.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }))
    })
    const held = await p.$eval('.rail', (e) => Math.round(e.scrollLeft))
    const after = await at(1000)
    ok(after === held, `横推轨 · 读者动手后自动推进让位（${held} 保持不变）`)
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
    ['cases', '案例', '01'],
    ['work', '作品', '03'],
    ['contact', '联系', '06'],
  ]) {
    await p.$eval(`#${id}`, (e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await p.waitForTimeout(700)
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
  /*
    不能靠 scrollIntoView 逐章跳：把一个 2000px 高的章「居中」时，它的章头
    早就跑到视口上方去了，IntersectionObserver 当然不开火 —— 这是测法的问题，
    不是代码的问题。所以按 400px 一步连续滚一遍，这才是读者真实的路径。
  */
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

  /* ---- 配色配额：颜色只做重音，不做铺面 ---- */
  /*
    整页截一张长图，按色相分桶数像素。这条闸门管的是「彩色不铺满面」那条纪律：
    v9 整章刷饱和底被判「屎黄色」，之后的定论是地面只用两档近白纸色，
    品牌蓝 / 柠檬黄 / 珊瑚红只出现在边、条、编号、读数与两块重音面上。
    阈值不是拍的，是量出来当前值之后留出余量写下的 —— 它防的是「某天顺手刷了一整章」。
  */
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

    /*
      分桶用**彩度（max-min）**而不是 HSL 的饱和度。
      HSL 的 s 在接近白的地方分母趋零、数值会炸：#fdfcf8 算出来 s=0.55，
      按饱和度分桶时它既进不了「纸」也进不了「彩色」，量出来「近白」只剩四成 ——
      那是公式的问题，不是版面的问题。彩度是绝对差值，近白就是近白。
        纸    彩度 < 0.06
        淡底  0.06 – 0.18（读数带那四格、胶囊底、编号衬底）
        重音  > 0.18 且不是墨字那一档亮度
    */
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

  /* ---- 四条案例子页都能直链打开 ---- */
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
    await c.close()
  }
} finally {
  await browser.close()
  server.close()
}

console.log(`\n${fail === 0 ? '\x1b[32m全部通过' : '\x1b[31m有失败项'}：${pass} 过 / ${fail} 败\x1b[0m`)
process.exit(fail === 0 ? 0 : 1)
