#!/usr/bin/env node
/**
 * 「一物两读」体素字雕的数据生成器。
 *
 * 产物是 src/gen/sculpt.json，里面只有两张二维掩膜（base64 位域，各几百字节）、
 * 两条剪影路径与一份保真度报告。**体素实体不在 JSON 里** —— 它由 src/lib/sculpt.ts
 * 在运行时从掩膜现推：solid(x,y,z) = A(x,y) ∧ B(z,y)。
 *
 * 为什么不把体素表烘进 JSON：两万个体素 × 五个字段 ≈ 400 KB，而掩膜只有 1 KB，
 * 推导循环 25 万次不到 2 ms。把定义式留在运行时，还有一个额外好处 ——
 * 这件雕塑成立的理由是可读源码，不是一份不可复核的产物。
 *
 * 为什么栅格化要开浏览器：需要真实字体的真实字形轮廓。这一步只在本地跑，
 * 结果提交进仓库，CI 与线上构建都不需要字体文件，也不需要 Chromium。
 * 掩膜里记着用的是哪个字体文件与哪一档字重，换字要重跑并在 DESIGN.md 记一笔。
 *
 * 用法：
 *   node scripts/sculpt.mjs                 # 默认 40 行，写 src/gen/sculpt.json
 *   node scripts/sculpt.mjs --rows=48       # 换网格密度
 *   node scripts/sculpt.mjs --family="Microsoft YaHei" --weight=700
 *   node scripts/sculpt.mjs --report        # 只算不写，用来挑网格
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = path.join(ROOT, 'src', 'gen', 'sculpt.json')

const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : dflt
}
const REPORT_ONLY = process.argv.includes('--report')

/* 正面读「交付」，侧面读「维护」—— 首屏那句话的两个词。
   两个词都是两个满字身的汉字，字身带内每一行都有墨，这是双读能精确成立的前提。 */
const WORD_A = arg('a', '交付')
const WORD_B = arg('b', '维护')
const ROWS = Number(arg('rows', '40'))
/* 字重要够黑：交集实体的粗细是两个笔画宽的乘积，细笔画会交出一根根牙签。
   Noto Sans SC 是可变字体，900 档由 Chromium 现场定轴。 */
const FAMILY = arg('family', 'Noto Sans SC')
const WEIGHT = Number(arg('weight', '900'))
/* 栅格化字号。取 ROWS 的 12 倍做超采样，降采样时按覆盖率判墨，边缘更稳。 */
const PX = ROWS * 12

/* -------------------------------------------------------------- 栅格化 */

/** 在真实浏览器里把一个词画成 alpha 位图，返回 {w, h, alpha:Uint8Array}。 */
async function raster(page, word) {
  const b64 = await page.evaluate(
    ({ word, px, family, weight }) => {
      const pad = Math.ceil(px * 0.35)
      const probe = document.createElement('canvas').getContext('2d')
      probe.font = `${weight} ${px}px "${family}"`
      const w = Math.ceil(probe.measureText(word).width) + pad * 2
      const h = Math.ceil(px * 1.8)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d')
      g.font = `${weight} ${px}px "${family}"`
      g.textBaseline = 'alphabetic'
      g.fillStyle = '#000'
      g.fillText(word, pad, Math.round(px * 1.35))
      const d = g.getImageData(0, 0, w, h).data
      const a = new Uint8Array(w * h)
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]
      // 分块转 base64：String.fromCharCode 一次吃不下一百万个参数
      let s = ''
      const CH = 8192
      for (let i = 0; i < a.length; i += CH) s += String.fromCharCode(...a.subarray(i, i + CH))
      return { w, h, b64: btoa(s) }
    },
    { word, px: PX, family: FAMILY, weight: WEIGHT },
  )
  return { w: b64.w, h: b64.h, alpha: new Uint8Array(Buffer.from(b64.b64, 'base64')) }
}

/** 裁到墨的外接盒。 */
function inkBox({ w, h, alpha }) {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] < 128) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) throw new Error('栅格化没有得到任何墨：字体名或字重不对？')
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * 按覆盖率降采样成 ROWS 行的位掩膜。
 *
 * 两个词都先裁到自己的墨盒、再缩到**同样的行数**并对齐上下缘 —— 这是双读
 * 精确成立的关键：只有当 A 与 B 占据同一条字身带，rowA(y) 与 rowB(y) 才会
 * 处处为真，两个正交投影才等于原字形。
 */
