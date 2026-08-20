/**
 * 铸字盘的 WebGL 层。由组件在点火条件满足后动态 import，three 不进首屏包。
 *
 * 审美决策：不做辉光、不做粒子、不上后期链。这盘字要读成「实验志封面上
 * 摊着的一盘活字」，不是「科幻场景」——字身是哑光的铅，字面是纸/荧光笔/
 * 朱笔/墨四色（与标题批注一一对应），光是天光（从奶油纸面来）。
 * 任何一帧截图都该能直接放进这本志里当图版。
 *
 * 几何：铅字是手写方角几何（v4 资产），字面/字身双材质；字面文字画进
 * 一张 canvas 图集，一个字面一格。InstancedMesh 两次 draw call 出整盘字。
 *
 * 交互：指针视差微倾字盘（不拦 wheel）；悬停抬字（raycast → 该实例上浮
 * 并回调 tooltip）。所有缓动都有明确目标值，到位即停，无循环动画。
 */

import * as THREE from 'three'
import {
  caseLayout,
  CASE_COLS,
  CASE_ROWS,
  CASE_PAD,
  CELL,
  FACE,
  SLUG_DEPTH,
  BEVEL,
  FACE_COLOR,
  type Slug,
} from '../lib/typecase'

/* 与 palettes.css A 组同步（canvas 里没有 var()，改动要两头改） */
const C = {
  ink: 0x1a1a2e,
  body: 0x4a4a5a,
  tray: 0xfaf6eb,
}

export type HoverInfo = { title: string; sub: string; x: number; y: number } | null

export type TypeCaseOpts = {
  onHover?: (h: HoverInfo) => void
  reducedMotion?: boolean
}

export type TypeCaseHandle = {
  dispose: () => void
  setActive: (on: boolean) => void
  setScroll: (p: number) => void
}

/* ------------------------------------------------------------ 铅字几何
   手写方角：字面四周带倒角（字肩），受光那一圈是硬高光 —— 金属块该有的
   样子。顶点不共享，computeVertexNormals 直接给平法线。两组材质：
   0 = 字面（吃图集），1 = 字身（哑光铅）。 */

function slugGeometry() {
  const h = FACE / 2 + BEVEL * 2 // 字身半宽（比字面宽出一圈字肩）
  const f = FACE / 2
  const zc = SLUG_DEPTH / 2
  const zb = SLUG_DEPTH / 2 - BEVEL

  type V3 = [number, number, number]
  const corner: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
  const ring = (r: number, z: number): V3[] => corner.map(([sx, sy]) => [sx * r, sy * r, z])

  const A = ring(h, zb)
  const B = ring(f, zc)
  const Cb = ring(h, -zb)
  const D = ring(f, -zc)

  const capPos: number[] = []
  const capUv: number[] = []
  const sidePos: number[] = []

  const tri = (dst: number[], a: V3, b: V3, c: V3) => dst.push(...a, ...b, ...c)
  const quad = (dst: number[], a: V3, b: V3, c: V3, d: V3) => {
    tri(dst, a, b, c)
    tri(dst, a, c, d)
  }

  quad(capPos, B[0], B[1], B[2], B[3]) // 字面 +Z
  quad(capPos, D[0], D[3], D[2], D[1]) // 背面（镜像 UV）
  const uvF = (p: V3) => [p[0] / (2 * f) + 0.5, p[1] / (2 * f) + 0.5]
  const uvB = (p: V3) => [0.5 - p[0] / (2 * f), p[1] / (2 * f) + 0.5]
  for (const p of [B[0], B[1], B[2], B[0], B[2], B[3]]) capUv.push(...uvF(p))
  for (const p of [D[0], D[3], D[2], D[0], D[2], D[1]]) capUv.push(...uvB(p))

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    quad(sidePos, A[i], A[j], B[j], B[i])
    quad(sidePos, A[i], Cb[i], Cb[j], A[j])
    quad(sidePos, Cb[i], D[i], D[j], Cb[j])
  }

  const sideUv = new Array((sidePos.length / 3) * 2).fill(0)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...capPos, ...sidePos], 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([...capUv, ...sideUv], 2))
  geo.addGroup(0, capPos.length / 3, 0)
  geo.addGroup(capPos.length / 3, sidePos.length / 3, 1)
  geo.computeVertexNormals()
  return geo
}

