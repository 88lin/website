/**
 * 生成 robots / sitemap / 404 / OG 图。
 *
 * 跑法：npm run static（要先 npm run build，OG 图是从构建产物里取景的）
 *
 * 两条纪律：
 *
 * 1) 图标不在这里生成。favicon 全套（svg / ico / 三档 png / apple-touch /
 *    webmanifest）由 scripts/mkicon.py 生成，那份有完整的 16px 可读性推导。
 *    v12 的 static.mjs 里还留着一份 v4 配色的 favicon 覆写，会把好图标写坏。
 *
 * 2) OG 图**从真页面取景**，不另抄一份文案与数字。
 *    上一版是在这个脚本里手写 SVG：标题是「前沿 AI，落地成看得见的工程。」，
 *    而站上早就换成了「把前沿 AI 变成可交付、可维护的工程结果。」；
 *    数字也停在 4,764。分享卡片和页面对不上，比没有分享卡片更糟。
 *    现在的做法是打开 dist/index.html，把真实的大标题、读数带、站名节点
 *    搬进一块 1200×630 的板子上截图 —— 页面改了，OG 自动跟着改。
 */

import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const PUB = path.join(ROOT, 'public')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://88lin.github.io/website/'

/* v13 的 A 组语义色，与 src/styles/palettes.css 一致 */
const PAPER = '#fdfcf8'
const INK = '#1a1a2e'
const BRAND = '#2b7fd8'
const HIGHLIGHT = '#f4d758'
const DIM = '#4a4a5a'

/* ---------------------------------------------------------------- 路由与日期 */

/**
 * 路由表与核实日期都从源码里取，不在这里重抄一份。
 * v12 的 sitemap 少了 facetmark 那条子页 —— 因为它是手写的数组，加了案例没同步。
 */
const routerSrc = await readFile(path.join(ROOT, 'src/router.tsx'), 'utf8')
const routesLine = routerSrc.match(/export const ROUTES[^=]*=\s*\[([^\]]+)\]/)
if (!routesLine) {
  console.error('static: 没在 src/router.tsx 里找到 ROUTES')
  process.exit(1)
}
const ROUTES = [...routesLine[1].matchAll(/'([^']+)'/g)].map((m) => m[1])

const siteSrc = await readFile(path.join(ROOT, 'src/content/site.ts'), 'utf8')
const asOf = siteSrc.match(/AS_OF\s*=\s*'(\d{4})\.(\d{2})\.(\d{2})'/)
if (!asOf) {
  console.error('static: 没在 src/content/site.ts 里找到 AS_OF')
  process.exit(1)
}
const lastmod = `${asOf[1]}-${asOf[2]}-${asOf[3]}`

/* ---------------------------------------------------------------- robots / sitemap */

await writeFile(path.join(PUB, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`)

const urls = ROUTES.map((r) => {
  const loc = SITE + r.replace(/^\//, '')
  const priority = r === '/' ? '1.0' : '0.8'
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority></url>`
}).join('\n')

