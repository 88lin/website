/**
 * 抓取仍在线的项目站点真实截图作为作品封面。
 * 用真实界面而不是 AI 生成图，因为面向招聘方与技术负责人，可信度优先。
 */
import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'

const OUT = new URL('../public/covers/', import.meta.url).pathname
const TMP = '/workspace/tmp-covers'

const TARGETS = [
  { id: 'lofi', url: 'https://lofi.88lin.eu.org', wait: 4500 },
  { id: 'repair', url: 'https://repair.88lin.eu.org/', wait: 3500 },
  { id: 'gzh', url: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html', wait: 3000 },
]

await mkdir(OUT, { recursive: true })
await mkdir(TMP, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  locale: 'zh-CN',
  colorScheme: 'light',
})

const report = []
for (const t of TARGETS) {
  const page = await ctx.newPage()
  const raw = path.join(TMP, `${t.id}.png`)
  try {
    const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(t.wait)
    await page.screenshot({ path: raw, clip: { x: 0, y: 0, width: 1440, height: 900 } })
    await sharp(raw)
      .resize(1200, 750, { fit: 'cover', position: 'top' })
      .webp({ quality: 80, effort: 6 })
      .toFile(path.join(OUT, `${t.id}.webp`))
    await unlink(raw)
    report.push({ id: t.id, status: res?.status() ?? 0, ok: true })
  } catch (e) {
    report.push({ id: t.id, ok: false, error: String(e).slice(0, 160) })
  }
  await page.close()
}

await browser.close()
await writeFile('/workspace/covers-report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