/* ------------------------------------------------------------ 字面图集
   18 个字字画进一张 canvas：底色 + 字。中文走系统衬线（宋体/明体），
   拉丁走 Fraunces —— 活字必须是衬线，这是活字的形制。 */

async function loadFaceFonts(chars: string) {
  if (!document.fonts?.load) return
  await Promise.all([document.fonts.load(`900 100px "Fraunces Web"`, chars).catch(() => [])])
}

function buildFaceAtlas(slugs: Slug[], size = 2048) {
  const grid = Math.ceil(Math.sqrt(slugs.length)) // 5×5
  const tile = Math.floor(size / grid)
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')!

  const paint = () => {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    slugs.forEach((s, i) => {
      const x = (i % grid) * tile
      const y = Math.floor(i / grid) * tile
      const c = FACE_COLOR[s.face]
      ctx.fillStyle = c.bg
      ctx.fillRect(x, y, tile, tile)
      const latin = /^[\x20-\x7E]$/.test(s.ch)
      ctx.font = latin
        ? `900 ${Math.round(tile * 0.62)}px "Fraunces Web", serif`
        : `700 ${Math.round(tile * 0.62)}px "Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif`
      ctx.fillStyle = c.fg
      ctx.fillText(s.ch, x + tile / 2, y + tile / 2 + tile * 0.02)
    })
  }
  paint()

  const texture = new THREE.CanvasTexture(cv)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter

  return {
    texture,
    grid,
    redraw: () => {
      paint()
      texture.needsUpdate = true
    },
    dispose: () => {
      texture.dispose()
      cv.width = cv.height = 0
    },
  }
}

/* ------------------------------------------------------------ 场景 */

