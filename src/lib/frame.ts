/**
 * 手绘虚线框 / 圈注的路径生成器。
 *
 * 为什么自己写而不是画个 CSS dashed border：CSS 的虚线框四条边一样直、
 * 拐角一样方，一眼就是 border 属性。真手绘的框每条边都会抖、会过冲、
 * 会在收笔处翘一点。这里用一个带种子的确定性 PRNG 给控制点加抖动，
 * 同一个 seed 永远画出同一个框（SSR 与水合必须一致，否则 React 会报错），
 * 不同 seed 画出来的框互不相同。
 *
 * 只做几何，不做插画：它的职责是把某个东西框起来并命名，不是画画。
 */

/** mulberry32：32 位种子的小型确定性 PRNG，够用且不引依赖。 */
const rng = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 把字符串折成一个整数种子，让调用方可以用语义化的 key。 */
export const seedOf = (key: string) => {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

type Pt = [number, number]

const catmullToBezier = (pts: Pt[], close: boolean) => {
  const n = pts.length
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  const last = close ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i % n]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return close ? d + ' Z' : d
}

/**
 * 手绘矩形框。返回 viewBox 为 0 0 100 100 的路径，交给 SVG 的
 * preserveAspectRatio="none" 去贴合任意尺寸——非等比拉伸会让描边变形，
 * 所以描边用 vector-effect: non-scaling-stroke 保持粗细一致。
 */
/* jitter 是 viewBox 百分比，会被非等比拉伸放大：一个 620px 宽的框，2.4 就是
   ±15px 的横向摆幅，抖到内距里去，线会压到字上。1.4 是实测下来手绘感还在、
   最大摆幅仍小于 .frame 横向内距的上限。 */
export const handFrame = (key: string, jitter = 1.4) => {
  const r = rng(seedOf(key))
  const j = () => (r() - 0.5) * 2 * jitter
  const per = 4 // 每条边取 4 个采样点
  const pts: Pt[] = []
  const corners: Pt[] = [
    [3, 3],
    [97, 3],
    [97, 97],
    [3, 97],
  ]
  for (let c = 0; c < 4; c++) {
    const a = corners[c]
    const b = corners[(c + 1) % 4]
    for (let i = 0; i < per; i++) {
      const t = i / per
      pts.push([a[0] + (b[0] - a[0]) * t + j(), a[1] + (b[1] - a[1]) * t + j()])
    }
  }
  return catmullToBezier(pts, true)
}

/**
 * 手绘椭圆圈注，起笔与收笔错开并过冲一点——真用马克笔圈东西就是这样，
 * 收不回原点。用两圈叠加时把 `pass` 设为 1，第二圈会自动错开。
 */
export const handCircle = (key: string, pass = 0, jitter = 3.2) => {
  const r = rng(seedOf(key + ':' + pass))
  const steps = 16
  const start = -0.42 + (r() - 0.5) * 0.2
  const sweep = Math.PI * 2 + 0.36 + r() * 0.34 // 过冲
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = start + sweep * t
    const rx = 49 + (r() - 0.5) * jitter
    const ry = 47 + (r() - 0.5) * jitter
    pts.push([50 + Math.cos(a) * rx, 50 + Math.sin(a) * ry])
  }
  return catmullToBezier(pts, false)
}

/** 手绘引线：从标签指向被标注对象，带一点弧度。 */
export const handLead = (key: string) => {
  const r = rng(seedOf(key + ':lead'))
  const bow = 8 + r() * 10
  return `M 2 50 Q ${30 + r() * 20} ${50 - bow}, 98 ${34 + r() * 22}`
}

/** 标注层用色，按 seed 在四个语义角色里轮换，避免整页一个颜色。 */
export const ANNOT_COLORS = [
  'var(--brand)',
  'var(--pop)',
  'var(--brand-deep)',
  'var(--highlight)',
] as const

export const annotColor = (key: string) => ANNOT_COLORS[seedOf(key) % ANNOT_COLORS.length]
