/* 量移动端首屏：#hero 各子块高度与间距，定位溢出来源 */
import { chromium } from 'playwright'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const { server, url } = await serveDist({ dist: DIST, port: 4233 })
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

for (const vp of [
  { w: 390, h: 844, tag: 'iphone14' },
  { w: 360, h: 800, tag: 'android' },
  { w: 1440, h: 900, tag: 'desktop' },
  { w: 1024, h: 768, tag: 'laptop' },
]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: vp.w < 900, hasTouch: vp.w < 900 })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const box = (s) => {
      const el = q(s)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { h: Math.round(r.height), top: Math.round(r.top), fs: cs.fontSize, lh: cs.lineHeight, mt: cs.marginBlockStart, pt: cs.paddingBlockStart, pb: cs.paddingBlockEnd }
    }
    const lines = (s) => {
      const el = q(s)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const lh = parseFloat(getComputedStyle(el).lineHeight)
      return Math.round(r.height / lh)
    }
    return {
      hero: Math.round(q('#hero').scrollHeight),
      vh: window.innerHeight,
      stage: box('.hero__stage'),
      world: box('.hero__world'),
      rail: box('.hero__rail'),
      main: box('.s-main'),
      yel: box('.s-yel'),
      pop: box('.s-pop'),
      pap: box('.s-pap'),
      cta: box('.s-cta'),
      h: box('.hero__h'),
      sub: box('.hero__sub'),
      subLines: lines('.hero__sub'),
      hLines: lines('.hero__h'),
    }
  })
  console.log(`\n== ${vp.tag} ${vp.w}x${vp.h} ==  hero=${m.hero} vh=${m.vh}  ${m.hero > m.vh + 2 ? '!! 溢出 ' + (m.hero - m.vh) + 'px' : 'OK'}`)
  for (const k of ['stage', 'world', 'rail', 'main', 'yel', 'pop', 'pap', 'cta', 'h', 'sub']) {
    if (m[k]) console.log(`  ${k.padEnd(6)} h=${String(m[k].h).padStart(4)} top=${String(m[k].top).padStart(4)} fs=${m[k].fs} lh=${m[k].lh} pt=${m[k].pt} pb=${m[k].pb}`)
  }
  console.log(`  hLines=${m.hLines} subLines=${m.subLines}`)
  await page.close()
}
await browser.close()
server.close()
process.exit(0)
