/**
 * 主线 / THE THREAD —— 全站唯一的 3D 元素。
 *
 * 它不是装饰窗口，也不是粒子噪点：一条有厚度的织带，从首屏入画，
 * 贯穿八章，在案例章打成一个结、再被抽开，最后从收束章出画。
 *
 * 四个刻意的取舍：
 *
 * 1) 截面只有三段（radialSegments = 3）。三角截面转起来一定有明暗面，
 *    读得出「带子」而不是「面条」；而且顶点数只有六边形截面的一半。
 * 2) 材质是 MeshStandardMaterial + flatShading，不用 envMap、不做辉光。
 *    环境贴图与后期是深色站的语言，这里明令不要深色。平涂大色块 + 硬转折
 *    在软件渲染下也读得出形，这是它能在低端设备上不翻车的原因。
 * 3) 打结不是运行时物理，是两组预先算好的控制点数组按进度逐点 lerp。
 *    成本可预期，结果可复现，段数还能整体降一档。
 * 4) 颜色不写死。四个色标从 palettes.css 的语义令牌里读出来，
 *    换配色只需要改 <html data-palette> 一个字母，3D 跟着换。
 */

import * as THREE from 'three'
import { signal } from '../lib/bus'
import { dprCap, type Tier } from '../lib/caps'

type Pt = { x: number; y: number; z: number }

const N = 24
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t: number) => t * t * (3 - 2 * t)

/** 拉直态：一条贯穿 X 轴的长蛇形，起伏不对称，避免看起来像正弦波装饰。 */
const straightPoints = (): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    out.push({
      x: -19 + t * 38,
      y: Math.sin(t * Math.PI * 2.15 + 0.4) * 2.7 + (t - 0.5) * 2.2,
      z: Math.cos(t * Math.PI * 1.7) * 2.4 - 1.2,
    })
  }
  return out
}

/** 打结态：中段 8..15 卷成两圈线圈，两侧按落差收敛回拉直态。 */
const knottedPoints = (base: Pt[]): Pt[] => {
  const a = 8
  const b = 15
  const c = base[11]
  const out = base.map((p) => ({ ...p }))
  for (let i = 0; i < N; i++) {
    if (i < a - 3 || i > b + 3) continue
    const u = clamp01((i - a) / (b - a))
    const ang = u * Math.PI * 4.2 + 0.6
    const coil: Pt = {
      x: c.x + (u - 0.5) * 4.6,
      y: c.y + Math.sin(ang) * 2.5,
      z: c.z + Math.cos(ang) * 2.5,
    }
    // 线圈之外三个控制点做过渡，否则结的两端会出现折角
    const w = i < a ? (i - (a - 3)) / 3 : i > b ? 1 - (i - b) / 3 : 1
    const k = smooth(clamp01(w))
    out[i] = {
      x: lerp(base[i].x, coil.x, k),
      y: lerp(base[i].y, coil.y, k),
      z: lerp(base[i].z, coil.z, k),
    }
  }
  return out
}

/** 从 palettes.css 读语义令牌。3D 里一个色值都不写死。 */
const tokenColor = (name: string, fallback: number) => {
  if (typeof window === 'undefined') return new THREE.Color(fallback)
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  try {
    return v ? new THREE.Color(v) : new THREE.Color(fallback)
  } catch {
    return new THREE.Color(fallback)
  }
}

export type Thread = { dispose: () => void }

