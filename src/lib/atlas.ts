/**
 * 星图布局。SVG 降级图与 WebGL 实时图共用这一份确定性布局：
 * 同一个 mulberry32 种子 → 同一串坐标 → 首帧静态图和点火后的 3D
 * 是同一张图的两个视图，不是「示意图 vs 真图」（v5 图版纪律的延伸）。
 *
 * 坐标系：y 向上。核心在原点，五枚主力仓库在内环，其余原创仓库散在外盘，
 * 四组在线小站各占一条倾斜的轨道。固定视角 VIEW_RX / VIEW_Y 与 3D 场景
 * 点火时的相机方位一致，所以换层的那一帧不跳。
 */

import { atlasRepos, garden } from '../content/site'

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

/* ------------------------------------------------------------ 布局 */

export type Vec3 = [number, number, number]

export type StarNode = {
  id: string
  name: string
  /** 图上短名：内环只有 ~130px 周长放不下全名，全名留给 tooltip 与 <title> */
  label: string
  stars: number
  href: string
  /** 节点半径（世界单位） */
  r: number
  pos: Vec3
  /** 有标签的是主力仓库；小节点靠悬停出名字 */
  labeled: boolean
}

export type OrbitRing = {
  group: string
  ring: string
  radius: number
  tiltX: number
  rotZ: number
  dots: { name: string; href: string; pos: Vec3; angle: number }[]
}

/** 内环五枚主力的图上短名。全名在 tooltip / <title> / 案例章里。 */
const SHORT: Record<string, string> = {
  'lofi-radio-web': 'lofi',
  'computer-repair-skill': 'repair',
  'gzh-design-skill': 'gzh',
  'diataxis-docs-skill': 'diataxis',
  'wesum-wechat-monitor': 'wesum',
}

/** projects 里的六个主力减去 video_vip（它是核心）= 五枚内环标签节点。 */
const PRIMARY_NAMES = new Set(Object.keys(SHORT))

const rStar = (stars: number, hub: number) => 0.085 + 0.055 * (Math.log2(1 + stars) / Math.log2(1 + hub))

const rotXZ = (p: Vec3, rx: number, rz: number): Vec3 => {
  const [x, y, z] = p
  const cy = Math.cos(rx)
  const sy = Math.sin(rx)
  const y1 = y * cy - z * sy
  const z1 = y * sy + z * cy
  const cz = Math.cos(rz)
  const sz = Math.sin(rz)
  return [x * cz - y1 * sz, x * sz + y1 * cz, z1]
}

const ORBIT_R = [2.55, 2.92, 3.29, 3.66]
const ORBIT_TX = [0.42, -0.28, 0.18, -0.5]
const ORBIT_RZ = [0.3, -0.52, 0.62, -0.18]
const ORBIT_LABEL = ['FX', 'TOOLS', 'MEDIA', 'WIDGETS']
const ORBIT_GROUP = ['特效', '工具', '内容', '组件']

export type AtlasLayout = {
  hub: StarNode
  primaries: StarNode[]
  minors: StarNode[]
  orbits: OrbitRing[]
}

let cached: AtlasLayout | null = null

export function atlasLayout(): AtlasLayout {
  if (cached) return cached

  const hub: StarNode = {
    id: 'hub',
    name: 'video_vip',
    label: 'video_vip',
    stars: 4642,
    href: 'https://github.com/88lin/video_vip',
    r: 0.3,
    pos: [0, 0, 0],
    labeled: true,
  }

  const primaries: StarNode[] = []
  const minors: StarNode[] = []

  atlasRepos.forEach((repo, i) => {
    const r1 = rng(seedOf('star:' + repo.name))
    const href = 'https://github.com/88lin/' + repo.name
    if (PRIMARY_NAMES.has(repo.name)) {
      const k = primaries.length
      const a = (k / 5) * Math.PI * 2 + (r1() - 0.5) * 0.5
      const rad = 1.16 + (r1() - 0.5) * 0.3
      primaries.push({
        id: repo.name,
        name: repo.name,
        label: SHORT[repo.name],
        stars: repo.stars,
        href,
        r: 0.1 + 0.045 * (Math.log2(1 + repo.stars) / Math.log2(1 + 88)),
        pos: [Math.cos(a) * rad, (r1() - 0.5) * 0.62, Math.sin(a) * rad],
        labeled: true,
      })
    } else {
      const a = r1() * Math.PI * 2
      const rad = 1.82 + r1() * 0.62
      minors.push({
        id: repo.name,
        name: repo.name,
        label: repo.name,
        stars: repo.stars,
        href,
        r: 0.035 + rStar(repo.stars, 88) * 0.35,
        pos: [Math.cos(a) * rad, (r1() - 0.5) * 1.5, Math.sin(a) * rad],
        labeled: false,
      })
    }
    void i
  })

  const orbits: OrbitRing[] = ORBIT_GROUP.map((group, gi) => {
    const r2 = rng(seedOf('orbit:' + group))
    const items = garden.filter((g) => g.group === group)
    return {
      group,
      ring: ORBIT_LABEL[gi],
      radius: ORBIT_R[gi],
      tiltX: ORBIT_TX[gi],
      rotZ: ORBIT_RZ[gi],
      dots: items.map((it, j) => {
        const angle = (j / items.length) * Math.PI * 2 + r2() * 0.16
        const rad = ORBIT_R[gi] * (0.985 + r2() * 0.03)
        const flat: Vec3 = [Math.cos(angle) * rad, 0, Math.sin(angle) * rad]
        return { name: it.name, href: it.href, pos: rotXZ(flat, ORBIT_TX[gi], ORBIT_RZ[gi]), angle }
      }),
    }
  })

  cached = { hub, primaries, minors, orbits }
  return cached
}

