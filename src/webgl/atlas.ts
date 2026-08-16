/**
 * 星图的 WebGL 层。由组件在点火条件满足后动态 import，three 不进首屏包。
 *
 * 审美决策：不做辉光、不做加色粒子、不上后期链。这套图要读成
 * 「印在纸上的星图被点亮了」，不是「太空场景」——所以节点是平面着色的
 * 多面体（宝石切面感），光是暖的（天光来自奶油纸面），线是墨色的，
 * 轨道是虚线圆。任何一帧截图都该能直接放进这本实验志里当图版。
 *
 * 交互契约：
 *  - 拖拽旋转整个星座（有惯性），不拦截页面滚动（不监听 wheel）
 *  - 悬停任何节点 → 回调出 tooltip（组件渲染 HTML）
 *  - 点击（位移 < 6px 判定为点）→ 打开该节点真实的 GitHub / 线上地址
 *  - 每帧回调标签投影位（组件把 HTML 标签钉上去）
 */

import * as THREE from 'three'
import { atlasLayout, orbitLabelPoints, type StarNode } from '../lib/atlas'

/* 调色板与 CSS 令牌同步（canvas 里没有 var()，改动要两头改） */
const C = {
  ink: 0x1a1a2e,
  inkLight: 0x4a4a5a,
  blue: 0x2b7fd8,
  blueDeep: 0x1e5ba8,
  blueTint: 0x6fa9e6,
  coral: 0xe84a5f,
  coralDeep: 0xc93449,
  yellow: 0xd9a92e,
}
const ORBIT_COLORS = [C.coral, C.blue, C.yellow, C.inkLight]

export type HoverInfo = { title: string; sub: string; x: number; y: number } | null
export type LabelPos = { id: string; x: number; y: number; dim: number }

export type AtlasOpts = {
  onHover?: (h: HoverInfo) => void
  onLabels?: (l: LabelPos[]) => void
  reducedMotion?: boolean
}

export type AtlasHandle = {
  dispose: () => void
  setActive: (on: boolean) => void
  setScroll: (p: number) => void
}

type PickTarget = { name: string; sub: string; href: string }

