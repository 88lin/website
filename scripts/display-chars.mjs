/**
 * 采集「真正需要 webfont 的字符」，按目标字体文件分成两桶。
 *
 * 站点上中文有三种可能的渲染路径：
 *   1. 衬线标题        → Noto Serif SC Web（@font-face 500–900）
 *   2. 无衬线中黑以上  → Noto Sans SC Web 的 501–900 那一档（Semibold）
 *   3. 其余正文        → Noto Sans SC Web 的 400–500 档（Regular，全站汉字兜底）
 *
 * 前两桶如果共用同一份字符表，Semibold 会被标题里的大字连坐、Serif 会被
 * 55 篇文章标题连坐，两边都虚胖。所以这里按 computed style 分别采集：
 *   serif 桶 = fontFamily 命中 'Noto Serif SC Web'
 *   bold  桶 = 非 serif 且 computed font-weight ≥ 501（对上 @font-face 的分档）
 * 三个断点各跑一遍，把响应式 display:none 的分支也覆盖进去。
 *
 * 输出：scripts/serif-chars.txt、scripts/display-chars.txt
 */
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import { serveDist } from './lib/serve.mjs'

const DIST = new URL('../dist/', import.meta.url).pathname
const OUT_SERIF = new URL('./serif-chars.txt', import.meta.url).pathname
const OUT_BOLD = new URL('./display-chars.txt', import.meta.url).pathname
const { server, url } = await serveDist({ dist: DIST, port: 4207 })

const collect = () => {
  const serifChars = new Set()
  const boldChars = new Set()
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    const serif = cs.fontFamily.includes('Noto Serif SC Web')
    const bold = parseInt(cs.fontWeight, 10) >= 501
    if (!serif && !bold) continue
    const bucket = serif ? serifChars : boldChars
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.nodeValue) for (const c of n.nodeValue) bucket.add(c)
    }
  }
  return { serif: [...serifChars].join(''), bold: [...boldChars].join('') }
}

const browser = await chromium.launch()
const serifSet = new Set()
const boldSet = new Set()
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
  const { serif, bold } = await page.evaluate(collect)
  for (const c of serif) serifSet.add(c)
  for (const c of bold) boldSet.add(c)
  await page.close()
}
await browser.close()
server.close()

// 安全余量：数字、常用标点、拉丁字母一律保留，改文案时不至于立刻掉字。
// 拉丁在 Fraunces 里已有，但中文场景下 fallback 也可能落到这两份，成本只有几百字节。
const SAFE =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  ' .,:;!?\'"()[]{}<>/\\|-_+=*&^%$#@~`·…→←×°•—–，。、；：？！（）「」『』《》【】'
for (const c of SAFE) {
  serifSet.add(c)
  boldSet.add(c)
}

const cjk = (s) => [...s].filter((c) => /[\u4e00-\u9fff]/.test(c)).length
await writeFile(OUT_SERIF, [...serifSet].sort().join(''), 'utf8')
await writeFile(OUT_BOLD, [...boldSet].sort().join(''), 'utf8')
console.log(`衬线标题字符集：${serifSet.size} 个（汉字 ${cjk(serifSet)}）→ ${OUT_SERIF}`)
console.log(`无衬线中黑字符集：${boldSet.size} 个（汉字 ${cjk(boldSet)}）→ ${OUT_BOLD}`)
