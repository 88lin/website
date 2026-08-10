// 线上复验：真实抓取 https://88lin.github.io/website/ 渲染后截图 + 关键断言
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'https://88lin.github.io/website/'
const OUT = '/workspace/live-v9'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

for (const [tag, vp, dpr, touch] of [
  ['d', { width: 1440, height: 900 }, 1, false],
  ['m', { width: 390, height: 844 }, 2, true],
]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, hasTouch: touch })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(String(e)))
  page.on('response', r => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`) })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: `${OUT}/${tag}-hero.png` })

  const info = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const chapters = [...document.querySelectorAll('.ch')].map(c => c.id)
    const posts = [...document.querySelectorAll('.notes__list a')].map(a => a.getAttribute('href'))
    const cells = [...document.querySelectorAll('.gcell')].length
    const btns = [...document.querySelectorAll('.pcard__act .pill')].length
    const dead = [...document.querySelectorAll('#root a')].filter(a => {
      const h = a.getAttribute('href'); return !h || h === '' || h === '#'
    }).length
    return {
      palette: document.documentElement.dataset.palette,
      brand: cs.getPropertyValue('--brand').trim(),
      cream: cs.getPropertyValue('--cream').trim(),
      bodyFont: getComputedStyle(document.body).fontFamily.split(',')[0].trim(),
      chapters, posts, cells, btns, dead,
      cards: document.querySelectorAll('.pcard').length,
      imgs: document.querySelectorAll('img,picture').length,
      xOver: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      docH: document.documentElement.scrollHeight,
    }
  })
  console.log(`[${tag}]`, JSON.stringify(info, null, 1))
  if (errs.length) console.log(`[${tag}] ERRORS:`, errs.slice(0, 8))
  else console.log(`[${tag}] 0 运行时错误 / 0 个 4xx`)

  // 滚到底，确认能到页脚
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${tag}-foot.png` })
  const footOK = await page.evaluate(() => {
    const f = document.querySelector('.foot'); if (!f) return false
    const r = f.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0
  })
  console.log(`[${tag}] 页脚可见: ${footOK}`)
  await ctx.close()
}
await browser.close()
