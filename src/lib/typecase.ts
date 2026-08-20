/**
 * 铸字盘布局。SVG 静态层与 WebGL 实时层共用这一份确定性数据：
 * 同一个种子 → 同一盘字 —— 首帧静态图与点火后的 3D 是同一盘字的两个视图
 * （v5 图版纪律、v11 星图双层的延续）。
 *
 * 盘面 6 列 × 3 行，铸的是首屏论点的 18 个字（标点不占字位）。字面颜色与
 * 标题里的批注一一对应：荧光笔扫过的「交付」上黄面，朱笔圈住的「维护」
 * 上朱面，两枚拉丁字母上墨面 —— 字盘不是插图，是标题的排印底稿。
 */

/* ------------------------------------------------------------ 确定性随机 */

const rng = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const seedOf = (key: string) => {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* ------------------------------------------------------------ 字面 */

export type SlugFace = 'paper' | 'mark' | 'pop' | 'ink'

export type Slug = {
  ch: string
  face: SlugFace
  /** 这个字属于哪个词（悬停提示用） */
  word: string
  col: number
  row: number
  /** 手排抖动：旋转（弧度）与位移（字格单位）。真字盘里的字不是机器对齐的 */
  rot: number
  dx: number
  dy: number
}

export const CASE_COLS = 6
export const CASE_ROWS = 3

/** 首屏论点去标点后的 18 字，按阅读顺序从左到右、从上到下排盘。 */
const TEXT = '把前沿AI变成可交付可维护的工程结果'

/** 每个字所属的词。字盘 tooltip 说「词」，不说单字 —— 单字没有信息。 */
const WORD_OF: Record<string, string> = {
  把: '把',
  前: '前沿',
  沿: '前沿',
  A: 'AI',
  I: 'AI',
  变: '变成',
  成: '变成',
  交: '可交付',
  付: '可交付',
  维: '可维护',
  护: '可维护',
  的: '的',
  工: '工程',
  程: '工程',
  结: '结果',
  果: '结果',
}

const FACE_OF: Record<string, SlugFace> = {
  交: 'mark',
  付: 'mark',
  维: 'pop',
  护: 'pop',
  A: 'ink',
  I: 'ink',
}

/** 「可」出现两次，word 归并到各自所在的词。 */
const wordAt = (ch: string, i: number) => {
  if (ch === '可') return i < 10 ? '可交付' : '可维护'
  return WORD_OF[ch] ?? ch
}

let cached: Slug[] | null = null

export function caseLayout(): Slug[] {
  if (cached) return cached
  const chars = Array.from(TEXT)
  cached = chars.map((ch, i) => {
    const r = rng(seedOf('slug:' + ch + ':' + i))
    return {
      ch,
      face: FACE_OF[ch] ?? 'paper',
      word: wordAt(ch, i),
      col: i % CASE_COLS,
      row: Math.floor(i / CASE_COLS),
      rot: (r() - 0.5) * 0.04, // ±1.1°，手排感
      dx: (r() - 0.5) * 0.036,
      dy: (r() - 0.5) * 0.036,
    }
  })
  return cached
}

/* ------------------------------------------------------------ 几何常量
   SVG 与 WebGL 共用：字格 1×1，字面内缩，字身厚度 0.42。 */

export const CELL = 1
export const FACE = 0.84
export const SLUG_DEPTH = 0.42
export const BEVEL = 0.055

/** 盘面外尺寸（字格单位），含字盘边框。 */
export const CASE_PAD = 0.34
export const CASE_W = CASE_COLS * CELL + CASE_PAD * 2
export const CASE_H = CASE_ROWS * CELL + CASE_PAD * 2

/* ------------------------------------------------------------ 颜色
   与 palettes.css A 组逐值对应（canvas / SVG 属性里读不到 CSS 变量，
   改动要两头改）。字面四色 = 纸 / 荧光笔 / 朱笔 / 墨。 */

export const FACE_COLOR: Record<SlugFace, { bg: string; fg: string }> = {
  paper: { bg: '#FEFCF6', fg: '#1A1A2E' },
  mark: { bg: '#F4D758', fg: '#1A1A2E' },
  pop: { bg: '#E84A5F', fg: '#FEFCF6' },
  ink: { bg: '#1A1A2E', fg: '#FEFCF6' },
}

/** 字身（铅）与字盘（墨线框架示意）。 */
export const BODY_COLOR = '#4A4A5A'
export const TRAY_COLOR = '#FAF6EB'
export const TRAY_LINE = '#1A1A2E'
