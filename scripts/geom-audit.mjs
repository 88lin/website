import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const preview = spawn('npx', ['vite', 'preview', '--port', '4313', '--strictPort'], { shell: true, stdio: 'ignore' })
await new Promise(r => setTimeout(r, 2500))
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto('http://localhost:4313/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const geo = await page.evaluate(() => {
  const out = { labels: [], junction: null, navW: 0 }
  document.querySelectorAll('.plate__svg text').forEach(t => {
    const r = t.getBoundingClientRect()
    out.labels.push({ t: t.textContent.slice(0, 18), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) })
  })
  // 标签两两碰撞检测
  const coll = []
  for (let i = 0; i < out.labels.length; i++) for (let j = i + 1; j < out.labels.length; j++) {
    const a = out.labels[i], b = out.labels[j]
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) coll.push(`${a.t} ↔ ${b.t}`)
  }
  out.collisions = coll
  const nav = document.querySelector('.nav-links')
  if (nav) out.navW = Math.round(nav.getBoundingClientRect().width)
  const jt = document.querySelector('.junc__track')
  if (jt) out.junction = jt.getBoundingClientRect().height
  const stamp = document.querySelector('.hero-plate__stamp')
  if (stamp) { const r = stamp.getBoundingClientRect(); out.stamp = { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) } }
  return out
})
console.log(JSON.stringify(geo, null, 1))
await browser.close(); preview.kill()
