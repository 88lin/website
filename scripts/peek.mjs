/**
 * 逐屏目检：把八章各截一张，再把两处滚动驱动的段落（作品横推、案例堆叠）
 * 按行程切片截，最后可选三条案例子路由。用来人眼复查版式。
 *
 * 沙箱是 SwiftShader，caps.ts 会判成 static 拒绝启 3D，
 * 想看到真实 GPU 用户看到的织带必须带 ?gl=1（--no3d 可关掉看图版兜底那一档）。
 *
 *   node scripts/peek.mjs                    桌面 1440×900，3D 开
 *   node scripts/peek.mjs --mobile           移动 390×844（会自动走图版兜底）
 *   node scripts/peek.mjs --no3d             看图版兜底
 *   node scripts/peek.mjs --cases            只截三条案例子路由
 *   PEEK_H=700 node scripts/peek.mjs         矮视口，查案例卡会不会溢出
 *   PEEK_IDS=hero,works node scripts/peek.mjs
 *   PEEK_DIR=/workspace/peekX node scripts/peek.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const OUT = process.env.PEEK_DIR || '/workspace/peek-v6'
const MOBILE = process.argv.includes('--mobile')
const NO3D = process.argv.includes('--no3d')
const CASES = process.argv.includes('--cases')

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

const tag = MOBILE ? 'm' : `d${VP.width}x${VP.height}`
const q = NO3D ? '' : '?gl=1'

/** lenis 平滑 + 入场动画 + ScrollTrigger 都要时间落定 */
const settle = (ms = 1200) => page.waitForTimeout(ms)
const jump = (y) => page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y)
const shot = (name) => page.screenshot({ path: `${OUT}/${tag}-${name}.png` })

if (CASES) {
  for (const slug of ['lofi', 'repair', 'video-vip']) {
    await page.goto(`${url}case/${slug}/${q}`, { waitUntil: 'networkidle' })
    await settle(1800)
    await shot(`case-${slug}-top`)
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.6, behavior: 'instant' }))
    await settle()
    await shot(`case-${slug}-mid`)
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight - window.innerHeight, behavior: 'instant' }),
    )
    await settle()
    await shot(`case-${slug}-end`)
  }
} else {
  await page.goto(url + q, { waitUntil: 'networkidle' })
  await settle(2600)

  const state = await page.evaluate(() => {
    const c = document.querySelector('canvas#stage')
    return {
      canvas: c ? `${c.width}x${c.height}` : null,
      plates: document.querySelectorAll('.stage__plate').length,
      plateOn: document.querySelector('.stage__plate.is-on') ? 'yes' : 'no',
      wash: document.querySelector('.stage__wash.is-on')?.dataset.wash ?? '-',
      docH: document.scrollingElement.scrollHeight,
    }
  })
  console.log('舞台:', JSON.stringify(state))

  const IDS = process.env.PEEK_IDS
    ? process.env.PEEK_IDS.split(',')
    : ['hero', 'metrics', 'tracks', 'works', 'cases', 'garden', 'writing', 'contact']

  for (const id of IDS) {
    const top = await page.evaluate((i) => {
      const el = document.getElementById(i)
      return el ? el.getBoundingClientRect().top + window.scrollY : null
    }, id)
    if (top == null) {
      console.log(`  ! 缺章节 #${id}`)
      continue
    }
    await jump(top + 2)
    await settle()
    await shot(id)

    // 两处滚动驱动的段落按行程切片：只看章首等于没看
    if (id === 'works' || id === 'cases') {
      const h = await page.evaluate((i) => document.getElementById(i).offsetHeight, id)
      const cuts = id === 'works' ? [0.35, 0.7, 0.95] : [0.3, 0.55, 0.8]
      for (const f of cuts) {
        await jump(top + (h - VP.height) * f)
        await settle(900)
        await shot(`${id}-${Math.round(f * 100)}`)
      }
    }
  }
}

console.log(`→ ${OUT}`)
if (errs.length) console.log('运行时错误:\n' + errs.join('\n'))

await browser.close()
server.close()
