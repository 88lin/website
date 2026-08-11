/**
 * 采集全站实际用到的字符，按**字体族**分桶写进 scripts/chars/*.txt。
 *
 * 为什么必须在浏览器里跑，而不是拿正则去扫源码：字体是由 CSS 决定的。
 * 同一个「4」，在读数窗里是 JetBrains Mono，在正文里是 Noto Sans SC。
 * 只有 getComputedStyle 能告诉你到底该把它塞进哪个子集。少塞一个字，
 * 线上就退成系统字；多塞一堆，中日韩字体立刻胖几十 KB。
 *
 * 另外两件容易漏的事：
 *  1) ::before/::after 的 content 也是要渲染的字符，DOM 文本节点里没有。
 *  2) 手写标注层与丝印标签在 JS 点火后才出现，所以要等 hydration 之后再采。
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { serveDist } from './lib/serve.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const OUT = path.join(ROOT, 'scripts/chars')
const PORT = 4183
const ROUTES = ['', 'case/lofi/', 'case/repair/', 'case/video-vip/']

/** CSS font-family 列表的头一项 → 子集桶名。
 *  站内每个族名都带 Web 后缀（自托管子集），系统同名字体走 local() 回落，
 *  不能混进来，否则会把系统字排到的字符也塞进子集。 */
const BUCKET = {
  'fraunces web': 'display',
  'jetbrains mono web': 'mono',
  'caveat web': 'hand',
}
// v9 起正文不再自托管中日韩字体，正文栈头一项是 -apple-system，
// 由各端系统字承担（macOS/iOS 苹方，Windows 微软雅黑）。所以这里没有 sans 桶：
// 留着它只会把系统字排到的几千个汉字塞进子集，白背 117 KB。

const collect = () => {
  const found = {}
  const push = (bucket, text) => {
    if (!text) return
    ;(found[bucket] ||= new Set())
    for (const ch of text) if (ch.codePointAt(0) > 31) found[bucket].add(ch)
  }
  const first = (ff) =>
    String(ff || '')
      .split(',')[0]
      .trim()
      .replace(/^["']|["']$/g, '')
      .toLowerCase()

  const walk = (el) => {
    const cs = getComputedStyle(el)
    const fam = first(cs.fontFamily)
    const weight = parseInt(cs.fontWeight, 10) || 400
    for (const pseudo of ['::before', '::after']) {
      const pc = getComputedStyle(el, pseudo).content
      // attr()/counter()/url() 在 computed style 里是未求值的字面量，
      // 直接塞进桶会把 a t r ( ) - 这些字母算成用字。真正要渲染的值另有兜底。
      if (pc && pc !== 'none' && pc !== 'normal' && !/\b(attr|counter|counters|url|image-set)\(/.test(pc)) {
        push(`${fam}|${weight}`, pc.replace(/^["']|["']$/g, ''))
      }
    }
    for (const node of el.childNodes) {
      if (node.nodeType === 3) push(`${fam}|${weight}`, node.nodeValue)
      else if (node.nodeType === 1) walk(node)
    }
  }
  walk(document.body)
  const out = {}
  for (const [k, v] of Object.entries(found)) out[k] = [...v].join('')
  return out
}

const url = (await serveDist({ dist: path.join(ROOT, 'dist'), port: PORT })).url
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] })
const buckets = new Map()

for (const route of ROUTES) {
  for (const vp of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 })
    await page.goto(url + route, { waitUntil: 'networkidle' })
    // 等 hydration：.js 是 App 挂载后才加上的
    await page.waitForFunction(() => document.documentElement.classList.contains('js'), { timeout: 15000 })
    await page.waitForTimeout(900)
    // 把所有滚动揭示强行打开，否则 clip-path 内的文字照样在 DOM 里但可能未渲染伪元素
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('[data-reveal]')) el.classList.add('is-in')
    })
    await page.waitForTimeout(200)
    const got = await page.evaluate(collect)
    for (const [key, text] of Object.entries(got)) {
      const [fam, weight] = key.split('|')
      const bucket = BUCKET[fam]
      if (!bucket) continue
      const name = bucket
      const set = buckets.get(name) || new Set()
      for (const ch of text) set.add(ch)
      buckets.set(name, set)
    }
    await page.close()
  }
}
await browser.close()

// 兜底字符：这些不一定出现在当前 DOM 里，但换行、省略号、日期分隔符随时会用到
// 破折号一个都不给：全站禁用（audit G18），子集里留着只会有人手滑用上。
const ALWAYS = {
  // v10 起 display 桶是 Fraunces（纯拉丁衬线）。中日韩标点照样收进来：
  // --font-display 是混排栈，汉字逐字回落到系统黑体，收了也只是空转，
  // 但漏收就会在换字体时少一批标点。× 是「4,684 star × 502 fork」那种读数用的。
  display: '，。、·…「」（）？！0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,%×',
  mono: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;/·→+-%★⑂ ',
  hand: '，。、·…「」（）0123456789',
}

// 每个桶都必须落一个文件：子集脚本按固定表找 chars/*.txt，缺一个就整条管线退出。
for (const name of Object.keys(ALWAYS)) if (!buckets.has(name)) buckets.set(name, new Set())

await mkdir(OUT, { recursive: true })
const rows = []
for (const [name, set] of buckets) {
  for (const ch of ALWAYS[name] || '') set.add(ch)
  const chars = [...set].sort().join('')
  await writeFile(path.join(OUT, `${name}.txt`), chars)
  rows.push([name, set.size])
}
rows.sort()
for (const [name, n] of rows) console.log(`chars: ${name.padEnd(14)} ${String(n).padStart(5)} 字`)
process.exit(0)
