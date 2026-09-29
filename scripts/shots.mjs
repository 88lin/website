/* 取景器：把产物按屏切片截图，供人眼过一遍。 */

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serveDist } from './lib/serve.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const OUT = path.join(ROOT, '.shots')
const PORT = 5188

const MOBILE = process.argv.includes('--mobile')
const routeArg = process.argv.find((a) => a.startsWith('--route='))
const route = routeArg ? routeArg.slice('--route='.length) : ''

const dev = MOBILE
  ? { tag: 'm', w: 390, h: 844, mobile: true }
  : { tag: 'd', w: 1440, h: 900, mobile: false }

await mkdir(OUT, { recursive: true })
const { server, url } = await serveDist({ dist: DIST, port: PORT })
const browser = await chromium.launch()

try {
  const ctx = await browser.newContext({
    viewport: { width: dev.w, height: dev.h },
    deviceScaleFactor: 1,
    isMobile: dev.mobile,
    hasTouch: dev.mobile,
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))

  await page.goto(url.replace(/\/$/, '/') + route, { waitUntil: 'networkidle' })

  // 入场是靠 IntersectionObserver 逐块揭示的，截长图前先把所有块放出来，
  // 否则截到的是一片还没揭示的空白（这个坑踩过）。
  await page.evaluate(() => {
    document.documentElement.classList.remove('js')
    document.querySelectorAll('[data-stagger]').forEach((e) => e.classList.add('is-in'))
  })
  await page.waitForTimeout(600)

  const info = await page.evaluate(() => ({
    pageH: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    secs: Array.from(document.querySelectorAll('section[id], .hero')).map((s) => ({
      id: s.id || 'hero',
      h: Math.round(s.getBoundingClientRect().height),
    })),
  }))

  /*
    上限从 16 提到 26。16 屏 × 844 = 13504px，而手机版这一页 21.4 屏 ——
    联系章、二维码、页脚整整最后 5.5 屏从来没进过取景器，那批问题
    （水印被二维码盖掉 37%、按钮圆角在窄屏降级）就是这么漏过去的。
    截不全的时候必须喊出来，不能默默少截几张。
  */
  const CAP = 26
  const want = Math.ceil(info.pageH / dev.h)
  const frames = Math.min(want, CAP)
  for (let i = 0; i < frames; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), i * dev.h)
    await page.waitForTimeout(280)
    await page.screenshot({ path: path.join(OUT, `${dev.tag}${i}.png`) })
  }

  console.log(
    `\n${dev.w}×${dev.h}${route ? ' /' + route : ''}  页高 ${info.pageH}px（${(info.pageH / dev.h).toFixed(1)} 屏）  横溢 ${info.overflow}px  出图 ${frames} 张${
      want > CAP ? `\n  \x1b[33m⚠ 只截到前 ${CAP} 屏，还有 ${want - CAP} 屏没看\x1b[0m` : ''
    }`,
  )
  console.log('  ' + info.secs.map((s) => `${s.id}:${s.h}`).join('  '))
  if (errs.length) console.log('  ERR: ' + [...new Set(errs)].slice(0, 6).join(' | '))
  await ctx.close()
} finally {
  await browser.close()
  server.close()
}
