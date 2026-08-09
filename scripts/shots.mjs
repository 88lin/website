/**
 * 开发期取景器：把 dist 起起来，按 bay 逐格截图，顺便把每格的关键量测打印出来。
 *
 * 用法：
 *   node scripts/shots.mjs                 # 桌面 1440×900，强制点火 3D
 *   node scripts/shots.mjs --mobile        # 390×844，不点火（走静态图版）
 *   node scripts/shots.mjs --no-gl         # 桌面但不点火，看降级形态
 *   node scripts/shots.mjs --route=case/lofi/
 *   node scripts/shots.mjs --full          # 额外来一张整页长图
 *
 * 沙盒和 CI 都没有 GPU，必须 --use-gl=swiftshader，否则 WebGL 上下文创建直接失败。
 */
import { chromium } from 'playwright'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { serveDist } from './lib/serve.mjs'

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const val = (k, d) => (argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=')

const MOBILE = has('--mobile')
const BARE = has('--bare') // 只看 3D：把页面所有前景层隐掉，判断场景本身够不够看
const GL = !has('--no-gl') && !MOBILE
const ROUTE = val('route', '')
const TAG = val('tag', BARE ? 'bare' : MOBILE ? 'mobile' : GL ? 'desktop' : 'nogl')
const OUT = path.join(new URL('../', import.meta.url).pathname, '.shots', TAG)
const PORT = 4184 + (MOBILE ? 1 : 0)

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const { url, server } = await serveDist({ dist: path.join(new URL('../', import.meta.url).pathname, 'dist'), port: PORT })
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
})
const page = await browser.newPage({
  viewport: MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  isMobile: MOBILE,
  hasTouch: MOBILE,
})
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
page.on('requestfailed', (r) => errors.push(`404?: ${r.url().split('/').slice(-2).join('/')}`))

await page.goto(url + ROUTE + (GL ? '?gl=1' : ''), { waitUntil: 'networkidle' })
await page.waitForFunction(() => document.documentElement.classList.contains('js'), { timeout: 20000 })
if (GL) {
  await page
    .waitForFunction(() => document.documentElement.classList.contains('gl-on'), { timeout: 25000 })
    .catch(() => errors.push('!! 3D 没点着：没等到 .gl-on'))
  await page.waitForTimeout(2500)
}
await page.waitForTimeout(600)

if (BARE) {
  await page.addStyleTag({
    content: '.bay__inner,.chassis,.rail,.strip,.foot,.skip{opacity:0!important} html,body{background:transparent!important}',
  })
  await page.waitForTimeout(300)
}

const bays = await page.evaluate(() =>
  [...document.querySelectorAll('.bay')].map((b) => {
    const r = b.getBoundingClientRect()
    const bez = b.querySelector('.chassis__bezel')
    const br = bez && bez.getBoundingClientRect()
    return {
      id: b.id,
      ch: b.dataset.channel,
      ground: b.dataset.ground,
      h: Math.round(r.height),
      vh: +(r.height / window.innerHeight).toFixed(2),
      win: br ? { w: Math.round(br.width), h: Math.round(br.height) } : null,
    }
  }),
)

console.log(`\n== ${TAG} ${ROUTE || '/'} ==`)
for (const b of bays) {
  console.log(
    `${b.id}  ${String(b.ground).padEnd(12)} 高 ${String(b.h).padStart(5)}px (${b.vh}vh)` +
      (b.win ? `  窗 ${b.win.w}×${b.win.h}` : ''),
  )
}

// 逐格截图：把 bay 顶端对齐视口顶端，看到的就是访客滚到这格时的样子
for (const b of bays) {
  await page.evaluate((id) => {
    const el = document.getElementById(id)
    const y = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: y, behavior: 'instant' })
  }, b.id)
  await page.waitForTimeout(GL ? 1400 : 500)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-reveal]')) el.classList.add('is-in')
    for (const el of document.querySelectorAll('.annot')) el.classList.add('is-open')
  })
  await page.waitForTimeout(GL ? 900 : 420)
  await page.screenshot({ path: path.join(OUT, `${b.id}.png`) })
  if (BARE) continue
  // 超过一屏的格子补一张下半段
  if (b.h > (MOBILE ? 844 : 900) * 1.25) {
    await page.evaluate((id) => {
      const el = document.getElementById(id)
      const r = el.getBoundingClientRect()
      window.scrollTo({ top: r.top + window.scrollY + r.height - window.innerHeight, behavior: 'instant' })
    }, b.id)
    await page.waitForTimeout(GL ? 1200 : 400)
    await page.screenshot({ path: path.join(OUT, `${b.id}-b.png`) })
  }
}

if (has('--full') || ROUTE) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, `_full.png`), fullPage: true })
}

if (errors.length) {
  console.log('\n-- 控制台 --')
  for (const e of [...new Set(errors)].slice(0, 20)) console.log('  ' + e)
}
console.log(`\n→ ${OUT}`)
await browser.close()
server.close()
process.exit(0)
