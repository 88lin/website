import * as THREE from 'three'
import { makeBrandEnvironment } from './env'
import { ChromeForm } from './ChromeForm'
import { ParticleField } from './ParticleField'
import { SubjectPlane } from './SubjectPlane'

export type StageTargets = {
  formX: number
  formY: number
  formZ: number
  formScale: number
  amp: number
  freq: number
  twist: number
  spin: number
  camZ: number
  camY: number
  particles: number
  exposure: number
}

const DEFAULTS: StageTargets = {
  formX: 2.35,
  formY: 0.1,
  formZ: 0,
  formScale: 1.65,
  amp: 0.26,
  freq: 1.0,
  twist: 0.0,
  spin: 0.16,
  camZ: 6.2,
  camY: 0,
  particles: 0.55,
  exposure: 1.05,
}

export type SubjectKey = 'car' | 'robot' | 'cat' | 'rabbit'

export class Stage {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private form: ChromeForm
  private particles: ParticleField
  private subjects = new Map<SubjectKey, SubjectPlane>()
  private subjectOpacity: Record<string, number> = {}
  private subjectTarget: Record<string, number> = {}
  /** 屏幕空间锚点：sx/sy 为视口比例，h 为占视口高度的比例 */
  private anchors: Partial<Record<SubjectKey, { sx: number; sy: number; h: number; z: number }>> = {}

  private target: StageTargets = { ...DEFAULTS }
  private current: StageTargets = { ...DEFAULTS }
  private pointer = { x: 0, y: 0 }
  private pointerSmooth = { x: 0, y: 0 }

  private raf = 0
  private clock = new THREE.Clock()
  private running = false
  private lowPower: boolean
  private reduced: boolean
  private ro?: ResizeObserver
  private env: THREE.Texture

  constructor(canvas: HTMLCanvasElement, opts: { lowPower: boolean; reduced: boolean }) {
    this.lowPower = opts.lowPower
    this.reduced = opts.reduced

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !opts.lowPower,
      powerPreference: 'high-performance',
      stencil: false,
    })
    const dpr = Math.min(window.devicePixelRatio || 1, opts.lowPower ? 1.5 : 1.75)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = DEFAULTS.exposure
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 60)
    this.camera.position.set(0, 0, DEFAULTS.camZ)

    this.env = makeBrandEnvironment(this.renderer)
    this.scene.environment = this.env

    this.form = new ChromeForm(this.env, opts.lowPower)
    this.scene.add(this.form.mesh)

    this.particles = new ParticleField(opts.lowPower ? 4200 : 17000, dpr)
    this.scene.add(this.particles.points)

    // 面光源：让铬面在环境反射之外还有两条明确的品牌色高光
    const cobalt = new THREE.PointLight(0x1226e8, 55, 24, 2)
    cobalt.position.set(-4.2, 2.6, 3.4)
    const verm = new THREE.PointLight(0xff3b14, 42, 22, 2)
    verm.position.set(4.4, -2.0, 2.6)
    this.scene.add(cobalt, verm, new THREE.AmbientLight(0xffffff, 0.35))

    this.onResize = this.onResize.bind(this)
    window.addEventListener('resize', this.onResize, { passive: true })
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(this.onResize)
      this.ro.observe(document.documentElement)
    }
  }

  async loadSubject(key: SubjectKey, url: string, aspect: number) {
    const loader = new THREE.TextureLoader()
    const tex = await loader.loadAsync(url).catch(() => null)
    if (!tex) return
    const plane = new SubjectPlane(tex, aspect, this.lowPower)
    this.subjects.set(key, plane)
    this.subjectOpacity[key] = 0
    this.subjectTarget[key] = 0
    this.scene.add(plane.mesh)
  }

  placeSubject(key: SubjectKey, x: number, y: number, z: number, scale: number, rotY = 0) {
    const s = this.subjects.get(key)
    if (!s) return
    s.mesh.position.set(x, y, z)
    s.mesh.userData.base = { x, y }
    s.mesh.scale.setScalar(scale)
    s.mesh.rotation.y = rotY
  }

  /**
   * 把素材钉在视口的某个比例位置上，尺寸也按视口高度比例给。
   * 每帧按当前相机距离反算世界坐标，所以换分辨率、改 camZ 都不会跑位。
   */
  anchorSubject(key: SubjectKey, sx: number, sy: number, h: number, z = 1.1) {
    this.anchors[key] = { sx, sy, h, z }
  }

  /** 收窄或放宽素材的椭圆羽化。窗口里的素材要放宽，纸底上漂浮的素材要收窄。 */
  setSubjectFeather(key: SubjectKey, inner: number, outer: number) {
    this.subjects.get(key)?.setFeather(inner, outer)
  }

  showSubject(key: SubjectKey, v: number) {
    this.subjectTarget[key] = v
  }

  hideAllSubjects() {
    for (const k of Object.keys(this.subjectTarget)) this.subjectTarget[k] = 0
  }

  set(partial: Partial<StageTargets>) {
    Object.assign(this.target, partial)
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
  }

  start() {
    if (this.running) return
    this.running = true
    this.clock.start()
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
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

    const m = this.form.mesh
    m.position.set(c.formX + px * 0.24, c.formY - py * 0.2, c.formZ)
    m.scale.setScalar(c.formScale)
    if (!this.reduced) {
      m.rotation.y = t * c.spin
      m.rotation.x = Math.sin(t * 0.21) * 0.13 + py * 0.12
    }
    this.form.amp = c.amp
    this.form.freq = c.freq
    this.form.twist = c.twist
    this.form.update(this.reduced ? 3.4 : t)

    this.particles.opacity = c.particles
    this.particles.update(this.reduced ? 2.0 : t)
    this.particles.points.rotation.y = this.reduced ? 0 : t * 0.014

    for (const [key, plane] of this.subjects) {
      const want = this.subjectTarget[key] ?? 0
      this.subjectOpacity[key] += (want - this.subjectOpacity[key]) * k
      plane.opacity = this.subjectOpacity[key]
      if (plane.opacity > 0.003) {
        plane.update(this.reduced ? 1.0 : t)
        const a = this.anchors[key]
        if (a) {
          const dz = Math.max(0.5, this.camera.position.z - a.z)
          const vh = 2 * dz * Math.tan(((this.camera.fov / 2) * Math.PI) / 180)
          const vw = vh * this.camera.aspect
          plane.mesh.position.set(
            (a.sx - 0.5) * vw + this.camera.position.x + px * 0.09,
            (0.5 - a.sy) * vh + this.camera.position.y - py * 0.07,
            a.z
          )
          plane.mesh.scale.setScalar(a.h * vh)
        } else {
          const base = (plane.mesh.userData.base as { x: number; y: number }) ?? { x: 0, y: 0 }
          plane.mesh.position.x = base.x + px * 0.42
          plane.mesh.position.y = base.y - py * 0.3
        }
        plane.mesh.rotation.z = this.reduced ? 0 : Math.sin(t * 0.28) * 0.02
      }
    }

    this.camera.position.z = c.camZ
    this.camera.position.y = c.camY + py * 0.14
    this.camera.position.x = px * 0.16
    this.camera.lookAt(0, c.camY * 0.4, 0)
    this.renderer.toneMappingExposure = c.exposure

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.stop()
    window.removeEventListener('resize', this.onResize)
    this.ro?.disconnect()
    this.form.dispose()
    this.particles.dispose()
    for (const s of this.subjects.values()) s.dispose()
    this.subjects.clear()
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
