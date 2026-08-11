/* v10 定位探针：① 各断点 #hero 逐块高度（G19 溢出源）② 开场首屏被 G13 计入的视觉块清单 */
import { chromium } from 'playwright'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const { server, url } = await serveDist({ dist: DIST, port: 4241 })
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

for (const vp of [
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 1024, h: 768, tag: 'laptop' },
  { w: 390, h: 844, tag: 'iphone' },
  { w: 360, h: 800, tag: 'android' },
]) {
  const page = await browser.newPage({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: 1,
    isMobile: vp.w < 900,
    hasTouch: vp.w < 900,
    reducedMotion: 'reduce',
  })
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const m = await page.evaluate(() => {
    const sec = document.getElementById('hero')
    const cs = getComputedStyle(sec)
    const rows = []
    const walk = (sel) => {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect()
        rows.push(`${(el.className || el.tagName).toString().split(' ')[0]} h=${Math.round(r.height)} top=${Math.round(r.top)}`)
      }
    }
    walk('.hero-in > *')
    walk('.hero-copy > *')
    walk('.hero-visual > *')
    return {
      secH: Math.round(sec.scrollHeight),
      vh: window.innerHeight,
      pad: `${cs.paddingBlockStart} / ${cs.paddingBlockEnd}`,
      inH: Math.round(document.querySelector('.hero-in').getBoundingClientRect().height),
      rows,
    }
  })
  console.log(`\n── ${vp.tag} ${vp.w}×${vp.h}  hero=${m.secH}/${m.vh}  hero-in=${m.inH}  padding=${m.pad}`)
  for (const r of m.rows) console.log('   ' + r)

  if (vp.tag === 'desktop') {
    const vis = await page.evaluate(() => {
      const sec = document.getElementById('hero')
      const vw = innerWidth
      const vh = innerHeight
      const ground = getComputedStyle(sec).backgroundColor
      const solid = (c) => c && c !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(c)
      const blocks = [...sec.querySelectorAll('*')].filter((el) => {
        const s = getComputedStyle(el)
        if (!solid(s.backgroundColor) || s.backgroundColor === ground) return false
        const r = el.getBoundingClientRect()
        if (r.width * r.height < vw * vh * 0.01) return false
        const p = el.parentElement
        if (p && p !== sec && getComputedStyle(p).backgroundColor === s.backgroundColor) return false
        return true
      })
      const all = [...new Set([...sec.querySelectorAll('svg, canvas, video, img'), ...blocks])]
      const out = []
      let total = 0
      for (const el of all) {
        const r = el.getBoundingClientRect()
        const w = Math.max(0, Math.min(vw, r.right) - Math.max(0, r.left))
        const h = Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top))
        const a = (w * h) / (vw * vh)
        if (a <= 0) continue
        total += a
        out.push(`${(el.className || el.tagName).toString().split(' ')[0] || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)} = ${(a * 100).toFixed(2)}%`)
      }
      return { out: out.sort(), total: (total * 100).toFixed(2) }
    })
    console.log(`   [G13 首屏视觉块 合计 ${vis.total}%]`)
    for (const r of vis.out) console.log('     ' + r)
  }
  await page.close()
}
await browser.close()
server.close()
