/**
 * 诊断脚本：在若干滚动位置上把 DOM 隐藏，只截取 WebGL 画布，
 * 用来确认三维主体（robot / car / rabbit / cat）到底被放到了哪里。
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('dist')
const PORT = 4188
const BASE = '/website/'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (!p.startsWith(BASE)) {
    res.writeHead(404).end()
    return
  }
  p = p.slice(BASE.length) || 'index.html'
  const f = path.join(ROOT, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(200, { 'content-type': MIME['.html'] })
    res.end(fs.readFileSync(path.join(ROOT, 'index.html')))
    return
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' })
  res.end(fs.readFileSync(f))
})
await new Promise((r) => server.listen(PORT, r))

const outDir = process.argv[2] ?? '/workspace/probe'
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(`http://127.0.0.1:${PORT}${BASE}`, { waitUntil: 'load', timeout: 45000 })
await page.waitForTimeout(2500)

const STOPS = [
  { id: 'tracks', sel: '.punch' },
  { id: 'cases', sel: '#cases' },
  { id: 'garden', sel: '#garden' },
  { id: 'contact', sel: '#contact' },
]

const report = []
for (const s of STOPS) {
  for (let i = 0; i < 4; i++) {
    const d = await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      if (!el) return 0
      const d = el.getBoundingClientRect().top - 96
      if (Math.abs(d) > 4) window.scrollTo(0, window.scrollY + d)
      return d
    }, s.sel)
    await page.waitForTimeout(450)
    if (Math.abs(d) <= 4) break
  }
  await page.waitForTimeout(1600)

  // 记录占位盒的视口坐标
  const boxes = await page.evaluate(() => {
    const out = {}
    document.querySelectorAll('[data-anchor]').forEach((el) => {
      const r = el.getBoundingClientRect()
      out[el.dataset.anchor] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]
    })
    const punch = document.querySelector('.punch')
    if (punch) {
      const cs = getComputedStyle(punch)
      out.__punch = [cs.getPropertyValue('--px').trim(), cs.getPropertyValue('--py').trim(), cs.getPropertyValue('--pr').trim()]
    }
    return out
  })
  report.push({ stop: s.id, boxes })

  // 把画布提到最上层，并把所有色场刷白，只看三维内容落在哪
  await page.evaluate(() => {
    const st = document.getElementById('stage')
    if (st) {
      st.dataset.oldZ = st.style.zIndex
      st.style.zIndex = '99999'
    }
    document.querySelectorAll('main, nav, header, footer').forEach((el) => {
      el.style.opacity = '0.06'
    })
  })
  await page.waitForTimeout(350)
  await page.screenshot({ path: path.join(outDir, `canvas-${s.id}.png`) })
  await page.evaluate(() => {
    const st = document.getElementById('stage')
    if (st) st.style.zIndex = st.dataset.oldZ ?? ''
    document.querySelectorAll('main, nav, header, footer').forEach((el) => {
      el.style.opacity = ''
    })
  })
  await page.waitForTimeout(250)
}

console.log(JSON.stringify(report, null, 2))
await browser.close()
server.close()
