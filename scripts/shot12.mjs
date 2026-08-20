/** v12 走查取景器：截首屏字盘（SVG 层 / WebGL 层）+ 各章 + 移动端。 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = '.impeccable/review'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
})

// 桌面：SVG 静态层
const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const p1 = await d.newPage()
p1.on('console', (m) => m.type() === 'error' && console.log('[console.error]', m.text().slice(0, 200)))
p1.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
await p1.goto('http://localhost:4311/', { waitUntil: 'networkidle' })
await p1.waitForTimeout(500)
await p1.screenshot({ path: `${OUT}/v12-hero-svg.png` })

// 桌面：强制点火 WebGL（?gl=1）
const p2 = await d.newPage()
p2.on('pageerror', (e) => console.log('[pageerror gl]', String(e).slice(0, 300)))
await p2.goto('http://localhost:4311/?gl=1', { waitUntil: 'networkidle' })
await p2.waitForTimeout(2500)
await p2.screenshot({ path: `${OUT}/v12-hero-gl.png` })

// 桌面全页
await p2.evaluate(() => window.scrollTo(0, 0))
await p2.waitForTimeout(300)
await p2.screenshot({ path: `${OUT}/v12-desktop-full.png`, fullPage: true })

// 案例页
const p3 = await d.newPage()
await p3.goto('http://localhost:4311/case/facetmark/', { waitUntil: 'networkidle' })
await p3.waitForTimeout(600)
await p3.screenshot({ path: `${OUT}/v12-case-facetmark.png` })

// 移动端
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const p4 = await m.newPage()
await p4.goto('http://localhost:4311/', { waitUntil: 'networkidle' })
await p4.waitForTimeout(600)
await p4.screenshot({ path: `${OUT}/v12-mobile-hero.png` })
await p4.screenshot({ path: `${OUT}/v12-mobile-full.png`, fullPage: true })

await browser.close()
console.log('shots done')