export function mountAtlas(host: HTMLElement, opts: AtlasOpts = {}): AtlasHandle {
  const layout = atlasLayout()

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
  renderer.setPixelRatio(dpr)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60)
  const CAM_BASE = new THREE.Vector3(0, 1.5, 7.3)
  camera.position.copy(CAM_BASE)
  camera.lookAt(0, 0.05, 0)

  scene.add(new THREE.HemisphereLight(0xfffdf4, 0xd9d4c6, 1.5))
  const sun = new THREE.DirectionalLight(0xffffff, 1.15)
  sun.position.set(2.5, 3.5, 4)
  scene.add(sun)

  const chart = new THREE.Group()
  chart.rotation.order = 'YXZ'
  chart.rotation.y = 0.62
  chart.rotation.x = -0.34
  scene.add(chart)

  /* ------------------------------------------------------------ 几何 */

  const nodeGeo = new THREE.IcosahedronGeometry(1, 0)
  const dotGeo = new THREE.IcosahedronGeometry(1, 1)
  const mat = (color: number, rough = 0.62) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05, flatShading: true })

  type PickEntry = { obj: THREE.Object3D; instanceId?: number; info: PickTarget }
  const pickEntries: PickEntry[] = []
  const pickObjs: THREE.Object3D[] = []

  const addPick = (obj: THREE.Object3D, info: PickTarget, instanceId?: number) => {
    pickEntries.push({ obj, instanceId, info })
    if (instanceId === undefined && !pickObjs.includes(obj)) pickObjs.push(obj)
  }

  // 核心：video_vip
  const hubMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(layout.hub.r, 1), mat(C.coral, 0.5))
  chart.add(hubMesh)
  addPick(hubMesh, { name: 'video_vip', sub: '★ 4,642 · 22 站点适配', href: layout.hub.href })
  // 核心的赤道虚线环：星图里被标记的主星
  const halo = ringLine(layout.hub.r * 1.55, C.ink, 0.5, 0.05, 0.045)
  chart.add(halo)

  // 主力仓库
  const primaryMats: Record<string, THREE.Material> = {
    a: mat(C.blue),
    b: mat(C.blueDeep),
  }
  layout.primaries.forEach((n: StarNode, i) => {
    const m = new THREE.Mesh(nodeGeo, i % 2 ? primaryMats.b : primaryMats.a)
    m.scale.setScalar(n.r)
    m.position.set(...n.pos)
    chart.add(m)
    addPick(m, { name: n.name, sub: n.stars > 0 ? `★ ${n.stars}` : '原创仓库', href: n.href })
  })

  // 其余原创仓库：一个 InstancedMesh
  const minorMesh = new THREE.InstancedMesh(dotGeo, mat(C.inkLight), layout.minors.length)
  const minorDummy = new THREE.Object3D()
  layout.minors.forEach((n, i) => {
    minorDummy.position.set(...n.pos)
    minorDummy.scale.setScalar(n.r)
    minorDummy.updateMatrix()
    minorMesh.setMatrixAt(i, minorDummy.matrix)
    addPick(minorMesh, { name: n.name, sub: n.stars > 0 ? `★ ${n.stars}` : '原创仓库', href: n.href }, i)
  })
  chart.add(minorMesh)
  pickObjs.push(minorMesh)

  // 核心到五枚主力的连线（墨色，低透明度）
  const linkPts: number[] = []
  layout.primaries.forEach((n) => linkPts.push(0, 0, 0, n.pos[0], n.pos[1], n.pos[2]))
  const linkGeo = new THREE.BufferGeometry()
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPts, 3))
  const links = new THREE.LineSegments(
    linkGeo,
    new THREE.LineBasicMaterial({ color: C.ink, transparent: true, opacity: 0.32 }),
  )
  chart.add(links)

  // 四条花园轨道（虚线）+ 轨道上的站点点
  layout.orbits.forEach((o, oi) => {
    const ring = ringLine(o.radius, ORBIT_COLORS[oi], 0.55, 0.075, 0.055)
    ring.rotation.x = o.tiltX
    ring.rotation.z = o.rotZ
    chart.add(ring)

    const dots = new THREE.InstancedMesh(dotGeo, mat(ORBIT_COLORS[oi], 0.7), o.dots.length)
    o.dots.forEach((d, i) => {
      minorDummy.position.set(...d.pos)
      minorDummy.scale.setScalar(0.032)
      minorDummy.updateMatrix()
      dots.setMatrixAt(i, minorDummy.matrix)
      addPick(dots, { name: d.name, sub: '在线小站 · ' + o.group, href: d.href }, i)
    })
    chart.add(dots)
    pickObjs.push(dots)
  })

  function ringLine(radius: number, color: number, opacity: number, dash: number, gap: number) {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    const m = new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: dash, gapSize: gap })
    const l = new THREE.Line(g, m)
    l.computeLineDistances()
    return l
  }

  /* ------------------------------------------------------------ 标签锚点 */

  const orbitLabelAngles = orbitLabelPoints(
    layout.orbits,
    { x: 0, y: layout.hub.r * 1.55 + 0.45 },
    layout.primaries,
  ).map((r) => r.angle)

  const labelDefs: { id: string; world: THREE.Vector3 }[] = [
    { id: 'hub', world: new THREE.Vector3(0, -(layout.hub.r + 0.18), 0) },
    ...layout.primaries.map((n) => ({
      id: n.id,
      world: new THREE.Vector3(n.pos[0], n.pos[1] + n.r + 0.1, n.pos[2]),
    })),
    ...layout.orbits.map((o, i) => {
      const a = orbitLabelAngles[i]
      const flat = new THREE.Vector3(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius)
      flat.applyAxisAngle(new THREE.Vector3(1, 0, 0), o.tiltX)
      flat.applyAxisAngle(new THREE.Vector3(0, 0, 1), o.rotZ)
      return { id: 'orbit:' + o.ring, world: flat }
    }),
  ]

  /* ------------------------------------------------------------ 状态 */

  let active = true
  let raf = 0
  let last = performance.now()
  let idleT = 0
  const rot = { x: chart.rotation.x, y: chart.rotation.y }
  const vel = { x: 0, y: 0 }
  let dragging = false
  let moved = 0
  let lastPtr = { x: 0, y: 0 }
  let hovered: PickTarget | null = null
  let scrollP = 0
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const tmp = new THREE.Vector3()
  const labelsOut: LabelPos[] = []

  const setPointerFromEvent = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
    return r
  }

  const raycast = (e: PointerEvent) => {
    const r = setPointerFromEvent(e)
    ray.setFromCamera(ndc, camera)
    const hits = ray.intersectObjects(pickObjs, false)
    if (!hits.length) return null
    const h = hits[0]
    const entry = pickEntries.find(
      (p) => p.obj === h.object && (h.instanceId === undefined || p.instanceId === h.instanceId),
    )
    if (!entry) return null
    return {
      info: entry.info,
      x: r.left + ((ndc.x + 1) / 2) * r.width,
      y: r.top + ((1 - ndc.y) / 2) * r.height,
    }
  }

  const onMove = (e: PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - lastPtr.x
      const dy = e.clientY - lastPtr.y
      moved += Math.abs(dx) + Math.abs(dy)
      vel.y = dx * 0.0052
      vel.x = dy * 0.0036
      rot.y += vel.y
      rot.x = Math.max(-0.95, Math.min(0.62, rot.x + vel.x))
      lastPtr = { x: e.clientX, y: e.clientY }
      idleT = 0
      return
    }
    const hit = raycast(e)
    const next = hit?.info ?? null
    if (next !== hovered || (hit && next)) {
      hovered = next
      host.style.cursor = next ? 'pointer' : 'grab'
      opts.onHover?.(next && hit ? { title: next.name, sub: next.sub, x: hit.x, y: hit.y } : null)
    } else if (hit && hovered) {
      opts.onHover?.({ title: hit.info.name, sub: hit.info.sub, x: hit.x, y: hit.y })
    }
  }

  const onDown = (e: PointerEvent) => {
    dragging = true
    moved = 0
    lastPtr = { x: e.clientX, y: e.clientY }
    host.style.cursor = 'grabbing'
    host.setPointerCapture(e.pointerId)
  }

  const onUp = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    host.style.cursor = hovered ? 'pointer' : 'grab'
    if (moved < 6 && hovered) window.open(hovered.href, '_blank', 'noopener')
    else if (moved < 6) {
      const hit = raycast(e)
      if (hit) window.open(hit.info.href, '_blank', 'noopener')
    }
  }

  const onLeave = () => {
    if (hovered) {
      hovered = null
      opts.onHover?.(null)
      host.style.cursor = 'grab'
    }
  }

  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointerleave', onLeave)
  host.style.cursor = 'grab'
  host.style.touchAction = 'pan-y'

  /* ------------------------------------------------------------ 尺寸 */

  const resize = () => {
    const w = host.clientWidth || 1
    const h = host.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  /* ------------------------------------------------------------ 帧循环 */

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    if (!active) return

    idleT += dt
    if (!dragging) {
      rot.y += vel.y
      rot.x = Math.max(-0.95, Math.min(0.62, rot.x + vel.x))
      vel.x *= Math.pow(0.0025, dt)
      vel.y *= Math.pow(0.0025, dt)
      if (!opts.reducedMotion && idleT > 1.6) rot.y += dt * 0.055
    }
    chart.rotation.x += (rot.x - chart.rotation.x) * Math.min(1, dt * 9)
    chart.rotation.y += (rot.y - chart.rotation.y) * Math.min(1, dt * 9)

    // 滚动回应：hero 离场时星座轻轻转过去、镜头拉远，像翻页时把图版立起来
    camera.position.z = CAM_BASE.z + scrollP * 1.1
    camera.position.y = CAM_BASE.y + scrollP * 0.5
    camera.lookAt(0, 0.05, 0)

    renderer.render(scene, camera)

    if (opts.onLabels) {
      labelsOut.length = 0
      const r = host.getBoundingClientRect()
      for (const d of labelDefs) {
        tmp.copy(d.world).applyMatrix4(chart.matrixWorld).project(camera)
        labelsOut.push({
          id: d.id,
          x: r.left + ((tmp.x + 1) / 2) * r.width,
          y: r.top + ((1 - tmp.y) / 2) * r.height,
          dim: tmp.z > 1 ? 0.25 : tmp.z < -0.2 ? 0.4 : 1,
        })
      }
      opts.onLabels(labelsOut)
    }
  }
  raf = requestAnimationFrame(frame)

  /* ------------------------------------------------------------ 回收 */

  return {
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('pointerleave', onLeave)
      host.style.cursor = ''
      scene.traverse((o) => {
        const any = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material }
        any.geometry?.dispose()
        any.material?.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    },
    setActive(on: boolean) {
      if (active === on) return
      active = on
      if (on) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      } else {
        cancelAnimationFrame(raf)
      }
    },
    setScroll(p: number) {
      scrollP = p
    },
  }
}
