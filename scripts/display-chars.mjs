/**
 * 从构建产物里精确采集「真正用得意黑（Smiley Sans）渲染」的字符。
 * 得意黑只挂在 .display 上，但子集脚本原先把全站汉字都塞了进去（100 KB）。
 * 这里遍历 DOM，按 computed font-family 判断归属——包含 display:none 的
 * 响应式分支，所以两个断点的文案都能覆盖到。
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
  const all = document.querySelectorAll('body *')
  for (const el of all) {
    const ff = getComputedStyle(el).fontFamily || ''
    if (!/smiley/i.test(ff)) continue
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
console.log(`display 字符集：${found.size} 个（其中汉字 ${cjk}）→ ${OUT}`)
