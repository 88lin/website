/**
 * 在本地静态服务器上截图，用于人工目检。
 * 用法：node scripts/shots.mjs [outDir] [--reduced] [--nowebgl]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { serveDist } from './lib/serve.mjs'
import { findOverflow } from './lib/overflow.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const outDir = process.argv[2] || '/workspace/shots'
const reduced = process.argv.includes('--reduced')
const noWebgl = process.argv.includes('--nowebgl')
await mkdir(outDir, { recursive: true })

// 挂在 /website/ 子路径下（验证 base:'./' 相对路径构建），并开启 gzip
const { server, url: URL_BASE } = await serveDist({ dist: DIST, port: 4173 })

// 沙箱里没有 GPU：显式走 SwiftShader，否则截图里的画布是空的
const browser = await chromium.launch({
  args: noWebgl ? ['--disable-gpu', '--disable-webgl'] : ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})

const VIEWS = [
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
]

const STOPS = [
  { id: '1-hero', y: 0 },
  { id: '2-numbers', sel: '#numbers' },
  { id: '3-tracks', sel: '#tracks' },
  { id: '4-work', sel: '#work' },
  { id: '5-cases', sel: '#cases' },
  { id: '6-garden', sel: '#garden' },
  { id: '7-stack', sel: '#stack' },
  { id: '8-writing', sel: '#writing' },
  { id: '9-contact', sel: '#contact' },
]

// 换配色：node scripts/shots.mjs <dir> --palette=D
const paletteArg = process.argv.find((a) => a.startsWith('--palette='))
const palette = paletteArg ? paletteArg.split('=')[1] : null

const errors = []
for (const v of VIEWS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    isMobile: v.id === 'mobile',
    hasTouch: v.id === 'mobile',
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${v.id}] ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${v.id}] console: ${m.text().slice(0, 200)}`)
  })
  if (noWebgl) {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (t, ...a) {
        if (String(t).includes('webgl')) return null
        return orig.call(this, t, ...a)
      }
    })
  }
  await page.goto(URL_BASE, { waitUntil: 'load', timeout: 45000 })
  if (palette) {
    await page.evaluate((p) => document.documentElement.setAttribute('data-palette', p), palette)
  }
  await page.waitForTimeout(2200)

  const suffix =
    (reduced ? '-reduced' : '') + (noWebgl ? '-nowebgl' : '') + (palette ? `-p${palette}` : '')
  for (const s of STOPS) {
    if (s.y === 0) {
      await page.evaluate(() => window.scrollTo(0, 0))
    } else {
      // Lenis 的虚拟滚动会吞掉一次性 scrollTo，用测量-修正循环逼近目标位置
      for (let i = 0; i < 4; i++) {
        const delta = await page.evaluate(([sel, off]) => {
          const el = document.querySelector(sel)
          if (!el) return 0
          const d = el.getBoundingClientRect().top - off
          if (Math.abs(d) > 4) window.scrollTo(0, window.scrollY + d)
          return d
        }, [s.sel, s.off ?? 96])
        await page.waitForTimeout(450)
        if (Math.abs(delta) <= 4) break
      }
    }
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(outDir, `${v.id}-${s.id}${suffix}.png`) })
  }

  // 横向溢出检测（相对最近的裁剪祖先，而不是视口）
  const overflow = await page.evaluate(findOverflow)
  if (overflow.length) errors.push(`[${v.id}] overflow: ${JSON.stringify(overflow)}`)

  await ctx.close()
}

await browser.close()
server.close()
console.log(errors.length ? errors.join('\n') : 'no runtime errors, no overflow')
