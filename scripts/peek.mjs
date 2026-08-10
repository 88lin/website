/**
 * 逐屏目检：六章各截一张，两处滚动驱动的段落（作品横推、案例堆叠）按行程切片，
 * 最后可选三条案例子路由。用来人眼复查版式，不做断言——断言在 audit.mjs。
 *
 *   node scripts/peek.mjs                    桌面 1440×900
 *   node scripts/peek.mjs --mobile           移动 390×844
 *   node scripts/peek.mjs --cases            只截三条案例子路由
 *   PEEK_H=700 node scripts/peek.mjs         矮视口，查首屏会不会溢出
 *   PEEK_IDS=hero,work node scripts/peek.mjs
 *   PEEK_DIR=/workspace/peekX node scripts/peek.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const OUT = process.env.PEEK_DIR || '/workspace/peek-v7'
const MOBILE = process.argv.includes('--mobile')
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

/** lenis 平滑 + 入场动画 + ScrollTrigger 都要时间落定 */
const settle = (ms = 1200) => page.waitForTimeout(ms)
/** 不能用 scrollIntoView：lenis 接管后它不生效 */
const jump = (y) => page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), y)
const shot = (name) => page.screenshot({ path: `${OUT}/${tag}-${name}.png` })

if (CASES) {
  for (const slug of ['lofi', 'repair', 'video-vip']) {
    await page.goto(`${url}case/${slug}/`, { waitUntil: 'networkidle' })
    await settle(1600)
    await shot(`case-${slug}-top`)
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.1, behavior: 'instant' }))
    await settle()
    await shot(`case-${slug}-mid`)
  }
} else {
  await page.goto(url, { waitUntil: 'networkidle' })
  await settle(2400)

  // 先把整页滚一遍再统计：lazy 图没进过视口时 complete=false，直接量会误报成坏图
  const H0 = await page.evaluate(() => document.scrollingElement.scrollHeight)
  for (let y = 0; y < H0; y += 600) {
    await jump(y)
    await page.waitForTimeout(110)
  }
  await jump(0)
  await settle(1400)

  const state = await page.evaluate(() => ({
    docH: document.scrollingElement.scrollHeight,
    heroH: document.getElementById('hero')?.scrollHeight ?? null,
    shots: document.querySelectorAll('.shot img').length,
    broken: [...document.querySelectorAll('.shot img')].filter((i) => !i.complete || !i.naturalWidth)
      .length,
    chapters: [...document.querySelectorAll('main > section.ch')].map((s) => s.id),
  }))
  console.log('页面:', JSON.stringify(state))

  const IDS = process.env.PEEK_IDS
    ? process.env.PEEK_IDS.split(',')
    : ['hero', 'work', 'cases', 'craft', 'notes', 'contact']

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

    // 横推与堆叠只看章首等于没看：按行程切片
    if (id === 'work' || id === 'cases' || id === 'notes') {
      const h = await page.evaluate((i) => document.getElementById(i).offsetHeight, id)
      const cuts = id === 'work' ? [0.35, 0.7, 0.98] : [0.34, 0.68, 0.95]
      for (const f of cuts) {
        await jump(top + Math.max(0, h - VP.height) * f)
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