await writeFile(
  path.join(PUB, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
)
console.log(`static: sitemap ${ROUTES.length} 条路由，lastmod ${lastmod}`)

/* ---------------------------------------------------------------- 404 */

/*
  404 必须独立成页：它可能在构建产物的 CSS 都没上的情况下被 GitHub Pages 直接吐出来，
  所以样式全内联，不引外部文件、不依赖字体下载。
*/
await writeFile(
  path.join(PUB, '404.html'),
  `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>页面不存在 · 茉灵智库</title>
<link rel="icon" href="./favicon.svg?v=10" type="image/svg+xml">
<style>
  html{background:${PAPER};color:${INK};-webkit-text-size-adjust:100%}
  body{margin:0;min-height:100svh;display:flex;align-items:center;
    font:400 17px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;
    letter-spacing:.01em}
  .w{width:100%;max-width:80rem;margin:0 auto;padding:0 clamp(1.25rem,4vw,3.5rem)}
  .k{font:500 .75rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;
    letter-spacing:.18em;color:#6e6e80}
  h1{font-size:clamp(2.75rem,9vw,5.5rem);line-height:1.06;letter-spacing:-.01em;
    margin:.6rem 0 1.25rem;font-weight:700}
  mark{background:${HIGHLIGHT};color:${INK};padding:0 .12em;border-radius:5px}
  p{color:${DIM};max-width:34em;margin:0 0 2.25rem}
  a{display:inline-flex;align-items:center;gap:.55rem;background:${BRAND};color:#fff;
    padding:.9rem 1.6rem;border-radius:999px;text-decoration:none;font-weight:600;font-size:.9375rem;
    box-shadow:0 2px 8px rgba(43,127,216,.26),0 10px 24px rgba(43,127,216,.18)}
  a:hover{background:#1e5ba8}
  .m{margin-top:2.5rem;padding-top:1.25rem;border-top:1px solid #e5e0d3;
    font:400 .8125rem/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;color:#6e6e80}
</style>
</head>
<body><div class="w">
  <p class="k">404 · NOT FOUND</p>
  <h1>这个地址下<mark>没有东西</mark>。</h1>
  <p>可能是链接过期了，也可能是我改过结构。首页有全部四个案例与在线小站的入口。</p>
  <a href="./">回首页 <span aria-hidden="true">→</span></a>
  <p class="m">88lin.github.io/website</p>
</div></body>
</html>
`,
)

/* ---------------------------------------------------------------- OG 图 */

const shell = path.join(DIST, 'index.html')
try {
  await readFile(shell)
} catch {
  console.error('static: 没有 dist/index.html。OG 图要从构建产物取景，先跑 npm run build。')
  process.exit(1)
}

const browser = await chromium.launch({
  // file:// 下加载 @font-face 需要放开本地文件访问，否则展示字回落系统字
  args: ['--allow-file-access-from-files'],
})
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(pathToFileURL(shell).href, { waitUntil: 'load' })
await page.evaluate(() => document.fonts?.ready).catch(() => {})

/*
  把真页面的节点搬到一块 1200×630 的板子上。搬的是 DOM，不是文案的副本，
  所以标题、四个读数、核实日期永远和线上一致。
*/
await page.evaluate(
  ({ paper, ink }) => {
    const pick = (s) => document.querySelector(s)
    const h1 = pick('.hero__h1')?.cloneNode(true)
    const kicker = pick('.hero .kicker')?.cloneNode(true)
    const stats = pick('.stats')?.cloneNode(true)
    const lead = pick('.hero .lead')?.cloneNode(true)
    if (!h1 || !stats) throw new Error('OG：页面上没找到 .hero__h1 / .stats')

    const board = document.createElement('div')
    board.id = 'og'
    board.style.cssText = `position:fixed;inset:0;width:1200px;height:630px;overflow:hidden;
      background:${paper};color:${ink};padding:60px 64px;box-sizing:border-box;
      display:flex;flex-direction:column;justify-content:space-between;z-index:9999`

    const top = document.createElement('div')
    if (kicker) top.append(kicker)
    top.append(h1)
    if (lead) {
      const l = document.createElement('p')
      l.style.marginTop = '18px'
      l.append(lead)
      top.append(l)
    }
    board.append(top, stats)

    document.body.replaceChildren(board)
    // 首屏大标题在页面上是遮片入场的，搬过来必须先放出来
    document.documentElement.classList.remove('js')
    board.querySelectorAll('[data-stagger]').forEach((e) => e.classList.add('is-in'))
    // OG 是静态图，标题按 1200 宽重新定档，别用 vw 算出来的那个尺寸
    h1.style.fontSize = '68px'
    h1.style.lineHeight = '1.22'
  },
  { paper: PAPER, ink: INK },
)

await page.waitForTimeout(400)
await page.locator('#og').screenshot({ path: path.join(PUB, 'og.png') })
await browser.close()

const { size } = await import('node:fs').then((fs) => fs.promises.stat(path.join(PUB, 'og.png')))
console.log(`static: og.png ${(size / 1024).toFixed(1)} KB（取景自 dist/index.html）`)
console.log('static: robots.txt / sitemap.xml / 404.html / og.png 已写入')
console.log('static: 图标全套由 scripts/mkicon.py 负责，这里不动')
