/**
 * 采集「真正用中黑及以上字重渲染」的字符。
 *
 * 汉字子集拆成两份：常规字重那份必须覆盖全站文案，中黑那份只覆盖标题、
 * 数字和微标签。判断依据是 computed font-weight —— 站点里 .display 是
 * 600、.eyebrow 是 590、.mono 是 560，正文是 420，阈值取 501 正好对上
 * CSS 里 @font-face 的 unicode 分档（400 500 / 501 900）。
 * 三个断点各跑一遍，把 display:none 的响应式分支也覆盖进去。
 *
 * 输出：scripts/display-chars.txt
 */
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const OUT = new URL('./display-chars.txt', import.meta.url).pathname
const { server, url } = await serveDist({ dist: DIST, port: 4207 })

const collect = () => {
  const chars = new Set()
  for (const el of document.querySelectorAll('body *')) {
    const w = parseInt(getComputedStyle(el).fontWeight, 10)
    if (!(w >= 501)) continue
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue) for (const c of n.nodeValue) chars.add(c)
    }
  }
  return [...chars].join('')
}

const browser = await chromium.launch()
const found = new Set()
for (const [w, h] of [
  [1440, 900],
  [390, 844],
  [1024, 768],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(url, { waitUntil: 'networkidle' })
  // 滚到底，确保 ScrollTrigger 相关的分区全部挂载
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(900)
  for (const c of await page.evaluate(collect)) found.add(c)
  await page.close()
}
await browser.close()
server.close()

// 安全余量：数字、常用标点、拉丁字母一律保留，改文案时不至于立刻掉字
const SAFE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  ' .,:;!?\'"()[]{}<>/\\|-_+=*&^%$#@~`·…→←×°•—–，。、；：？！（）「」『』《》【】'
for (const c of SAFE) found.add(c)

const out = [...found].sort().join('')
await writeFile(OUT, out, 'utf8')
const cjk = [...found].filter((c) => /[\u4e00-\u9fff]/.test(c)).length
console.log(`中黑字符集：${found.size} 个（其中汉字 ${cjk}）→ ${OUT}`)
