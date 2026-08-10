/* 把 proto/*.html 渲染成桌面 + 移动两张图 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

const root = fileURLToPath(new URL('../proto/', import.meta.url))
const out = '/workspace/proto-shots/'
await mkdir(out, { recursive: true })

const VIEWS = [
  { tag: 'd', width: 1440, height: 900, dpr: 2, mobile: false },
  { tag: 'm', width: 390, height: 844, dpr: 2, mobile: true },
]

const browser = await chromium.launch()
for (const id of ['a', 'b', 'c']) {
  for (const v of VIEWS) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.dpr,
      isMobile: v.mobile,
      hasTouch: v.mobile,
      locale: 'zh-CN',
      colorScheme: 'light',
    })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e)))
    await page.goto('file://' + root + id + '.html', { waitUntil: 'load' })
    // 指针视差给一个确定值，避免截图时是零位
    if (!v.mobile) await page.mouse.move(v.width * 0.72, v.height * 0.34)
    await page.waitForTimeout(id === 'b' ? 6500 : 1600)
    const file = `${out}${id}-${v.tag}.png`
    await page.screenshot({ path: file })
    const m = await page.evaluate(() => ({
      docH: Math.round(document.documentElement.scrollHeight),
      ovf: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
    }))
    console.log(`${id}-${v.tag}  docH=${m.docH}  横向溢出=${m.ovf}px  错误=${errs.length}${errs.length ? ' :: ' + errs[0] : ''}`)
    await ctx.close()
  }
}
await browser.close()
console.log('\n出图目录', out)
