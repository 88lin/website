/** 快速目检：只截几屏，用来确认晶体场景真的渲染出来了。 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const OUT = process.env.PEEK_DIR || '/workspace/peek'
const { server, url } = await serveDist({ dist: DIST, port: 4211 })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })

const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)

const state = await page.evaluate(() => {
  const c = document.querySelector('canvas#stage')
  return {
    hasCanvas: !!c,
    stageOn: document.documentElement.classList.contains('stage-on'),
    noWebgl: document.documentElement.classList.contains('no-webgl'),
    w: c?.width,
    h: c?.height,
  }
})
console.log('stage:', JSON.stringify(state))

const targets = process.env.PEEK_IDS
  ? process.env.PEEK_IDS.split(',')
  : ['top', '__stats', 'cases', 'garden', 'writing', 'contact']

for (const id of targets) {
  // sN = 第 N 个 section（很多区块没有 id）；否则按 id 找
  await page.evaluate((i) => {
    const m = /^s(\d+)$/.exec(i)
    const el = m
      ? document.querySelectorAll('#root section')[Number(m[1]) - 1]
      : document.getElementById(i)
    el?.scrollIntoView({ block: 'start' })
  }, id)
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/${id}.png` })
  console.log('shot', id)
}

// 单独抓一张只有画布的图：把页面内容整体隐藏，直接看晶体本体
await page.evaluate(() => document.getElementById('top')?.scrollIntoView({ block: 'start' }))
await page.waitForTimeout(1200)
await page.addStyleTag({ content: 'main,nav{opacity:0 !important}' })
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/_canvas-only.png` })

await browser.close()
server.close()
if (errs.length) console.log('ERRORS:\n' + errs.slice(0, 12).join('\n'))
else console.log('no console/page errors')
