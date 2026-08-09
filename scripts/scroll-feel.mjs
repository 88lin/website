/**
 * 滚动手感量化。
 *
 * 「阻尼一塌糊涂」不是个能靠感觉调的问题 —— 这个脚本逐帧记录位移，
 * 把手感拆成可断言的量：跟手 lag、超调、稳定时间、速度平滑度、掉帧。
 *
 * 三个测量学要点（前两版都踩了）：
 *  1. 沙箱是软件渲染，rAF 未必跑得满 60fps。所以先测一段「空转基线帧率」，
 *     掉帧只跟基线比，避免把环境慢判成页面卡。
 *  2. 帧间隔不均时，逐帧位移本身就是锯齿。平滑度必须建立在
 *     速度 ds/dt 上，不能用原始 Δs，否则测的是抖动的时钟不是抖动的页面。
 *  3. 输入必须帧锁死。page.mouse.wheel() 走 CDP，一次往返 20~40ms，落在
 *     16.6ms 的帧格上必然忽快忽慢：实测这样量出来的抖动率 0.5，而同一条
 *     录像里「输入信号自己」的抖动率也是 0.5 —— 测的是量具。改成页面内
 *     rAF 每帧派发一次 wheel 后，输入抖动 0，输出抖动才是站点的责任。
 *
 *   node scripts/scroll-feel.mjs              lerp / duration 对比
 *   node scripts/scroll-feel.mjs --sweep      扫 lerp 取值
 *   node scripts/scroll-feel.mjs --json       输出 JSON
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveDist } from './lib/serve.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4223

// 每帧 60px @60Hz ≈ 3600px/s：一次干脆的滑动，比真人略快一点。
const WHEEL_PX = 60
const DRIVE_FRAMES = 60
const TAIL_FRAMES = 110

// 不要解掉 vsync。放开帧率上限后 rAF 会跑到 ~1000fps，逐帧位移只剩亚像素量化噪声，
// 抖动率和跟手全成了采样伪影 —— 真实用户是 60Hz，就照 60Hz 量。
export const LAUNCH_ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']

/** 空转基线：这台机器的 rAF 到底能跑多快。 */
async function baselineFrame(page) {
  return page.evaluate(
    () =>
      new Promise((res) => {
        const ts = []
        const stop = performance.now() + 800
        const tick = () => {
          ts.push(performance.now())
          if (performance.now() < stop) requestAnimationFrame(tick)
          else {
            const d = []
            for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1])
            d.sort((a, b) => a - b)
            res({ medianDt: d[Math.floor(d.length / 2)] || 16.7, frames: ts.length })
          }
        }
        requestAnimationFrame(tick)
      }),
  )
}

/**
 * 帧锁输入 + 逐帧录像，全在页面内跑完再一次性回传。
 * 录像同时记 s（lenis 平滑后的输出）和 tg（未平滑的原始目标），
 * 这样同一条数据里就能把「输入自带的抖」和「站点产生的抖」分开。
 */
async function driveAndRecord(page) {
  return page.evaluate(
    ([px, n, tail]) =>
      new Promise((done) => {
        const w = window
        const rec = []
        let i = 0
        let t0 = 0
        let t1 = 0
        const tick = () => {
          const l = w.__lenis
          rec.push({
            t: performance.now(),
            s: l ? l.scroll : w.scrollY,
            tg: l ? l.targetScroll : w.scrollY,
            // 读 JS 侧的总线值。早先这里走 getComputedStyle 读 :root 的 --sv，
            // 每帧强制一次同步样式重算，测的是采样器自己。
            sv: typeof w.__sv === 'number' ? w.__sv : 0,
          })
          if (i < n) {
            if (i === 0) t0 = performance.now()
            window.dispatchEvent(
              new WheelEvent('wheel', { deltaY: px, deltaMode: 0, bubbles: true, cancelable: true }),
            )
            i++
            if (i === n) t1 = performance.now()
            requestAnimationFrame(tick)
          } else if (rec.length < n + tail) {
            requestAnimationFrame(tick)
          } else {
            done({ rec, t0, t1 })
          }
        }
        requestAnimationFrame(tick)
      }),
    [WHEEL_PX, DRIVE_FRAMES, TAIL_FRAMES],
  )
}

function median(a) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  return s[Math.floor(s.length / 2)]
}

/** 速度序列上的两个平滑度口径：幅度型 jerk 与计数型 flip。 */
function smoothness(vel, lo, hi) {
  const w = vel.filter((x) => x.t >= lo && x.t <= hi)
  if (w.length < 8) return { jerkRatio: 0, flipRate: 0, n: w.length }
  const abs = w.map((x) => Math.abs(x.v))
  const mv = median(abs)
  const peak = Math.max(...abs)
  const dv = []
  for (let i = 1; i < w.length; i++) dv.push(Math.abs(w[i].v - w[i - 1].v))

  // 计数口径：速度曲线上「显著反向」的次数占比（噪声门限 = 峰值的 8%）
  const gate = peak * 0.08
  let flips = 0
  let counted = 0
  for (let i = 1; i < w.length; i++) {
    const d = w[i].v - w[i - 1].v
    if (Math.abs(d) < gate) continue
    counted++
    const p = w[i - 1].v - (w[i - 2]?.v ?? w[i - 1].v)
    if (Math.abs(p) >= gate && Math.sign(d) !== Math.sign(p)) flips++
  }
  return {
    n: w.length,
    // 幅度口径：相邻帧速度差的中位数 ÷ 中位速度。无量纲，与帧率脱钩。
    jerkRatio: mv > 0 ? +(median(dv) / mv).toFixed(3) : 0,
    flipRate: counted ? +(flips / counted).toFixed(3) : 0,
  }
}