function toMask(bmp, box, rows) {
  const scale = rows / box.h
  const cols = Math.max(1, Math.round(box.w * scale))
  const mask = new Uint8Array(cols * rows)
  const cw = box.w / cols
  const ch = box.h / rows
  for (let cy = 0; cy < rows; cy++) {
    const sy0 = box.y0 + cy * ch
    const sy1 = sy0 + ch
    for (let cx = 0; cx < cols; cx++) {
      const sx0 = box.x0 + cx * cw
      const sx1 = sx0 + cw
      let hit = 0
      let all = 0
      for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) {
        for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
          all++
          if (bmp.alpha[y * bmp.w + x] >= 128) hit++
        }
      }
      // 0.42 而不是 0.5：汉字的横画常常正好落在两格之间，阈值定 0.5 会把
      // 一整条横画抹掉，字就断了。0.42 是实测下来笔画连续、又不糊的那一档。
      if (all > 0 && hit / all >= 0.42) mask[cy * cols + cx] = 1
    }
  }
  return { cols, rows, mask }
}

/* -------------------------------------------------------------- 保真度 */

const rowHasInk = (m) => {
  const out = new Uint8Array(m.rows)
  for (let y = 0; y < m.rows; y++) {
    for (let x = 0; x < m.cols; x++) {
      if (m.mask[y * m.cols + x]) {
        out[y] = 1
        break
      }
    }
  }
  return out
}

/**
 * 双读保真度。
 *
 * solid(x,y,z) = A(x,y) ∧ B(z,y)。沿 Z 投影得 A(x,y) ∧ rowB(y)，
 * 沿 X 投影得 B(z,y) ∧ rowA(y)。这里逐格比对投影与原掩膜，返回吻合率。
 * 低于阈值说明两个词的字身带没对齐，字雕会缺横条 —— 构建期必须红。
 */
function fidelity(A, B) {
  const rb = rowHasInk(B)
  const ra = rowHasInk(A)
  const score = (m, keep) => {
    let ink = 0
    let same = 0
    for (let y = 0; y < m.rows; y++) {
      for (let x = 0; x < m.cols; x++) {
        const v = m.mask[y * m.cols + x]
        if (!v) continue
        ink++
        if (keep[y]) same++
      }
    }
    return { ink, same, rate: ink ? same / ink : 0 }
  }
  return { a: score(A, rb), b: score(B, ra) }
}

/* -------------------------------------------------------------- 统计实体 */

/** 只做统计，给挑网格用；运行时的实体由 src/lib/sculpt.ts 现推。 */
function solidStats(A, B) {
  const nx = A.cols
  const ny = A.rows
  const nz = B.cols
  const at = (x, y, z) => (A.mask[y * nx + x] && B.mask[y * nz + z] ? 1 : 0)
  let solid = 0
  let surface = 0
  let faces = 0
  const N = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]
  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        if (!at(x, y, z)) continue
        solid++
        let open = 0
        for (const [dx, dy, dz] of N) {
          const nx2 = x + dx
          const ny2 = y + dy
          const nz2 = z + dz
          const outside =
            nx2 < 0 || nx2 >= nx || ny2 < 0 || ny2 >= ny || nz2 < 0 || nz2 >= nz
          if (outside || !at(nx2, ny2, nz2)) open++
        }
        if (open) surface++
        faces += open
      }
    }
  }
  return { dims: [nx, ny, nz], solid, surface, faces }
}

/* -------------------------------------------------------------- 剪影路径 */

/**
 * 掩膜 → 单条 SVG path，用矩形分解压条数。
 *
 * SSR 静态层要画的就是这条路径。逐格出 rect 会有一两千条，路径字符串三十多 KB；
 * 先横向并行、再纵向吃掉同宽的相邻行，条数掉到一两百，路径不到 4 KB。
 * 砖缝不靠路径画，靠一层 pattern 网格叠在剪影里，见 index.css。
 */
function maskPath(m) {
  const used = new Uint8Array(m.cols * m.rows)
  const parts = []
  for (let y = 0; y < m.rows; y++) {
    let x = 0
    while (x < m.cols) {
      if (!m.mask[y * m.cols + x] || used[y * m.cols + x]) {
        x++
        continue
      }
      let w = 0
      while (x + w < m.cols && m.mask[y * m.cols + x + w] && !used[y * m.cols + x + w]) w++
      // 往下吃：同一段 x 区间连续为墨且未被占，就并进同一个矩形
      let h = 1
      grow: while (y + h < m.rows) {
        for (let k = 0; k < w; k++) {
          const i = (y + h) * m.cols + x + k
          if (!m.mask[i] || used[i]) break grow
        }
        h++
      }
      for (let dy = 0; dy < h; dy++) for (let k = 0; k < w; k++) used[(y + dy) * m.cols + x + k] = 1
      parts.push(`M${x} ${y}h${w}v${h}h${-w}Z`)
      x += w
    }
  }
  return parts.join('')
}

