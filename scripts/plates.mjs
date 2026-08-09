/**
 * 静态图版烘焙：把点着 3D 的桌面视图里、每个机架窗口看到的那一帧拍下来，
 * 存成 public/plates/<id>.webp。
 *
 * 手机端不点火 WebGL（见 caps.ts），窗口里放的就是这张图；
 * 桌面端在 <html class="gl-on"> 之后把它藏掉，换成真的 canvas。
 * 所以这些图必须和实时场景同源——它们就是实时场景的截屏。
 *
 * 用法：node scripts/plates.mjs   （需要 dist/ 已经构建过）
 */
import { chromium } from 'playwright'
import { mkdir, rm, readdir, stat } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { serveDist } from './lib/serve.mjs'

const ROOT = path.join(new URL('../', import.meta.url).pathname)
const OUT = path.join(ROOT, 'public/plates')
const TMP = path.join(ROOT, '.shots/plates-raw')
const DPR = 2 // 手机是高密度屏，图版按 2× 烘

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(OUT, { recursive: true })

const { url, server } = await serveDist({ dist: path.join(ROOT, 'dist'), port: 4188 })
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR })

await page.goto(url + '?gl=1', { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.documentElement.classList.contains('gl-on'), { timeout: 30000 })
await page.waitForTimeout(3000)

// 拍的是「透过窗口看到的场景」，所以要把窗框自身的丝印、螺丝、以及页面前景层去掉。
await page.addStyleTag({
  content: `
    .bay__inner,.rail,.strip,.foot,.skip{opacity:0!important}
    .chassis__bezel{border-color:transparent!important;box-shadow:none!important}
    .chassis__bezel > *:not(canvas):not(.plateshot){opacity:0!important}
    .plateshot{display:none!important}
  `,
})
await page.waitForTimeout(400)

const wins = await page.evaluate(() =>
  [...document.querySelectorAll('.bay')]
    .map((b) => {
      const bez = b.querySelector('.chassis__bezel')
      return bez ? { id: b.id, plate: bez.closest('.chassis')?.dataset.plate || b.id } : null
    })
    .filter(Boolean),
)

const made = []
for (const w of wins) {
  // 把这一格滚到视口顶端，取的就是访客滚到这里时窗口里的那一帧
  await page.evaluate((id) => {
    const el = document.getElementById(id)
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  }, w.id)
  await page.waitForTimeout(2200) // 等相机 lerp 收敛 + 粒子跑起来

  const box = await page.evaluate((id) => {
    const bez = document.getElementById(id).querySelector('.chassis__bezel')
    const r = bez.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, w.id)
  if (box.width < 8 || box.height < 8) continue

  const raw = path.join(TMP, `${w.id}.png`)
  await page.screenshot({ path: raw, clip: box })
  const webp = path.join(OUT, `${w.id}.webp`)
  const r = spawnSync('cwebp', ['-quiet', '-q', '78', '-m', '6', raw, '-o', webp])
  if (r.status !== 0) throw new Error(`cwebp 失败 ${w.id}: ${r.stderr}`)
  const kb = ((await stat(webp)).size / 1024).toFixed(1)
  made.push(`${w.id}.webp  ${Math.round(box.width * DPR)}×${Math.round(box.height * DPR)}  ${kb} KB`)
}

await browser.close()
server.close()

console.log('\n== 图版 ==')
for (const m of made) console.log('  ' + m)
const all = await readdir(OUT)
console.log(`\n→ public/plates/ 共 ${all.length} 个文件`)
process.exit(0)