/* ------------------------------------------------------------ 投影（SVG 用） */

/** 固定视角。与 3D 点火时的相机方位一致：换层不跳。 */
export const VIEW_RX = -0.34
export const VIEW_RY = 0.62

export type Proj = { x: number; y: number; depth: number }

const F = 6.4

/** 透视投影到 [-1,1]²，depth 越大离镜头越近（用于排序与前后淡出）。 */
export function project(p: Vec3, rx = VIEW_RX, ry = VIEW_RY): Proj {
  const [x0, y0, z0] = p
  const cyy = Math.cos(ry)
  const syy = Math.sin(ry)
  const x1 = x0 * cyy - z0 * syy
  const z1 = x0 * syy + z0 * cyy
  const cxx = Math.cos(rx)
  const sxx = Math.sin(rx)
  const y2 = y0 * cxx - z1 * sxx
  const z2 = y0 * sxx + z1 * cxx
  const s = F / (F - z2)
  return { x: x1 * s, y: -y2 * s, depth: z2 }
}

/** 轨道圆在固定视角下的椭圆采样（SVG path 用）。 */
export function orbitPath(ring: OrbitRing, steps = 72): string {
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const flat: Vec3 = [Math.cos(a) * ring.radius, 0, Math.sin(a) * ring.radius]
    const p = project(rotXZ(flat, ring.tiltX, ring.rotZ))
    pts.push(`${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
  }
  return 'M ' + pts.join(' L ')
}

/** 轨道标签锚点：轨道外缘一点在固定视角下的投影。 */
export function orbitLabelAnchor(ring: OrbitRing, at = 0.35): Proj {
  const flat: Vec3 = [Math.cos(at) * ring.radius, 0, Math.sin(at) * ring.radius]
  return project(rotXZ(flat, ring.tiltX, ring.rotZ))
}

/** 主力标签的径向外推位（SVG 与避障共用同一份几何）。 */
export function primaryLabelPos(n: StarNode): { x: number; y: number; anchor: 'start' | 'end' | 'middle' } {
  const p = project(n.pos)
  const len = Math.hypot(p.x, p.y) || 1
  const ux = p.x / len
  const uy = p.y / len
  return {
    x: p.x + ux * (n.r + 0.4),
    y: p.y + uy * (n.r + 0.4) + 0.08,
    anchor: ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle',
  }
}

/**
 * 给四条轨道各选一个标签锚点：32 个候选角里挑「离所有障碍最远」的那个。
 * 障碍 = 主星标签、主星下标签、先选好的轨道标签。轨道有倾斜变换，
 * 角度与屏幕方位不是线性关系，手调等于抽奖；这里是确定性搜索，
 * SVG 与 3D 用同一份结果。
 */
export function orbitLabelPoints(
  orbits: OrbitRing[],
  hubLabelPos: { x: number; y: number },
  primaries: StarNode[],
): { angle: number; p: Proj }[] {
  const R = 0.85 // 每个障碍的虚拟占位半径（用户单位，约等于一截标签的宽度）
  const obstacles: { x: number; y: number; r: number }[] = primaries.map((n) => ({
    x: primaryLabelPos(n).x,
    y: primaryLabelPos(n).y,
    r: R,
  }))
  obstacles.push({ x: hubLabelPos.x, y: hubLabelPos.y, r: 0.9 })
  const chosen: { angle: number; p: Proj }[] = []
  orbits.forEach((o) => {
    let best: { angle: number; p: Proj } | null = null
    let bestScore = -1
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2
      const p = orbitLabelAnchor(o, a)
      const dist = Math.hypot(p.x, p.y)
      if (dist < o.radius * 0.92) continue // 必须贴在轨道外缘
      let score = 1e9
      for (const ob of obstacles) score = Math.min(score, Math.hypot(p.x - ob.x, p.y - ob.y) - ob.r)
      if (score > bestScore) {
        bestScore = score
        best = { angle: a, p }
      }
    }
    const pick = best ?? { angle: 0.35, p: orbitLabelAnchor(o) }
    chosen.push(pick)
    obstacles.push({ x: pick.p.x, y: pick.p.y, r: R })
  })
  return chosen
}

/** 全图在固定视角下的投影包围盒（SVG viewBox 用，SSR 确定性计算）。 */
export function atlasBounds() {
  const { hub, primaries, minors, orbits } = atlasLayout()
  let minX = -1
  let maxX = 1
  let minY = -1
  let maxY = 1
  const eat = (p: Proj, r: number) => {
    minX = Math.min(minX, p.x - r)
    maxX = Math.max(maxX, p.x + r)
    minY = Math.min(minY, p.y - r)
    maxY = Math.max(maxY, p.y + r)
  }
  eat(project(hub.pos), hub.r * 1.6)
  primaries.forEach((n) => eat(project(n.pos), n.r * 2))
  minors.forEach((n) => eat(project(n.pos), n.r * 3))
  orbits.forEach((o) => {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const flat: Vec3 = [Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius]
      eat(project(rotXZ(flat, o.tiltX, o.rotZ)), 0.05)
    }
  })
  // 给四周的标签留呼吸
  const padX = (maxX - minX) * 0.09
  const padY = (maxY - minY) * 0.09
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY }
}

export const ORBIT_TINTS = ['coral', 'blue', 'yellow', 'ink'] as const
export type OrbitTint = (typeof ORBIT_TINTS)[number]
