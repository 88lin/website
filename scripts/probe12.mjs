/** 探针：字盘 WebGL 层为什么空。 */
import { chromium } from 'playwright'

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 500)))
await page.goto('http://localhost:4311/?gl=1', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const info = await page.evaluate(() => {
  const plate = document.querySelector('.plate--typecase')
  const host = document.querySelector('.plate__host')
  const canvas = host?.querySelector('canvas')
  const r = plate?.getBoundingClientRect()
  const hr = host?.getBoundingClientRect()
  let px = null
  if (canvas) {
    // 读中心像素看有没有画东西
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    px = gl ? 'context-ok' : 'no-context'
  }
  return {
    plateRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
    hostRect: hr ? { w: Math.round(hr.width), h: Math.round(hr.height) } : null,
    hasCanvas: !!canvas,
    canvasSize: canvas ? { w: canvas.width, h: canvas.height } : null,
    canvasStyle: canvas ? { w: canvas.style.width, h: canvas.style.height } : null,
    gl: plate?.getAttribute('data-gl'),
    px,
  }
})
console.log(JSON.stringify(info, null, 2))

// 截 plate 区域特写
const plate = await page.$('.plate--typecase')
if (plate) await plate.screenshot({ path: '.impeccable/review/v12-plate-closeup.png' })

await browser.close()