export function createThread(canvas: HTMLCanvasElement, tier: Tier): Thread {
  const SEG = tier === 'high' ? 240 : 140
  const RADIUS = 0.34

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: tier === 'high',
    powerPreference: 'low-power',
  })
  renderer.setClearAlpha(0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
  camera.position.set(0, 0, 14)

  const group = new THREE.Group()
  scene.add(group)

  // 两盏灯，够了。方向光给硬转折，半球光把背面从死黑里拉回来。
  const key = new THREE.DirectionalLight(0xffffff, 2.1)
  key.position.set(4, 6, 7)
  scene.add(key)
  scene.add(
    new THREE.HemisphereLight(
      tokenColor('--cream', 0xfdf9f6),
      tokenColor('--brand-deep', 0x5b2349),
      1.15,
    ),
  )

  const stops = [
    tokenColor('--highlight', 0xf7cda9),
    tokenColor('--brand', 0x7a3560),
    tokenColor('--pop', 0x2f6b63),
    tokenColor('--highlight', 0xf7cda9),
  ]

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.78,
    metalness: 0,
  })

  const base = straightPoints()
  const knot = knottedPoints(base)
  const vecs = base.map((p) => new THREE.Vector3(p.x, p.y, p.z))
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.5)

  let mesh: THREE.Mesh | null = null
  let builtAt = -1

  /** 沿弧长把四个色标插出来，颜色因此长在几何上，不是刷在材质上。 */
  const paint = (geo: THREE.BufferGeometry) => {
    const pos = geo.getAttribute('position')
    const n = pos.count
    const colors = new Float32Array(n * 3)
    const ring = 4 // radialSegments 3 → 每圈 4 个顶点（首尾重合）
    const rings = Math.max(1, n / ring - 1)
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const t = Math.floor(i / ring) / rings
      const s = t * (stops.length - 1)
      const i0 = Math.min(stops.length - 1, Math.floor(s))
      const i1 = Math.min(stops.length - 1, i0 + 1)
      c.copy(stops[i0]).lerp(stops[i1], s - i0)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }

  const rebuild = (k: number) => {
    for (let i = 0; i < N; i++) {
      vecs[i].set(lerp(base[i].x, knot[i].x, k), lerp(base[i].y, knot[i].y, k), lerp(base[i].z, knot[i].z, k))
    }
    curve.updateArcLengths()
    const geo = new THREE.TubeGeometry(curve, SEG, RADIUS, 3, false)
    paint(geo)
    if (mesh) {
      mesh.geometry.dispose()
      mesh.geometry = geo
    } else {
      mesh = new THREE.Mesh(geo, material)
      group.add(mesh)
    }
    builtAt = k
  }

  /* ---------------------------------------------------------- 结的位置 */
  // 结出现在案例章：进入时缠上，讲到「怎么解」时抽开。
  // 位置是从 #cases 的真实文档坐标算出来的，不是拍脑袋写的进度常数——
  // 章节一长一短，写死的常数迟早对不上。
  let knotFrom = 0.52
  let knotTo = 0.78
  const measure = () => {
    const el = document.getElementById('cases')
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY
      knotFrom = clamp01((top - window.innerHeight * 0.5) / max)
      knotTo = clamp01((top + el.offsetHeight * 0.72) / max)
    }
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap(tier)))
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(1, h)
    camera.updateProjectionMatrix()
  }

  const knotAt = (p: number) => {
    if (p <= knotFrom || p >= knotTo) return 0
    const u = (p - knotFrom) / Math.max(0.0001, knotTo - knotFrom)
    // 前 45% 缠上、中间保持、后 35% 抽开
    if (u < 0.45) return smooth(u / 0.45)
    if (u > 0.65) return smooth(1 - (u - 0.65) / 0.35)
    return 1
  }

  measure()
  rebuild(0)

  /* ---------------------------------------------------------- 帧循环 */
  let raf = 0
  let px = 0
  let py = 0
  let prog = 0
  let dirty = true

  const tick = () => {
    raf = requestAnimationFrame(tick)
    const s = signal()

    const tp = s.progress
    const tx = s.pointerIn ? s.px : 0
    const ty = s.pointerIn ? s.py : 0
    const np = prog + (tp - prog) * 0.12
    const nx = px + (tx - px) * 0.07
    const ny = py + (ty - py) * 0.07
    if (Math.abs(np - prog) > 0.00015 || Math.abs(nx - px) > 0.0006 || Math.abs(ny - py) > 0.0006) dirty = true
    prog = np
    px = nx
    py = ny

    const k = knotAt(prog)
    if (Math.abs(k - builtAt) > 0.014) {
      rebuild(k)
      dirty = true
    }

    if (!dirty) return
    dirty = false

    // 视窗沿着线走：滚动改变的是「看到线的哪一段」，不是让线自己乱转。
    group.position.x = 10.5 - prog * 21
    group.position.y = -0.8 + Math.sin(prog * Math.PI) * 1.5
    group.rotation.y = -0.42 + prog * 0.9 + px * 0.1
    group.rotation.x = Math.sin(prog * Math.PI * 1.4) * 0.14 + py * 0.07
    group.rotation.z = -0.14 + Math.sin(prog * Math.PI * 1.9) * 0.17
    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(tick)

  const onResize = () => {
    measure()
    dirty = true
  }
  window.addEventListener('resize', onResize, { passive: true })

  return {
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      mesh?.geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
