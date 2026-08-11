// 研究用：抓用户自己的三个参考站，出图 + 扒设计令牌
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const OUT = '/workspace/ref'
mkdirSync(OUT, { recursive: true })

const SITES = [
  ['ds-components', 'https://88lin.github.io/mydesign-system/components-preview.html'],
  ['ds-tutorial', 'https://88lin.github.io/mydesign-system/demo-readme-tutorial.html'],
  ['repair', 'https://repair.88lin.eu.org/'],
]

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

for (const [name, url] of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  } catch (e) {
    console.log(`[${name}] goto 失败: ${e.message}`)
    await ctx.close(); continue
  }
  await page.waitForTimeout(2000)

  const docH = await page.evaluate(() => document.documentElement.scrollHeight)
  console.log(`[${name}] docH=${docH}`)

  // 逐屏出图，最多 8 屏
  const n = Math.min(8, Math.ceil(docH / 900))
  for (let i = 0; i < n; i++) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), i * 860)
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, '0')}.png` })
  }

  // 扒设计令牌
  const tokens = await page.evaluate(() => {
    const out = { vars: {}, fonts: {}, radii: {}, shadows: [], bodyBG: '', headings: [] }
    const rs = getComputedStyle(document.documentElement)
    for (const n of Array.from(rs)) {
      if (n.startsWith('--')) out.vars[n] = rs.getPropertyValue(n).trim()
    }
    const b = getComputedStyle(document.body)
    out.bodyBG = b.backgroundColor
    out.fonts.body = b.fontFamily
    out.fonts.size = b.fontSize
    for (const sel of ['h1', 'h2', 'h3']) {
      const el = document.querySelector(sel)
      if (el) {
        const c = getComputedStyle(el)
        out.headings.push({ sel, family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, ls: c.letterSpacing, color: c.color })
      }
    }
    // 采样常见组件的圆角与阴影
    const seenR = new Map(), seenS = new Set()
    for (const el of Array.from(document.querySelectorAll('*')).slice(0, 3000)) {
      const c = getComputedStyle(el)
      const r = c.borderRadius
      if (r && r !== '0px') seenR.set(r, (seenR.get(r) || 0) + 1)
      if (c.boxShadow && c.boxShadow !== 'none') seenS.add(c.boxShadow)
    }
    out.radii = Object.fromEntries([...seenR.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12))
    out.shadows = [...seenS].slice(0, 12)
    // 找 macOS 窗口 / 代码面板
    const codePanels = []
    for (const el of document.querySelectorAll('[class*="code"],[class*="window"],[class*="mac"],[class*="terminal"],pre')) {
      codePanels.push({ tag: el.tagName, cls: el.className?.toString?.().slice(0, 120) })
    }
    out.codePanels = codePanels.slice(0, 25)
    out.title = document.title
    return out
  })
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(tokens, null, 1))
  console.log(`[${name}] title="${tokens.title}" bodyBG=${tokens.bodyBG}`)
  console.log(`[${name}] vars=${Object.keys(tokens.vars).length} 个`)
  await ctx.close()
}
await browser.close()
console.log('done')