/**
 * 掩膜 → 轮廓路径。
 *
 * 不能拿上面那条填充路径去描边：它是矩形分解的产物，一描边就把每个矩形的
 * 四条边都描出来，字上糊满一层格子（实测踩过，静态层整块变成黄色栅栏）。
 * 真轮廓要单独求：只取「实心格与空格之间」的那些单位边，再把同向共线的
 * 相邻边并成一条长线。这才是 3D 层里那圈「只染棱」的二维对应物。
 */
function maskOutline(m) {
  const on = (u, v) => u >= 0 && u < m.cols && v >= 0 && v < m.rows && m.mask[v * m.cols + u] === 1
  const parts = []

  // 横向边：逐行扫，把连续同状态的边并起来
  for (let v = 0; v <= m.rows; v++) {
    let run = -1
    for (let u = 0; u <= m.cols; u++) {
      // 该处上下异色才有边
      const edge = u < m.cols && on(u, v - 1) !== on(u, v)
      if (edge && run < 0) run = u
      if (!edge && run >= 0) {
        parts.push(`M${run} ${v}H${u}`)
        run = -1
      }
    }
  }

  // 纵向边
  for (let u = 0; u <= m.cols; u++) {
    let run = -1
    for (let v = 0; v <= m.rows; v++) {
      const edge = v < m.rows && on(u - 1, v) !== on(u, v)
      if (edge && run < 0) run = v
      if (!edge && run >= 0) {
        parts.push(`M${u} ${run}V${v}`)
        run = -1
      }
    }
  }

  return parts.join('')
}

const packBits = (m) => {
  const out = new Uint8Array(Math.ceil(m.mask.length / 8))
  for (let i = 0; i < m.mask.length; i++) if (m.mask[i]) out[i >> 3] |= 1 << (i & 7)
  return Buffer.from(out).toString('base64')
}

/* -------------------------------------------------------------- 主流程 */

const browser = await chromium.launch()
const page = await browser.newPage()

const bmpA = await raster(page, WORD_A)
const bmpB = await raster(page, WORD_B)
await browser.close()

const A = toMask(bmpA, inkBox(bmpA), ROWS)
const B = toMask(bmpB, inkBox(bmpB), ROWS)

const fid = fidelity(A, B)
const stats = solidStats(A, B)

const pct = (n) => (n * 100).toFixed(2) + '%'
console.log(`字雕网格   ${stats.dims.join(' × ')}  (x=${WORD_A} · z=${WORD_B} · ${ROWS} 行)`)
console.log(`字体       ${FAMILY} ${WEIGHT}  @ ${PX}px 栅格`)
console.log(`掩膜墨格   A ${fid.a.ink}   B ${fid.b.ink}`)
console.log(`实体体素   ${stats.solid}   可见表面 ${stats.surface}   暴露面 ${stats.faces}`)
console.log(`双读保真   正面「${WORD_A}」${pct(fid.a.rate)}   侧面「${WORD_B}」${pct(fid.b.rate)}`)

if (fid.a.rate < 0.99 || fid.b.rate < 0.99) {
  console.error('\n双读保真度低于 99%：两个词的字身带没对齐，字雕会缺横条。')
  process.exit(1)
}

if (REPORT_ONLY) {
  console.log('\n--report：只算不写。')
  process.exit(0)
}

const json = {
  note: '由 scripts/sculpt.mjs 生成，不要手改。体素实体在运行时由 src/lib/sculpt.ts 现推。',
  formula: 'solid(x,y,z) = A(x,y) ∧ B(z,y)',
  wordA: WORD_A,
  wordB: WORD_B,
  rows: ROWS,
  colsA: A.cols,
  colsB: B.cols,
  maskA: packBits(A),
  maskB: packBits(B),
  pathA: maskPath(A),
  pathB: maskPath(B),
  outlineA: maskOutline(A),
  outlineB: maskOutline(B),
  fidelity: { a: +fid.a.rate.toFixed(4), b: +fid.b.rate.toFixed(4) },
  stats: { solid: stats.solid, surface: stats.surface },
  source: { family: FAMILY, weight: WEIGHT, rasterPx: PX, threshold: 0.42 },
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(json, null, 2) + '\n')
const kb = (fs.statSync(OUT).size / 1024).toFixed(1)
console.log(`\n写出 src/gen/sculpt.json  ${kb} KB`)
