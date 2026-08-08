import * as THREE from 'three'
import { makeBrandEnvironment } from './env'
import { CrystalCluster } from './Crystals'
import { Backdrop } from './Backdrop'

export type StageTargets = {
  /** 晶体星座的世界坐标与整体缩放 */
  clusterX: number
  clusterY: number
  clusterZ: number
  clusterScale: number
  /** 星座的疏密：1 是基准，越大越散 */
  spread: number
  /** 整组自转速度与倾角 */
  spin: number
  tilt: number
  /** 色散强度（IOR 分离幅度），0 会触发 shader 重编译，最低给 0.6 */
  dispersion: number
  /** 底板色团的强度与冷暖：0 = 钴蓝主导，1 = 朱红主导 */
  glow: number
  tint: number
  /** 光台半径相对晶簇的倍率。圆窗那一屏要让辉光撑满窗口，就调大它 */
  aura: number
  camZ: number
  camY: number
  exposure: number
}

const DEFAULTS: StageTargets = {
  clusterX: 2.3,
  clusterY: 0,
  clusterZ: 0,
  clusterScale: 1.15,
  spread: 1,
  spin: 0.16,
  tilt: 0,
  dispersion: 5.2,
  glow: 1,
  tint: 0.4,
  aura: 1,
  camZ: 6.2,
  camY: 0,
  exposure: 1.05,
}

const _ndc = new THREE.Vector3()

export class Stage {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private cluster: CrystalCluster
  private backdrop: Backdrop

  private target: StageTargets = { ...DEFAULTS }
  private current: StageTargets = { ...DEFAULTS }
  private pointer = { x: 0, y: 0 }
  private pointerSmooth = { x: 0, y: 0 }

  private raf = 0
  private spinAngle = 0
  private clock = new THREE.Clock()
  private running = false
  private reduced: boolean
  private minDelta: number
  private ro?: ResizeObserver
  private env: THREE.Texture

  constructor(canvas: HTMLCanvasElement, opts: { lowPower: boolean; reduced: boolean }) {
    this.reduced = opts.reduced
    this.minDelta = opts.lowPower ? 1000 / 36 : 0

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: !opts.lowPower,
      powerPreference: 'high-performance',
      stencil: false,
    })
    const dpr = Math.min(window.devicePixelRatio || 1, opts.lowPower ? 1.4 : 1.7)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    // 与 --color-paper 完全一致：折射缓冲和首帧都不会出现色差接缝
    this.renderer.setClearColor(0xfbf5eb, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = DEFAULTS.exposure
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    // 折射缓冲降采样：色散要采样三次，全分辨率在集显上直接跪
    this.renderer.transmissionResolutionScale = opts.lowPower ? 0.32 : 0.5

    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 60)
    this.camera.position.set(0, 0, DEFAULTS.camZ)
    this.scene.add(this.camera)

    this.env = makeBrandEnvironment(this.renderer)
    this.scene.environment = this.env

    this.backdrop = new Backdrop()
    this.backdrop.fit(this.camera)
    this.camera.add(this.backdrop.mesh)

    this.cluster = new CrystalCluster(this.env, opts.lowPower)
    this.scene.add(this.cluster.group)

    // 两盏品牌色点光：让棱面在环境反射之外还有明确的高光轮廓
    const cobalt = new THREE.PointLight(0x1226e8, 46, 24, 2)
    cobalt.position.set(-4.2, 2.6, 3.4)
    const verm = new THREE.PointLight(0xff3b14, 34, 22, 2)
    verm.position.set(4.4, -2.0, 2.6)
    const key = new THREE.DirectionalLight(0xffffff, 1.5)
    key.position.set(2.5, 4, 5)
    this.scene.add(cobalt, verm, key, new THREE.AmbientLight(0xffffff, 0.4))

    this.onResize = this.onResize.bind(this)
    window.addEventListener('resize', this.onResize, { passive: true })
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(this.onResize)
      this.ro.observe(document.documentElement)
    }
  }

  /** 区块给的是完整构图，未指定的字段一律回落到默认值。
      早先这里用 Object.assign 就地合并，上一屏没被覆盖的字段会一直粘着走
      （圆窗那屏放大的 aura 就这样漏进了后面每一屏）。 */
  set(partial: Partial<StageTargets>) {
    this.target = { ...DEFAULTS, ...partial }
  }

  reset() {
    this.target = { ...DEFAULTS }
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

  private onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.backdrop.fit(this.camera)
  }

  start() {
    if (this.running) return
    this.running = true
    this.clock.start()
    // 低性能设备限到 36fps：折射每帧要把场景多渲一遍，60fps 在手机上纯粹是烧电
    const minDelta = this.minDelta
    let last = -Infinity
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop)
      if (now - last < minDelta) return
      last = now
      this.frame()
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const t = this.clock.elapsedTime
    const k = this.reduced ? 1 : 1 - Math.pow(0.0016, dt) // 帧率无关的临界阻尼

    const c = this.current
    const g = this.target
    for (const key of Object.keys(g) as (keyof StageTargets)[]) {
      c[key] += (g[key] - c[key]) * k
    }

    this.pointerSmooth.x += (this.pointer.x - this.pointerSmooth.x) * k
    this.pointerSmooth.y += (this.pointer.y - this.pointerSmooth.y) * k
    const px = this.reduced ? 0 : this.pointerSmooth.x
    const py = this.reduced ? 0 : this.pointerSmooth.y

    const grp = this.cluster.group
    grp.position.set(c.clusterX + px * 0.22, c.clusterY - py * 0.18, c.clusterZ)
    grp.scale.setScalar(c.clusterScale)
    // 自转必须积分：直接写 t * spin 的话，spin 插值时角度会整体跳一大段
    this.spinAngle += c.spin * dt
    if (!this.reduced) {
      grp.rotation.y = this.spinAngle
      grp.rotation.x = c.tilt + Math.sin(t * 0.19) * 0.08 + py * 0.1
      grp.rotation.z = Math.sin(t * 0.13) * 0.05
    } else {
      grp.rotation.set(c.tilt, 0.6, 0)
    }
    this.cluster.update(this.reduced ? 3.4 : t, c.spread, c.dispersion, this.reduced)

    this.camera.position.z = c.camZ
    this.camera.position.y = c.camY + py * 0.12
    this.camera.position.x = px * 0.14
    this.camera.lookAt(0, c.camY * 0.4, 0)

    // 光台对准晶簇。相机先摆好再投影，否则光团会慢相机一帧。
    this.camera.updateMatrixWorld()
    _ndc.copy(grp.position).project(this.camera)
    this.backdrop.aim(
      _ndc,
      c.clusterScale * (1.55 + 0.55 * c.spread) * c.aura,
      Math.abs(this.camera.position.z - c.clusterZ),
      this.camera.fov
    )
    this.backdrop.update(this.reduced ? 2.0 : t, c.tint, c.glow, px, py)

    this.renderer.toneMappingExposure = c.exposure

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this.onResize)
    this.ro?.disconnect()
    this.cluster.dispose()
    this.backdrop.dispose()
    this.env.dispose()
    this.scene.clear()
    this.renderer.dispose()
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
