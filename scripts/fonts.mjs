#!/usr/bin/env node
/**
 * 字体流水线：采字 → 定轴 → 子集 → 校预算。
 *
 * 为什么要采字而不是手写字表：手写的表永远会漏。这里用真浏览器把五条路由
 * 都渲一遍，逐个文本节点读 `getComputedStyle().fontFamily`，按**实际生效的
 * 字族**把字符分桶。改一句文案、加一章内容，重跑一次就对了。
 *
 * 三条不肯让步的规则（沿用 v10 的判断）：
 *  1) **定轴**。Noto Sans SC 是可变字体，直接子集会把整条 wght 轴带上，
 *     光轴数据就几百 KB。每个 @font-face 只要一个字重，所以先 instancer
 *     定死，再子集。
 *  2) **两档分开**。400 与 600 是两个文件、两套字符集；600 只排小标题与按钮，
 *     字数是正文的零头，合并只会让首屏多下载几十 KB。
 *  3) **CJK 不预加载**，全部 font-display: swap，先用系统字顶上。
 *     预加载上百 KB 的中日韩字体会直接把 LCP 拖过 2.5s。
 *
 * 源字体不进仓库（几 MB），放在 .shots/fontsrc/ 下，缺了就报错并告诉你去哪拿。
 * 产物（public/fonts/*.woff2）进仓库，构建与 CI 不需要源文件。
 *
 * 用法：
 *   npm run dev                      # 另开一个终端
 *   node scripts/fonts.mjs           # 默认打 http://localhost:5199
 *   node scripts/fonts.mjs --base=http://localhost:4173
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SRC = path.join(ROOT, '.shots', 'fontsrc')
const OUT = path.join(ROOT, 'public', 'fonts')
const CHARS = path.join(ROOT, 'scripts', 'chars')

const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`))
  return hit ? hit.slice(n.length + 3) : d
}
const BASE = arg('base', 'http://localhost:5199')

/** 与 src/router.tsx 的 ROUTES 一致。少一条就会漏掉那一页独有的字。 */
const ROUTES = ['/', '/case/lofi/', '/case/repair/', '/case/facetmark/', '/case/video-vip/']

/** 源字体。缺哪个报哪个，并写清去哪拿 —— 三个月后的我不会记得。 */
const SOURCES = {
  smiley: {
    file: path.join(SRC, 'SmileySans-Oblique.ttf'),
    from: 'https://github.com/atelier-anchor/smiley-sans/releases  → smiley-sans-v2.0.1.zip',
  },
  noto: {
    file: path.join(SRC, 'NotoSansSC-VF.ttf'),
    from: 'https://github.com/notofonts/noto-cjk/releases（或 Windows 自带 C:/Windows/Fonts/NotoSansSC-VF.ttf）',
  },
}

/* ------------------------------------------------------------------ 采字 */

/**
 * 逐文本节点采字。
 *
 * 只看 `fontFamily` 的第一个字族：CSS 里 --font-display 的栈是
 * 'Smiley Display', 系统字…，所以第一个字族就是这段文字**想用**的那个。
 * 汉字若不在子集里会逐字回落，但那是子集缺字的结果，不该反过来影响分桶。
 */
const COLLECT = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const out = { display: '', sans400: '', sans600: '', mono: '' }
  const push = (k, s) => {
    out[k] += s
  }
  let node
  while ((node = walker.nextNode())) {
    const text = node.nodeValue || ''
    if (!text.trim()) continue
    const el = node.parentElement
    if (!el) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const first = (cs.fontFamily.split(',')[0] || '').replace(/['"]/g, '').trim()
    const w = parseInt(cs.fontWeight, 10) || 400
    if (first === 'Smiley Display') push('display', text)
    else if (/mono|Menlo|Consolas|SFMono/i.test(cs.fontFamily)) push('mono', text)
    else push(w >= 550 ? 'sans600' : 'sans400', text)
  }
  return out
}

const uniq = (s) => {
  const set = new Set()
  for (const ch of s) {
    const c = ch.codePointAt(0)
    // 控制字符与零宽不进字表
    if (c < 0x20 || c === 0x7f || (c >= 0x200b && c <= 0x200f)) continue
    set.add(ch)
  }
  return [...set].sort().join('')
}

async function collect() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const bag = { display: '', sans400: '', sans600: '', mono: '' }

  for (const r of ROUTES) {
    const url = BASE.replace(/\/$/, '') + r
    const res = await page.goto(url, { waitUntil: 'networkidle' })
    if (!res || res.status() >= 400) throw new Error(`${url} → HTTP ${res?.status()}；dev server 起了吗？`)
    // 入场动画会把区块留在 opacity:0，但文本节点仍在 DOM 里，采字不受影响。
    // 仍然滚一遍：横推轨等懒渲染的内容要进过视口才有节点。
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.6
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 60))
      }
      window.scrollTo(0, 0)
    })
    const got = await page.evaluate(COLLECT)
    for (const k of Object.keys(bag)) bag[k] += got[k]
  }

  await browser.close()
  for (const k of Object.keys(bag)) bag[k] = uniq(bag[k])
  return bag
}

