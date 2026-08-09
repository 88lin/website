/**
 * 快速目检：逐区块截图，用来人眼复查版式与活字场景。
 *
 * 沙箱是 SwiftShader，caps.ts 会判定为软件渲染并拒绝启 3D，
 * 所以想看到真实 GPU 用户看到的画面必须带 ?force3d=1（--no3d 可关掉）。
 *
 *   node scripts/peek.mjs                 桌面 1440，3D 开
 *   node scripts/peek.mjs --mobile        移动 390
 *   node scripts/peek.mjs --no3d          看 DOM 活字方阵那一档降级
 *   PEEK_IDS=top,stack node scripts/peek.mjs   只截指定区块
 *   PEEK_W=1920 PEEK_H=1080 node scripts/peek.mjs   换视口（版心封顶在 1300，宽屏要单独看）
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const OUT = process.env.PEEK_DIR || '/workspace/peek'
const MOBILE = process.argv.includes('--mobile')
const NO3D = process.argv.includes('--no3d')

const { server, url } = await serveDist({ dist: DIST, port: 4211 })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const VP = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 }
if (process.env.PEEK_W) VP.width = Number(process.env.PEEK_W)
if (process.env.PEEK_H) VP.height = Number(process.env.PEEK_H)
const page = await browser.newPage({ viewport: VP, deviceScaleFactor: 1 })

const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))

await page.goto(url + (NO3D ? '' : '?force3d=1'), { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

const state = await page.evaluate(() => {
  const c = document.querySelector('canvas#stage')
  const s = window.__typeStage
  return {
    canvas: c ? `${c.width}x${c.height}` : null,
    on: document.documentElement.dataset.type3d || '-',
    ok: s?.ok ?? null,
    reason: s?.reason ?? '-',
    mode: s?.mode ?? '-',
    slugs: document.querySelectorAll('.type-slug').length,
  }
})
console.log('活字场景:', JSON.stringify(state))

const IDS = process.env.PEEK_IDS
  ? process.env.PEEK_IDS.split(',')
  : ['top', 'numbers', 'tracks', 'work', 'cases', 'garden', 'stack', 'writing', 'contact']

for (const id of IDS) {
  await page.evaluate((i) => {
    const el = document.getElementById(i)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8, behavior: 'instant' })
  }, id)
  // lenis 平滑 + 入场动画 + 3D 阵型切换都要时间落定
  await page.waitForTimeout(1500)
  const tag = MOBILE ? 'm' : 'd'
  await page.screenshot({ path: `${OUT}/${tag}-${id}.png` })
}

console.log(`截图 ${IDS.length} 张 → ${OUT}`)
if (errs.length) console.log('运行时错误:\n' + errs.join('\n'))

await browser.close()
server.close()