function analyse(rec, t0, t1, baseDt) {
  if (rec.length < 40) return { error: 'too few frames', frames: rec.length }

  // 逐帧速度 px/ms —— 所有平滑度判断都建立在这上面，不用原始 Δs
  const vel = []
  const velIn = []
  for (let i = 1; i < rec.length; i++) {
    const dt = rec[i].t - rec[i - 1].t
    if (dt <= 0) continue
    vel.push({ t: rec[i].t, v: (rec[i].s - rec[i - 1].s) / dt, dt })
    velIn.push({ t: rec[i].t, v: (rec[i].tg - rec[i - 1].tg) / dt })
  }

  const during = rec.filter((r) => r.t >= t0 && r.t <= t1)
  const lagPx = during.length
    ? during.reduce((a, r) => a + Math.abs(r.tg - r.s), 0) / during.length
    : 0

  const after = rec.filter((r) => r.t > t1)
  const finalS = rec[rec.length - 1].s
  const maxAfter = after.length ? Math.max(...after.map((r) => r.s)) : finalS
  const total = Math.max(1, finalS - rec[0].s)
  const overshootPct = ((maxAfter - finalS) / total) * 100

  // 稳定时间：位移速度掉到 0.015 px/ms 且连续 5 帧
  let settleMs = -1
  let run = 0
  for (const x of vel) {
    if (x.t <= t1) continue
    run = Math.abs(x.v) < 0.015 ? run + 1 : 0
    if (run >= 5) {
      settleMs = x.t - t1
      break
    }
  }

  // 平滑度只看稳态段：掐掉起步 25% 和收尾 10%，那两头本来就该有斜坡
  const span = t1 - t0
  const lo = t0 + span * 0.25
  const hi = t0 + span * 0.9
  const out = smoothness(vel, lo, hi)
  const inp = smoothness(velIn, lo, hi)

  // 掉帧：只跟本机基线比
  let worstRun = 0
  run = 0
  for (const x of vel) {
    run = x.dt > baseDt * 1.8 ? run + 1 : 0
    worstRun = Math.max(worstRun, run)
  }

  const dts = vel.map((x) => x.dt).sort((a, b) => a - b)
  return {
    frames: rec.length,
    medianDt: +(dts[Math.floor(dts.length / 2)] || 0).toFixed(1),
    baseDt: +baseDt.toFixed(1),
    lagPx: +lagPx.toFixed(1),
    overshootPct: +overshootPct.toFixed(2),
    settleMs: settleMs < 0 ? -1 : Math.round(settleMs),
    flipRate: out.flipRate,
    jerkRatio: out.jerkRatio,
    inFlipRate: inp.flipRate,
    inJerkRatio: inp.jerkRatio,
    worstDropRun: worstRun,
    svPeak: +Math.max(...rec.map((r) => Math.abs(r.sv))).toFixed(3),
    svEnd: +Math.abs(rec[rec.length - 1].sv).toFixed(4),
    travelPx: Math.round(finalS - rec[0].s),
  }
}

export async function measure(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
  const base = await baselineFrame(page)
  const { rec, t0, t1 } = await driveAndRecord(page)
  return analyse(rec, t0, t1, base.medianDt)
}

const COLS = [
  ['跟手 lag(px)', 'lagPx'],
  ['超调 %', 'overshootPct'],
  ['稳定 ms', 'settleMs'],
  ['速度抖动率', 'flipRate'],
  ['速度 jerk', 'jerkRatio'],
  ['输入 jerk', 'inJerkRatio'],
  ['掉帧连跑', 'worstDropRun'],
  ['帧距 ms', 'medianDt'],
  ['sv 峰值', 'svPeak'],
  ['sv 收尾', 'svEnd'],
]

function table(results, title) {
  const rows = Object.keys(results)
  console.log('\n' + title + '\n')
  console.log('指标'.padEnd(14), ...rows.map((r) => r.padStart(9)))
  for (const [label, key] of COLS) {
    console.log(label.padEnd(12), ...rows.map((r) => String(results[r][key]).padStart(9)))
  }
  console.log('')
}

async function main() {
  const sweep = process.argv.includes('--sweep')
  const jsonOnly = process.argv.includes('--json')
  const { server, url } = await serveDist({ dist: path.join(ROOT, 'dist'), port: PORT })
  const browser = await chromium.launch({ args: LAUNCH_ARGS })
  const results = {}
  const cases = sweep
    ? ['0.07', '0.09', '0.12', '0.15', '0.2'].map((v) => [`L${v}`, `?lerp=${v}`])
    : [
        ['lerp', ''],
        ['duration', '?scroll=duration'],
      ]
  try {
    for (const [name, qs] of cases) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
      results[name] = await measure(page, url + qs)
      await page.close()
    }
  } finally {
    await browser.close()
    server.close()
  }
  if (jsonOnly) console.log(JSON.stringify(results, null, 2))
  else table(results, sweep ? 'lerp 取值扫描（帧锁 60×60px + 110 帧静置）' : '滚动手感对比')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
