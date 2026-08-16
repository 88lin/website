/** v11 DOM 审计：不用眼睛也能抓的客观问题。 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const preview = spawn('npx', ['vite', 'preview', '--port', '4312', '--strictPort'], { shell: true, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 2500))
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})

const audit = async (url, vp, label) => {
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const report = await page.evaluate(() => {
    const out = { overflow: [], hero: {}, plate: {}, chapters: [] }
    // 横向溢出：整条祖先链 overflow-x visible 才算
    const walkOverflow = (el) => {
      let n = el
      while (n && n !== document.documentElement) {
        const ox = getComputedStyle(n).overflowX
        if (ox !== 'visible') return false
        n = n.parentElement
      }
      return true
    }
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if ((r.right > window.innerWidth + 1 || r.left < -1) && r.width > 2 && walkOverflow(el)) {
        if (out.overflow.length < 12)
          out.overflow.push(`${el.tagName}.${String(el.className).slice(0, 40)} L${r.left.toFixed(0)} R${r.right.toFixed(0)}`)
      }
    })
    const h1 = document.querySelector('.hero-h1')
    if (h1) {
      const r = h1.getBoundingClientRect()
      out.hero.leftRatio = +(r.left / window.innerWidth).toFixed(3)
      out.hero.fontSize = getComputedStyle(h1).fontSize
      out.hero.inVp = r.top > -40 && r.bottom < window.innerHeight + 80
    }
    const plate = document.querySelector('.plate')
    if (plate) {
      const svg = plate.querySelector('.plate__svg')
      const texts = plate.querySelectorAll('.at__name, .at__orbit')
      out.plate.gl = plate.dataset.gl
      out.plate.svgBox = svg ? svg.getAttribute('viewBox') : null
      out.plate.labels = texts.length
      // 最小标签的渲染字号（SVG text 以视口换算）
      let minPx = 1e9
      texts.forEach((t) => {
        const fs = t.getBoundingClientRect().height
        if (fs > 0 && fs < minPx) minPx = fs
      })
      out.plate.minLabelPx = +minPx.toFixed(1)
      const pr = plate.getBoundingClientRect()
      out.plate.size = `${pr.width.toFixed(0)}x${pr.height.toFixed(0)}`
    }
    document.querySelectorAll('section.ch').forEach((s) => {
      const r = s.getBoundingClientRect()
      out.chapters.push(`${s.id}:${Math.round(r.height)}`)
    })
    return out
  })
  console.log(`\n=== ${label} ${vp.width}x${vp.height} ===`)
  console.log(JSON.stringify(report, null, 1))
  if (errors.length) console.log('ERRORS:', errors.slice(0, 6))
  await ctx.close()
}

await audit('http://localhost:4312/', { width: 1440, height: 900 }, 'home')
await audit('http://localhost:4312/?gl=1', { width: 1440, height: 900 }, 'home-gl')
await audit('http://localhost:4312/', { width: 390, height: 844 }, 'home-mobile')
await audit('http://localhost:4312/case/video-vip/', { width: 1440, height: 900 }, 'case')

await browser.close()
preview.kill()
