#!/usr/bin/env node
/* 字体流水线：采字 → 定轴 → 子集 → 校预算。 */

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
const BASE = arg('base', 'http://127.0.0.1:4178')

/**
 * 路由表从 src/router.tsx 里现读，不在这儿抄第二份。
 *
 * 抄一份的代价实测过：加了两条案例子页，而这里还停在四条，
 * 于是那两页独有的字一个都没进子集 —— 页面上就会出现
 *「一个标题里有些字是得意黑（粗），有些回落到系统字（细）」。
 * static.mjs 与 verify.mjs 早就是现读的，这里补上。
 */
const routerSrc = fs.readFileSync(path.join(ROOT, 'src/router.tsx'), 'utf8')
const routesLine = routerSrc.match(/export const ROUTES[^=]*=\s*\[([\s\S]*?)\]/)
if (!routesLine) {
  console.error('fonts: 没在 src/router.tsx 里找到 ROUTES')
  process.exit(1)
}
const ROUTES = [...routesLine[1].matchAll(/'([^']+)'/g)].map((m) => m[1])

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

/* 逐文本节点采字。 */
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

  // 缺失态不在可索引路由表里，但客户端 fallback 仍会展示它；单独采字，
  // 避免「页面不存在 / 首页」等字只在错误页回落到系统字体。
  await page.evaluate((url) => {
    history.pushState(null, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, BASE.replace(/\/$/, '') + '/missing/')
  await page.locator('.cpage__miss h1').waitFor()
  const missing = await page.evaluate(COLLECT)
  for (const k of Object.keys(bag)) bag[k] += missing[k]

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

/* 600 档的字表并进 400 档。 */
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
