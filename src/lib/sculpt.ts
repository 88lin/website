/**
 * 一物两读体素字雕：从两张掩膜现推实体，再交出「暴露面」实例表。
 *
 * 定义式只有一行：
 *
 *   solid(x, y, z) = A(x, y) ∧ B(z, y)
 *
 * A 是「交付」的正视掩膜，B 是「维护」的侧视掩膜。沿 Z 看到的剪影是
 * A ∧ rowB，沿 X 看到的是 B ∧ rowA；两个词都被归一到同一条字身带，
 * 所以 rowA / rowB 处处为真，两个剪影**逐格等于原字形**。构建期
 * （scripts/sculpt.mjs）算过这个吻合率并写进 JSON，审计关会复核。
 *
 * 渲染的不是体素，是**暴露面**：一个体素平均只有不到一个面朝外，
 * 40,321 个体素只出 35,996 个面。按体素画立方体等于把六分之五的三角形
 * 画在实体内部再让深度测试丢掉。
 */

import data from '../gen/sculpt.json'

const unpack = (b64: string, count: number) => {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const out = new Uint8Array(count)
  for (let i = 0; i < count; i++) out[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1
  return out
}

export const sculpt = {
  wordA: data.wordA,
  wordB: data.wordB,
  rows: data.rows,
  colsA: data.colsA,
  colsB: data.colsB,
  pathA: data.pathA,
  pathB: data.pathB,
  /** 砖分辨率的真轮廓（实心格与空格之间的单位边），静态层描边用。 */
  outlineA: data.outlineA,
  outlineB: data.outlineB,
  formula: data.formula,
  fidelity: data.fidelity,
  source: data.source,
}

const A = unpack(data.maskA, data.colsA * data.rows)
/**
 * B 按列反向解包。
 *
 * 相机绕 Y 轴从 +Z 转到 +X：在 yaw=90° 那一格，屏幕右方是 **−Z**。
 * 若把 B 的列号直接当 z 用，「维护」会左右翻过来读成镜像。这里在解包时
 * 就把列翻掉，后面所有几何都不必再记这件事。
 * 二维剪影路径（pathB）不受影响：那是 SVG 直接按掩膜坐标画的。
 */
const B = (() => {
  const raw = unpack(data.maskB, data.colsB * data.rows)
  const out = new Uint8Array(raw.length)
  const c = data.colsB
  for (let y = 0; y < data.rows; y++) {
    for (let z = 0; z < c; z++) out[y * c + z] = raw[y * c + (c - 1 - z)]
  }
  return out
})()

const NX = data.colsA
const NY = data.rows
const NZ = data.colsB

const at = (x: number, y: number, z: number) =>
  x >= 0 && x < NX && y >= 0 && y < NY && z >= 0 && z < NZ && A[y * NX + x] === 1 && B[y * NZ + z] === 1

/** 二维掩膜的轮廓格：本格有墨、四邻至少一格无墨（或出界）。 */
const outline = (m: Uint8Array, cols: number, u: number, v: number) => {
  if (m[v * cols + u] !== 1) return false
  const off = (du: number, dv: number) => {
    const u2 = u + du
    const v2 = v + dv
    if (u2 < 0 || u2 >= cols || v2 < 0 || v2 >= NY) return true
    return m[v2 * cols + u2] !== 1
  }
  return off(1, 0) || off(-1, 0) || off(0, 1) || off(0, -1)
}

/** 面的语义角色。0 = 纸面；1 = 「交付」轮廓（黄）；2 = 「维护」轮廓（红）。 */
export const ROLE_PAPER = 0
export const ROLE_A = 1
export const ROLE_B = 2

const NORMALS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

export type Faces = {
  /** 实例数 */
  count: number
  /** 每面中心（模型空间，字高归一为 1，整体已居中） */
  cell: Float32Array
  /** 每面法向 */
  norm: Float32Array
  /** (role, ao)：ao 为 0–4，越大越深，用来压出凹处的暗 */
  meta: Float32Array
  /** 模型空间尺寸，相机拟合用 */
  size: { w: number; h: number; d: number }
}

/**
 * 建暴露面表。
 *
 * 角色只染「棱」：+Z / −Z 面落在「交付」二维轮廓上才染黄，±X 面落在
 * 「维护」轮廓上才染红。于是正读方向看到的是一圈一砖宽的黄边，侧读方向
 * 是一圈红边 —— 颜色带信息，它标的是这块砖在为哪一次阅读服务。
 * 这条正好接上设计系统既有的「卡面永远是纸，只染边、条与投影」。
 */
export function buildFaces(): Faces {
  const cells: number[] = []
  const norms: number[] = []
  const metas: number[] = []

  const s = 1 / NY // 归一：字高 = 1
  const cx = (NX - 1) / 2
  const cy = (NY - 1) / 2
  const cz = (NZ - 1) / 2
  /* 掩膜第 0 行是字的**顶**（栅格化是自上而下的），而模型空间 +Y 朝上，
     所以 y 要翻过来写成 (cy - y)。不翻的话整个词是倒的 —— 实测踩过。 */

  for (let y = 0; y < NY; y++) {
    for (let z = 0; z < NZ; z++) {
      for (let x = 0; x < NX; x++) {
        if (!at(x, y, z)) continue
        for (let n = 0; n < 6; n++) {
          const [dx, dy, dz] = NORMALS[n]
          if (at(x + dx, y + dy, z + dz)) continue

          let role = ROLE_PAPER
          if (dz !== 0 && outline(A, NX, x, y)) role = ROLE_A
          else if (dx !== 0 && outline(B, NZ, z, y)) role = ROLE_B

          // 凹陷遮蔽：数这个面外侧平面上四个切向邻居有几个是实心的。
          // 面越深陷在缝里，ao 越大，着色时压暗，形体就出来了，不用打光。
          let ao = 0
          for (let t = 0; t < 6; t++) {
            const [tx, ty, tz] = NORMALS[t]
            if (tx === dx && ty === dy && tz === dz) continue
            if (tx === -dx && ty === -dy && tz === -dz) continue
            if (at(x + dx + tx, y + dy + ty, z + dz + tz)) ao++
          }

          cells.push((x - cx) * s, (cy - y) * s, (z - cz) * s)
          norms.push(dx, dy, dz)
          metas.push(role, ao)
        }
      }
    }
  }

  return {
    count: metas.length / 2,
    cell: new Float32Array(cells),
    norm: new Float32Array(norms),
    meta: new Float32Array(metas),
    size: { w: NX * s, h: 1, d: NZ * s },
  }
}

/** 砖格边长（模型空间）。着色器画砖缝要用同一个数。 */
export const CELL = 1 / NY
