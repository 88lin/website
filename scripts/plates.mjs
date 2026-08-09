/**
 * 静态图版烘焙：把实时织带在四个姿态下的样子拍成 public/plates/thread-{0..3}.webp。
 *
 * 谁会看到这四张图：手机、粗指针设备、开了「减少动态效果」的人、以及没有
 * WebGL2 的机器（见 caps.ts 的 detectTier）。对他们来说这就是舞台的全部内容，
 * 所以图必须和实时场景同源——它们就是实时场景的截屏，不是另画的插图。
 *
 * 两条硬要求：
 *  1) **必须带 alpha**。图版画在 .stage__wash 之上，双色硬切场要从织带周围透出来。
 *     烘的时候把场和页面正文全部藏掉，只留 canvas，omitBackground 拿透明底。
 *  2) **取样点要挑过**。织带沿 x 轴随滚动横扫（group.position.x = 10.5 - prog*21），
 *     页首页尾它都在画面外。直接按 Stage.tsx 的 PLATE 分段端点取样会拍到两张空图，
 *     所以取的是每段里织带确实在画面内的那个位置。
 *
 * 用法：node scripts/plates.mjs   （需要 dist/ 已经构建过）
 */
import { chromium } from 'playwright'
import { mkdir, rm, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { serveDist } from './lib/serve.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const OUT = path.join(ROOT, 'public/plates')
const TMP = path.join(ROOT, '.shots/plates-raw')
const VP = { width: 1440, height: 900 }
const DPR = 2
/** 出图尺寸。图版是全幅背景，1440×900 足够；再大只是白扛字节。 */
const W = 1440
const H = 900
/** 四张图各自的取样进度。对应 Stage.tsx 的 PLATE = [0,0,1,1,2,2,3,3]，
 *  取的是每两章一段的中段偏内侧，保证织带落在画面里。 */
const SAMPLES = [0.2, 0.4, 0.6, 0.8]

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(OUT, { recursive: true })

const { url, server } = await serveDist({ dist: path.join(ROOT, 'dist'), port: 4188 })
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
})
const page = await browser.newPage({ viewport: VP, deviceScaleFactor: DPR })

// ?gl=1 强制点火：沙箱是软件渲染，failIfMajorPerformanceCaveat 会把它当低端机挡掉
await page.goto(url + '?gl=1', { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.documentElement.classList.contains('js'), { timeout: 20000 })
// three 的 setSize 会把 canvas 的位图尺寸撑到视口 × dpr，默认是 300×150
await page.waitForFunction(
  () => {
    const c = document.querySelector('canvas#stage')
    return !!c && c.width > 400
  },
  { timeout: 30000 },
)

// 只留 canvas：场要藏（图版底下另有一层，重复了就成了双份底色），
// 正文用 visibility 藏而不是 display，否则文档高度塌掉，滚动进度就不对了。
await page.addStyleTag({
  content: `
    html,body{background:transparent!important}
    .stage__wash,.stage__plate{display:none!important}
    #root > *:not(.stage){visibility:hidden!important}
  `,
})
await page.waitForTimeout(300)

const made = []
for (let i = 0; i < SAMPLES.length; i++) {
  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: Math.round(max * p), behavior: 'instant' })
  }, SAMPLES[i])
  // 织带只在 |k-builtAt|>0.014 时重建几何，再加相机 lerp，给足两秒
  await page.waitForTimeout(2000)

  const raw = path.join(TMP, `thread-${i}.png`)
  const buf = await page.locator('canvas#stage').screenshot({ omitBackground: true })
  await writeFile(raw, buf)

  const dest = path.join(OUT, `thread-${i}.webp`)
  await sharp(raw)
    .resize(W, H, { fit: 'fill' })
    .webp({ quality: 76, alphaQuality: 90, effort: 6 })
    .toFile(dest)

  // 空图检查：织带扫出画面时会拍到一张全透明的图，那张图等于没有
  const { data, info } = await sharp(dest).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let lit = 0
  for (let p = 3; p < data.length; p += info.channels) if (data[p] > 12) lit++
  const cover = (lit / (info.width * info.height)) * 100
  const kb = ((await stat(dest)).size / 1024).toFixed(1)
  made.push({ name: `thread-${i}.webp`, prog: SAMPLES[i], cover, kb })
  if (cover < 1.5) console.warn(`⚠ thread-${i} 只有 ${cover.toFixed(1)}% 非透明像素，织带可能扫出画面了`)
}

// v5 的机架图版：DOM 已经不存在了，留着只是死重量
for (const f of await readdir(OUT)) {
  if (f.startsWith('ch-')) {
    await rm(path.join(OUT, f))
    console.log(`清理 ${f}`)
  }
}

await browser.close()
server.close()

console.log('\n== 图版 ==')
let total = 0
for (const m of made) {
  total += Number(m.kb)
  console.log(`  ${m.name}  prog ${m.prog}  ${W}×${H}  覆盖 ${m.cover.toFixed(1)}%  ${m.kb} KB`)
}
console.log(`  合计 ${total.toFixed(1)} KB`)
process.exit(0)