/* ------------------------------------------------------------------ 子集 */

const py = (args) =>
  execFileSync('python', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    // Windows 控制台默认不是 UTF-8，不钉死这个变量，python 打回来的中文全是乱码
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    encoding: 'utf8',
  })

/** 可变字体先定轴：instancer 把 wght 钉死，轴数据才不会被一起带进子集。 */
function instance(src, wght, dst) {
  py(['-m', 'fontTools.varLib.instancer', src, `wght=${wght}`, '-o', dst])
  return dst
}

function subset(src, textFile, dst) {
  py([
    '-m',
    'fontTools.subset',
    src,
    `--text-file=${textFile}`,
    '--flavor=woff2',
    `--output-file=${dst}`,
    '--no-hinting',
    '--desubroutinize',
    '--drop-tables+=DSIG',
  ])
  return dst
}

/* ------------------------------------------------------------------ 主流程 */

for (const [k, v] of Object.entries(SOURCES)) {
  if (!fs.existsSync(v.file)) {
    console.error(`缺源字体：${path.relative(ROOT, v.file)}\n  去这里拿：${v.from}`)
    process.exit(1)
  }
}

fs.mkdirSync(CHARS, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

console.log(`采字：${ROUTES.length} 条路由 @ ${BASE}`)
const bag = await collect()

/*
  600 档的字表并进 400 档。
  理由：600 只排小标题与按钮，字几乎全是正文里已有的；但反过来不成立 ——
  400 档若缺了某个只在 600 出现过的字，那个字会掉到系统字，同一行里两种字形。
  所以 400 收全集，600 只收自己的。
*/
const jobs = [
  { name: 'display', chars: bag.display, file: 'SmileySans.woff2' },
  { name: 'sans400', chars: uniq(bag.sans400 + bag.sans600), file: 'NotoSansSC-400.woff2', wght: 400 },
  { name: 'sans600', chars: bag.sans600, file: 'NotoSansSC-600.woff2', wght: 600 },
]

for (const j of jobs) {
  console.log(`  ${j.name.padEnd(8)} ${j.chars.length} 字`)
  fs.writeFileSync(path.join(CHARS, `${j.name}.txt`), j.chars + '\n', 'utf8')
}
console.log(`  mono     ${bag.mono.length} 字（走系统等宽，不下发）`)

const tmp = path.join(SRC, '.tmp')
fs.mkdirSync(tmp, { recursive: true })

let total = 0
const report = []

for (const j of jobs) {
  const textFile = path.join(CHARS, `${j.name}.txt`)
  const dst = path.join(OUT, j.file)
  let src = j.name === 'display' ? SOURCES.smiley.file : SOURCES.noto.file
  if (j.wght) src = instance(src, j.wght, path.join(tmp, `noto-${j.wght}.ttf`))
  subset(src, textFile, dst)
  const kb = fs.statSync(dst).size / 1024
  total += kb
  report.push(`  ${j.file.padEnd(22)} ${kb.toFixed(1)} KB  (${j.chars.length} 字)`)
}

fs.rmSync(tmp, { recursive: true, force: true })

console.log('\n产物：')
report.forEach((r) => console.log(r))
console.log(`\n合计 ${total.toFixed(1)} KB / 预算 200 KB`)

/* 预算是硬的。超了就非零退出 —— 字体一旦失控，LCP 跟着走。 */
if (total > 200) {
  console.error('\n超预算。要么砍一档字重，要么减文案。')
  process.exit(1)
}

/* 逐个校验零缺字：子集少一个字，页面上就会有一个字掉回系统字，同行两种字形。 */
const verify = py([
  '-c',
  `
import io, sys
from fontTools.ttLib import TTFont
jobs = [('${jobs[0].file}', 'display'), ('${jobs[1].file}', 'sans400'), ('${jobs[2].file}', 'sans600')]
bad = 0
for f, c in jobs:
    font = TTFont('public/fonts/' + f)
    cmap = set()
    for t in font['cmap'].tables: cmap |= set(t.cmap.keys())
    need = io.open('scripts/chars/' + c + '.txt', encoding='utf-8').read().strip()
    miss = [ch for ch in need if ord(ch) not in cmap]
    print(f + ': ' + ('缺 ' + ''.join(miss) if miss else '零缺字'))
    bad += len(miss)
sys.exit(1 if bad else 0)
`,
])
console.log('\n校验：')
console.log(
  verify
    .trim()
    .split('\n')
    .map((l) => '  ' + l)
    .join('\n'),
)