export function mountTypeCase(host: HTMLElement, opts: TypeCaseOpts = {}): TypeCaseHandle {
  const slugs = caseLayout()

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60)
  const CAM_BASE = new THREE.Vector3(0, 4.6, 4.6)
  camera.position.copy(CAM_BASE)
  camera.lookAt(0, -0.1, 0)

  scene.add(new THREE.HemisphereLight(0xfffdf4, 0xd9d4c6, 1.35))
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(2.2, 5.5, 3.2)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -4
  sun.shadow.camera.right = 4
  sun.shadow.camera.top = 4
  sun.shadow.camera.bottom = -4
  sun.shadow.bias = -0.002
  scene.add(sun)

  const board = new THREE.Group()
  board.rotation.order = 'YXZ'
  scene.add(board)

  /* 字盘底托：浅盘 + 墨线细框 */
  const trayW = CASE_COLS * CELL + CASE_PAD * 2
  const trayH = CASE_ROWS * CELL + CASE_PAD * 2
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(trayW, 0.1, trayH),
    new THREE.MeshStandardMaterial({ color: C.tray, roughness: 0.9, metalness: 0 }),
  )
  tray.position.y = -0.05 - SLUG_DEPTH / 2
  tray.receiveShadow = true
  board.add(tray)

  const rimMat = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.6, metalness: 0.1 })
  const rimT = 0.045
  const rimY = tray.position.y + 0.05
  const rims: [number, number, number, number][] = [
    [0, trayH / 2 - rimT / 2, trayW, rimT],
    [0, -trayH / 2 + rimT / 2, trayW, rimT],
    [trayW / 2 - rimT / 2, 0, rimT, trayH - rimT * 2],
    [-trayW / 2 + rimT / 2, 0, rimT, trayH - rimT * 2],
  ]
  for (const [x, z, w, d] of rims) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), rimMat)
    rim.position.set(x, rimY, z)
    board.add(rim)
  }

  /* 活字：一个 InstancedMesh，字面/字身两种材质 = 2 次 draw call */
  const atlas = buildFaceAtlas(slugs)
  const geo = slugGeometry()
  const count = slugs.length

  const aTile = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2)
  geo.setAttribute('aTile', aTile)
  const tileScale = 1 / atlas.grid

  const faceMat = new THREE.MeshStandardMaterial({
    map: atlas.texture,
    roughness: 0.58,
    metalness: 0.08,
  })
  faceMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTileScale = { value: tileScale }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTile;\nuniform float uTileScale;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * uTileScale + aTile;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '')
  }
  faceMat.customProgramCacheKey = () => 'typecase-face'

  const sideMat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.62, metalness: 0.28 })

  const mesh = new THREE.InstancedMesh(geo, [faceMat, sideMat] as unknown as THREE.Material, count)
  mesh.castShadow = true
  mesh.frustumCulled = false
  board.add(mesh)

  // 字面贴图定位：flipY 下 v=0 在画布底边，行号从下往上数
  slugs.forEach((s, i) => {
    const col = i % atlas.grid
    const row = Math.floor(i / atlas.grid)
    aTile.setXY(i, col * tileScale, 1 - (row + 1) * tileScale)
  })
  aTile.needsUpdate = true

  // Fraunces 到位后原地重画字面，材质与 UV 不用换
  loadFaceFonts(slugs.map((s) => s.ch).join('')).then(() => atlas.redraw())

  /* 每枚字的基准位姿（含手排抖动）与当前上浮量 */
  const dummy = new THREE.Object3D()
  const lifts = new Float32Array(count)
  const liftTargets = new Float32Array(count)

  const applyInstance = (i: number) => {
    const s = slugs[i]
    dummy.position.set(
      (s.col - (CASE_COLS - 1) / 2) * CELL + s.dx,
      lifts[i],
      (s.row - (CASE_ROWS - 1) / 2) * CELL + s.dy,
    )
    dummy.rotation.set(0, 0, s.rot)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  for (let i = 0; i < count; i++) applyInstance(i)
  mesh.instanceMatrix.needsUpdate = true

  /* ------------------------------------------------------------ 交互 */

  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let hovered = -1
  let scrollP = 0
  const tilt = { x: 0, y: 0 }
  const parallax = { x: 0, y: 0 }

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1
    const ny = -((e.clientY - r.top) / r.height) * 2 + 1
    tilt.y = nx * 0.16
    tilt.x = -ny * 0.1

    ndc.set(nx, ny)
    ray.setFromCamera(ndc, camera)
    const hits = ray.intersectObject(mesh, false)
    const next = hits.length && hits[0].instanceId !== undefined ? hits[0].instanceId : -1
    if (next !== hovered) {
      hovered = next
      for (let i = 0; i < count; i++) liftTargets[i] = i === hovered ? 0.14 : 0
      host.style.cursor = hovered >= 0 ? 'pointer' : 'default'
      if (hovered >= 0) {
        const s = slugs[hovered]
        opts.onHover?.({ title: s.ch, sub: s.word, x: e.clientX, y: e.clientY })
      } else {
        opts.onHover?.(null)
      }
    } else if (hovered >= 0) {
      const s = slugs[hovered]
      opts.onHover?.({ title: s.ch, sub: s.word, x: e.clientX, y: e.clientY })
    }
  }

  const onLeave = () => {
    hovered = -1
    liftTargets.fill(0)
    tilt.x = 0
    tilt.y = 0
    host.style.cursor = 'default'
    opts.onHover?.(null)
  }

  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)
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

  /* ------------------------------------------------------------ 帧循环
   * 字盘不是永动机：静止时它是一盘摆好的字。只有视差、抬字、滚离三种
   * 缓动在跑，全部等差逼近明确的目标值，无循环动画。 */

  let active = true
  let raf = 0
  let last = performance.now()

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    if (!active) return

    const k = Math.min(1, dt * 8)
    parallax.x += (tilt.x - parallax.x) * k
    parallax.y += (tilt.y - parallax.y) * k
    board.rotation.x = parallax.x - 0.02 + scrollP * 0.22
    board.rotation.y = parallax.y

    let lifting = false
    for (let i = 0; i < count; i++) {
      const d = liftTargets[i] - lifts[i]
      if (Math.abs(d) > 0.0005) {
        lifts[i] += d * Math.min(1, dt * 10)
        applyInstance(i)
        lifting = true
      }
    }
    if (lifting) mesh.instanceMatrix.needsUpdate = true

    camera.position.z = CAM_BASE.z + scrollP * 0.9
    camera.position.y = CAM_BASE.y + scrollP * 0.6
    camera.lookAt(0, -0.1, 0)

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  /* ------------------------------------------------------------ 回收 */

  return {
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      scene.traverse((o) => {
        const any = o as unknown as {
          geometry?: THREE.BufferGeometry
          material?: THREE.Material | THREE.Material[]
        }
        any.geometry?.dispose()
        if (Array.isArray(any.material)) any.material.forEach((m) => m.dispose())
        else any.material?.dispose()
      })
      atlas.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    },
    setActive(on: boolean) {
      if (active === on) return
      active = on
      if (on) last = performance.now()
    },
    setScroll(p: number) {
      scrollP = p
    },
  }
}
