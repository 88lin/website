/**
 * v11 走查取景器：起 vite preview → Playwright 截桌面/移动/案例页。
 * 沙盒无 GPU，Chromium 带 swiftshader；?gl=1 强制点火看 3D 层。
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'

const OUT = '.impeccable/review'
mkdirSync(OUT, { recursive: true })

const preview = spawn('npx', ['vite', 'preview', '--port', '4311', '--strictPort'], {
  shell: true,
  stdio: 'ignore',
})
await new Promise((r) => setTimeout(r, 2500))

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
})

const shots = async () => {
  // 桌面：默认（星图先 SVG 后点火）
  const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p1 = await d.newPage()
  p1.on('console', (m) => m.type() === 'error' && console.log('[console.error]', m.text().slice(0, 200)))
  p1.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
  await p1.goto('http://localhost:4311/', { waitUntil: 'networkidle' })
  await p1.waitForTimeout(600)
  await p1.screenshot({ path: `${OUT}/desktop-hero-svg.png` })
  await p1.waitForTimeout(3200)
  await p1.screenshot({ path: `${OUT}/desktop-hero.png` })
  const glOn = await p1.evaluate(() => document.documentElement.classList.contains('gl-on') || !!document.querySelector('.plate[data-gl="1"]'))
  console.log('desktop atlas gl:', glOn)

  // 章节走查
  for (const id of ['metrics', 'craft', 'work', 'cases', 'garden', 'notes', 'contact']) {
    await p1.evaluate((s) => document.getElementById(s)?.scrollIntoView({ block: 'start' }), id)
    await p1.waitForTimeout(900)
    await p1.screenshot({ path: `${OUT}/desktop-${id}.png` })
  }
  await p1.evaluate(() => window.scrollTo(0, 0))
  await p1.waitForTimeout(400)
  await p1.screenshot({ path: `${OUT}/desktop.png` })
  await p1.screenshot({ path: `${OUT}/desktop-full.png`, fullPage: true })
  await d.close()

  // 桌面强制 3D
  const g = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p2 = await g.newPage()
  await p2.goto('http://localhost:4311/?gl=1', { waitUntil: 'networkidle' })
  await p2.waitForTimeout(3500)
  await p2.screenshot({ path: `${OUT}/desktop-hero-gl.png` })
  await g.close()

  // 案例
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const p3 = await c.newPage()
  await p3.goto('http://localhost:4311/case/video-vip/', { waitUntil: 'networkidle' })
  await p3.waitForTimeout(800)
  await p3.screenshot({ path: `${OUT}/desktop-case.png` })
  await p3.screenshot({ path: `${OUT}/desktop-case-full.png`, fullPage: true })
  await c.close()

  // 移动
  const m = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const p4 = await m.newPage()
  await p4.goto('http://localhost:4311/', { waitUntil: 'networkidle' })
  await p4.waitForTimeout(700)
  await p4.screenshot({ path: `${OUT}/mobile-hero.png` })
  await p4.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true })
  await p4.evaluate(() => document.getElementById('craft')?.scrollIntoView())
  await p4.waitForTimeout(700)
  await p4.screenshot({ path: `${OUT}/mobile-craft.png` })
  await m.close()
}

try {
  await shots()
  console.log('done →', OUT)
} finally {
  await browser.close()
  preview.kill()
}
