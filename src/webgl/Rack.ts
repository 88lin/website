/**
 * 机架场景。整站只有这一块画布，固定在最底层，DOM 通过 src/lib/bus.ts
 * 广播的几个语义量驱动它——它不认识任何一个 DOM 元素。
 *
 * 一帧的顺序（透镜必须能采到「自己后面」，所以画两趟）：
 *   A 关掉透镜，把机架 + 背板 + 粒子画进 bgRT（0.6 倍分辨率，够透镜用）
 *   B 打开透镜，透镜在着色器里采 bgRT 做色散折射，整场画进 mainRT
 *   C mainRT 亮部提取 → 两趟模糊
 *   D 合成上屏
 *
 * 世界尺度：九格通道纵向铺在 y = 0 到 y = -22 之间，相机跟着滚动进度走。
 */

import {
  AmbientLight,
  BoxGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShaderMaterial,
  Shape,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { Post } from './post'
import { Particles } from './particles'
import { digitTargets, envTexture, silkStrip } from './textures'
import { signal } from '../lib/bus'
import { dprCap, particleSide, type Tier } from '../lib/caps'

export const BAYS = 9
export const SCENE_H = 22
const BAY_GAP = SCENE_H / (BAYS - 1)
const BUS_X = 1.92
const LENS_X = 2.02
const LENS_Z = 1.25
/** 透镜玻璃的世界尺寸，缩放按开口反推时要用 */
const LENS_W = 0.82
const LENS_H = 0.76

const HEX = {
  chassis: 0x1b4fd8,
  deep: 0x12308c,
  lift: 0x4c82f0,
  lemon: 0xf2da2e,
  jade: 0x12a594,
  amber: 0xf07a12,
  verm: 0xff3a2c,
  panel: 0xfffdf4,
  ink: 0x10122b,
}

/* 每格通道对应的灯色，跟 CSS 里 [data-ground] 的配色一一对上 */
const LAMP = [
  HEX.lemon,
  HEX.ink,
  HEX.ink,
  HEX.lemon,
  HEX.ink,
  HEX.ink,
  HEX.lemon,
  HEX.ink,
  HEX.panel,
]

const BACKDROP_VERT = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const BACKDROP_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBot;
  uniform vec3 uGlow;
  uniform float uGlowY;
  varying vec3 vW;

  void main() {
    float t = clamp((vW.y + 24.0) / 28.0, 0.0, 1.0);
    vec3 col = mix(uBot, uTop, t);

    // 当前通道那一格的辉光：机架亮着的那一层会把背板也照亮一点
    float g = exp(-abs(vW.y - uGlowY) * 0.62);
    col += uGlow * g * 0.13;

    // 网版半调：世界空间固定网格，越远越淡
    vec2 q = vW.xy * 13.0;
    float dot1 = smoothstep(0.42, 0.36, length(fract(q) - 0.5));
    col += dot1 * 0.028;

    gl_FragColor = vec4(col, 1.0);
  }
`

const RACE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

/*
 * 走线槽的后墙。丝印字带原本画在 z=-3.6 的大背板上，但从 z=-0.5 的槽口望进去，
 * 视线会被放大 1.46 倍——槽里看到的其实是背板上偏右一大截的地方，字带早就衰减完了。
 * 把后墙挪到紧贴机架背面的 z=-0.86，视差只剩 1.05 倍，字带才落在槽里。
 */
const RACE_FRAG = /* glsl */ `
  uniform sampler2D uSilk;
  uniform vec3 uBase;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vW;

  void main() {
    // 墙比槽口宽一点，免得相机横移时露边；采样时把多出来的部分折算回去
    float su = (vUv.x - 0.5) * 1.19 + 0.5;
    vec3 silk = texture2D(uSilk, vec2(su, fract(vW.y * 0.5085 - uTime * 0.052))).rgb;

    // 槽沿的落影：两侧压暗，槽才有深度而不是一张贴纸
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    vec3 col = mix(uBase * 0.5, silk, 0.62) * (0.4 + 0.6 * edge);
    gl_FragColor = vec4(col, 1.0);
  }
`

const LENS_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const LENS_FRAG = /* glsl */ `
  uniform sampler2D uBg;
  uniform vec2 uResolution;
  uniform float uStrength;
  uniform float uSpread;
  uniform vec3 uTint;
  varying vec3 vN;
  varying vec3 vV;

  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(-vV);
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);

    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 off = n.xy * uStrength * (0.30 + fres * 1.7);

    // 三次采样做色散：红绿蓝各偏一点，玻璃边缘才会出彩边
    vec3 c;
    c.r = texture2D(uBg, clamp(uv + off * (1.0 + uSpread), vec2(0.002), vec2(0.998))).r;
    c.g = texture2D(uBg, clamp(uv + off, vec2(0.002), vec2(0.998))).g;
    c.b = texture2D(uBg, clamp(uv + off * (1.0 - uSpread), vec2(0.002), vec2(0.998))).b;

    c = mix(c, c * uTint, 0.16);
    c += fres * vec3(0.42, 0.52, 0.72);          // 边缘反射
    c += pow(max(0.0, n.y), 6.0) * 0.16;          // 顶面那道窄高光

    gl_FragColor = vec4(c, 1.0);
  }
`

const roundedSlab = () => {
  // 透镜要比窗口小：上一版 1.58×1.66 在屏上是 417×438px，比 374×279 的窗还大，
  // 于是整个窗都是折射后的糊像，看不到玻璃边，读起来只是「一层模糊」。
  const w = 0.82
  const h = 0.76
  const r = 0.2
  const s = new Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  const g = new ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.11,
    bevelThickness: 0.11,
    bevelSegments: 5,
    curveSegments: 16,
  })
  g.center()
  g.computeVertexNormals()
  return g
}

export type RackHandle = {
  dispose: () => void
  /** 数字靶点：把某一格通道要「解出来」的数字交给粒子层 */
  setDigits: (text: string, y: number) => void
}

export function mountRack(canvas: HTMLCanvasElement, tier: Tier): RackHandle | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  const gl = renderer.getContext()
  const hdr = !!(gl as WebGL2RenderingContext).getExtension?.('EXT_color_buffer_float')

  const dpr = Math.min(window.devicePixelRatio || 1, dprCap(tier))
  renderer.setPixelRatio(dpr)
  renderer.setSize(window.innerWidth, window.innerHeight, false)

  const scene = new Scene()
  const camera = new PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 90)
  camera.position.set(0, 0, 6.2)

  const env = envTexture()
  scene.environment = env

  scene.add(new AmbientLight(0xffffff, 0.5))
  const key = new DirectionalLight(0xfff6de, 2.1)
  key.position.set(-3.2, 4.5, 5.2)
  scene.add(key)
  const fill = new DirectionalLight(0x6f9dff, 1.1)
  fill.position.set(4.2, -2.0, 2.6)
  scene.add(fill)

  /* ---------------------------------------------------------- 背板 */
  const silkTex: { value: Texture | null } = { value: null }
  const backdropMat = new ShaderMaterial({
    vertexShader: BACKDROP_VERT,
    fragmentShader: BACKDROP_FRAG,
    uniforms: {
      uTop: { value: new Color(HEX.chassis).convertSRGBToLinear() },
      uBot: { value: new Color(0x081436).convertSRGBToLinear() },
      uGlow: { value: new Color(HEX.lemon).convertSRGBToLinear() },
      uGlowY: { value: 0 },
    },
    depthWrite: true,
  })
  const backdrop = new Mesh(new PlaneGeometry(38, 46), backdropMat)
  backdrop.position.set(0, -SCENE_H / 2, -3.6)
  backdrop.renderOrder = -1
  scene.add(backdrop)

  const RACE_HW = 0.42          // 槽口半宽（机架面 z=-0.5 上的实际开口）
  const RACE_Z = -0.86
  const RACE_PARALLAX = (6.2 - RACE_Z) / (6.2 + 0.5)
  const raceMat = new ShaderMaterial({
    vertexShader: RACE_VERT,
    fragmentShader: RACE_FRAG,
    uniforms: {
      uSilk: silkTex,
      uBase: { value: new Color(HEX.deep).convertSRGBToLinear() },
      uTime: { value: 0 },
    },
  })
  const raceWall = new Mesh(new PlaneGeometry(RACE_HW * 2 * RACE_PARALLAX * 1.19, SCENE_H + 14), raceMat)
  raceWall.position.set(BUS_X * RACE_PARALLAX, -SCENE_H / 2, RACE_Z)
  scene.add(raceWall)

  /* ---------------------------------------------------------- 机架本体 */
  const box = new BoxGeometry(1, 1, 1)
  const bodyMat = new MeshPhysicalMaterial({
    roughness: 0.34,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.15,
  })

  const parts: { p: Vector3; s: Vector3; c: number }[] = []
  const leds: { p: Vector3; s: number; c: number; lit?: boolean }[] = []

  const hash = (n: number) => {
    let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }


  /*
   * 机架单元的粒度是按「窗口」定的，不是按视口定的。
   * 相机 fov 38 / z 6.2，机架面在 z≈-0.5，一个世界单位约 195 px；而 CSS 开的窗
   * 最小只有 346×205 px（≈1.8×1.05 个世界单位）。上一版 U=0.86、插件宽到 0.8，
   * 一个窗里只装得下一行半、两三块插件，放大看就是几块跳色的大方块，压过前景字。
   * 这里把单元压到 0.30——一个窗里大约五行、每行十来个模块，才有「设备」的密度。
   */
  const U = 0.3
  const ROWS = Math.ceil((SCENE_H + 8) / U)
  const TOP_Y = 2.6
  /*
   * 总线那条竖槽是掏空的。机架插满之后背板被挡得一点不剩，丝印字带（4,684 ★ /
   * 88LIN / 18 / 22 这些真数据）就完全看不见了；粒子流也失去了「在管路里跑」的
   * 由头。所以在总线位置留一条开放的走线槽：槽里是背板 + 丝印 + 粒子，槽两侧
   * 是机架模块。透镜正好扣在这条槽上。
   */
  const RACE_L = BUS_X - 0.42
  const RACE_R = BUS_X + 0.42
  /*
   * 机架横向要铺满视口。相机 fov 38 / z 6.2 时，16:9 视口的可视半宽约 3.7 个世界
   * 单位，21:9 会到 4.9——CSS 的窗最右能开到 96%，机架只到 ±2.71 的话，那些窗里
   * 会露出空背板。这里一路铺到 ±5.4，超宽屏也兜得住。
   */
  const EDGE_L = -5.4
  const EDGE_R = 5.4

  // 模块主色以蓝为主。信号色是重音，不是底色：上一版六色等概率轮询，
  // 结果整面机架红黄青白各占六分之一，比前景还抢。
  const BLUES = [HEX.deep, HEX.deep, HEX.chassis, HEX.deep, HEX.lift]
  const ACCENT = [HEX.lemon, HEX.jade, HEX.amber, HEX.verm, HEX.jade, HEX.lemon]
  const LED_TONES = [HEX.lemon, HEX.jade, HEX.verm, HEX.panel, HEX.amber]

  /** 在 [a,b] 这一段里排模块：1U 交换机 / 补线板 / 盲板那种分法 */
  const fillRow = (r: number, y: number, a: number, b: number, salt: number) => {
    const span = b - a
    if (span < 0.34) return
    const mods = Math.max(1, Math.min(4, Math.round(span / 1.15) + Math.floor(hash(r * 7 + salt) * 2)))
    let x = a
    for (let m = 0; m < mods; m++) {
      const rest = b - x
      const w = m === mods - 1 ? rest : Math.max(0.36, (span / mods) * (0.62 + hash(r * 31 + m * 13 + salt) * 0.78))
      if (w < 0.3 || x + w > b + 0.001) {
        if (rest > 0.3) {
          parts.push({ p: new Vector3(x + rest / 2, y, -0.5), s: new Vector3(rest - 0.05, U * 0.74, 0.18), c: HEX.deep })
        }
        break
      }
      const isBlank = hash(r * 401 + m * 97 + salt) < 0.14 // 盲板
      const accent = !isBlank && hash(r * 619 + m * 43 + salt) < 0.15
      const c = accent
        ? ACCENT[Math.floor(hash(r * 83 + m * 29 + salt) * ACCENT.length)]
        : BLUES[Math.floor(hash(r * 191 + m * 11 + salt) * BLUES.length)]
      parts.push({
        p: new Vector3(x + w / 2, y, -0.5),
        s: new Vector3(w - 0.05, U * (isBlank ? 0.74 : 0.62), 0.18),
        c,
      })
      // 端口 / 状态灯：真正把「这是硬件」这件事说清楚的细节
      if (!isBlank) {
        const n = Math.max(2, Math.min(14, Math.floor((w - 0.12) / 0.085)))
        const gap = (w - 0.14) / n
        for (let k = 0; k < n; k++) {
          // 只有约 1/6 的灯是「亮」的，其余压暗到泛光阈值下面，不然一整面机架会糊成一片光
          const lit = hash(r * 977 + m * 131 + k * 17 + salt) > 0.84
          leds.push({
            p: new Vector3(x + 0.07 + gap * (k + 0.5), y - U * 0.14, -0.4),
            s: 0.036,
            c: LED_TONES[Math.floor(hash(r * 53 + m * 7 + k + salt) * LED_TONES.length)],
            lit,
          })
        }
      }
      x += w + 0.02
    }
  }

  for (let r = 0; r < ROWS; r++) {
    const y = TOP_Y - r * U
    // 面板条：机架的「层」靠它读出来。槽两侧各一段，中间是空的。
    for (const [a, b] of [
      [EDGE_L, RACE_L],
      [RACE_R, EDGE_R],
    ]) {
      parts.push({
        p: new Vector3((a + b) / 2, y, -0.64),
        s: new Vector3(b - a, U * 0.82, 0.3),
        c: r % 5 === 0 ? HEX.chassis : HEX.deep,
      })
    }
    fillRow(r, y, EDGE_L + 0.05, RACE_L - 0.04, 0)
    fillRow(r, y, RACE_R + 0.04, EDGE_R - 0.05, 601)

    // 走线槽里每隔几层一道理线扣
    if (r % 4 === 1) {
      parts.push({ p: new Vector3(BUS_X, y + U * 0.4, -0.72), s: new Vector3(0.84, 0.05, 0.14), c: HEX.deep })
    }
  }

  // 槽两侧的导轨：把「这是一条开出来的槽」说清楚
  for (const x of [RACE_L - 0.03, RACE_R + 0.03]) {
    parts.push({ p: new Vector3(x, -SCENE_H / 2, -0.46), s: new Vector3(0.06, SCENE_H + 8, 0.4), c: HEX.lift })
  }

  // 当前通道的主面板：三个单元高，是这一格「正在工作」的那台设备。
  // 只占槽左边那一段——设备不会横跨走线槽。
  const AW = 3.66
  const AX = RACE_L - 0.1 - AW / 2
  for (let i = 0; i < BAYS; i++) {
    const y = -i * BAY_GAP
    parts.push({ p: new Vector3(AX, y, -0.48), s: new Vector3(AW, U * 3.1, 0.24), c: HEX.panel })
    parts.push({ p: new Vector3(AX, y, -0.42), s: new Vector3(AW - 0.14, U * 2.6, 0.22), c: HEX.deep })
    const n = 7
    for (let k = 0; k < n; k++) {
      parts.push({
        p: new Vector3(AX - AW / 2 + 0.24 + ((AW - 0.48) / (n - 1)) * k, y + U * 0.42, -0.34),
        s: new Vector3(0.46, U * 0.72, 0.16),
        c: k % 3 === 1 ? ACCENT[(i + k) % ACCENT.length] : HEX.chassis,
      })
    }
    for (let k = 0; k < 20; k++) {
      leds.push({
        p: new Vector3(AX - AW / 2 + 0.2 + ((AW - 0.4) / 19) * k, y - U * 0.66, -0.32),
        s: 0.05,
        c: LED_TONES[(i * 3 + k) % LED_TONES.length],
        lit: k % 3 === 0,
      })
    }
  }

  // 左半边那条走线槽：竖着穿过整个机架，把一层层横板串起来
  parts.push({ p: new Vector3(-1.72, -SCENE_H / 2, -0.56), s: new Vector3(0.07, SCENE_H + 8, 0.34), c: HEX.deep })

  const rack = new InstancedMesh(box, bodyMat, parts.length)
  const m4 = new Matrix4()
  const qi = new Quaternion()
  const col = new Color()
  parts.forEach((part, i) => {
    m4.compose(part.p, qi, part.s)
    rack.setMatrixAt(i, m4)
    rack.setColorAt(i, col.setHex(part.c).convertSRGBToLinear())
  })
  rack.instanceMatrix.needsUpdate = true
  if (rack.instanceColor) rack.instanceColor.needsUpdate = true
  scene.add(rack)

  // 端口灯单独一趟：不吃光照、不参与色调映射，亮的那几颗直接越过泛光阈值。
  // 跟机架本体同一个 box 几何，还是两个 draw call。
  const ledMesh = new InstancedMesh(box, new MeshBasicMaterial({ toneMapped: false }), leds.length)
  leds.forEach((l, i) => {
    m4.compose(l.p, qi, new Vector3(l.s, l.s * 0.62, l.s))
    ledMesh.setMatrixAt(i, m4)
    col.setHex(l.c).convertSRGBToLinear()
    if (!l.lit) col.multiplyScalar(0.26)
    ledMesh.setColorAt(i, col)
  })
  ledMesh.instanceMatrix.needsUpdate = true
  if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true
  scene.add(ledMesh)

  /* ---------------------------------------------------------- 状态灯 */
  const lampMat = new MeshBasicMaterial({ toneMapped: false })
  const lamps = new InstancedMesh(box, lampMat, BAYS)
  const lampBase: Color[] = []
  for (let i = 0; i < BAYS; i++) {
    m4.compose(new Vector3(-2.52, -i * BAY_GAP + 0.3, -0.34), qi, new Vector3(0.1, 0.1, 0.1))
    lamps.setMatrixAt(i, m4)
    const c = new Color(LAMP[i]).convertSRGBToLinear()
    lampBase.push(c)
    lamps.setColorAt(i, c)
  }
  lamps.instanceMatrix.needsUpdate = true
  scene.add(lamps)

  /* ---------------------------------------------------------- 透镜 */
  const post = new Post(hdr, tier === 'high' ? 0.62 : 0.48)
  const lensMat = new ShaderMaterial({
    vertexShader: LENS_VERT,
    fragmentShader: LENS_FRAG,
    uniforms: {
      uBg: { value: post.bg.texture },
      uResolution: { value: new Vector2(2, 2) },
      uStrength: { value: 0.135 },
      uSpread: { value: 0.22 },
      uTint: { value: new Vector3(0.86, 0.94, 1.08) },
    },
    side: DoubleSide,
  })
  const lens = new Mesh(roundedSlab(), lensMat)
  // 透镜平面到相机 4.95，fov 38 → 半高 1.704；开口的 NDC 乘上它就是世界坐标
  const halfH = (6.2 - LENS_Z) * Math.tan((38 * Math.PI) / 360)
  let halfW = halfH * (typeof window === 'undefined' ? 1.6 : window.innerWidth / window.innerHeight)
  let apX = LENS_X / halfW
  let apY = 0.18
  let apS = 1
  lens.position.set(LENS_X, 0.52, LENS_Z)
  lens.renderOrder = 5
  scene.add(lens)

  /* ---------------------------------------------------------- 粒子 */
  const side = particleSide(tier)
  const particles = new Particles({ side, busX: BUS_X, top: 1.6, bottom: -SCENE_H - 1.6, hdr })
  particles.pixelRatio = dpr
  scene.add(particles.points)

  /* ---------------------------------------------------------- 尺寸 */
  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    halfW = halfH * camera.aspect
    const dw = Math.round(w * dpr)
    const dh = Math.round(h * dpr)
    post.setSize(dw, dh)
    ;(lensMat.uniforms.uResolution.value as Vector2).set(dw, dh)
  }
  resize()
  window.addEventListener('resize', resize)

  /* ---------------------------------------------------------- 丝印字带 */
  let disposed = false
  /*
   * 字带宽度不是想给多少就给多少：走线槽在屏上只有约 164px 宽，字要看得清就得
   * 占掉其中八成，也就是每行最多五个字符。长字符串只会被槽沿切成半截。
   */
  silkStrip([
    '88LIN',
    '4684',
    '502',
    'V5',
    'RACK',
    '55',
    'BUS',
    '18',
  ]).then((tex) => {
    if (disposed) return
    silkTex.value = tex
    raceMat.needsUpdate = true
  })

  /* ---------------------------------------------------------- 数字靶点 */
  let digitY = -BAY_GAP
  const setDigits = (text: string, y: number) => {
    const tex: DataTexture = digitTargets(text, side, 4.6)
    particles.setDigitTexture(tex)
    digitY = y
    particles.setDigitCenter(0.15, y, 0.7)
  }

  /* ---------------------------------------------------------- 主循环 */
  const pointerLocal = new Vector2(9, 9)
  let raf = 0
  let last = performance.now()
  let camY = 0
  let relay = 0
  let lastChannel = -1
  let digitMix = 0
  let running = true

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    if (!running) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = now / 1000
    const s = signal()

    if (s.channel !== lastChannel) {
      lastChannel = s.channel
      relay = 1
    }
    relay *= Math.pow(0.0015, dt) // 约 0.9 秒衰减到零

    // 相机：滚动进度直接映射到纵向位移，横向只做很轻的指针视差
    const targetY = -s.progress * SCENE_H
    camY += (targetY - camY) * Math.min(1, dt * 7.5)
    camera.position.y = camY
    camera.position.x += (s.px * 0.34 - camera.position.x) * Math.min(1, dt * 3.2)
    camera.rotation.y += (-s.px * 0.045 - camera.rotation.y) * Math.min(1, dt * 3.2)
    camera.rotation.x += (s.py * 0.03 - camera.rotation.x) * Math.min(1, dt * 3.2)

    // 透镜：对准当前机位在机身面板上开的那个洞。
    // DOM 只告诉我们「洞在视口哪、多大」（NDC），这里把它投到透镜平面上。
    // 没开窗的机位保持上一个开口，别让玻璃突然弹回中间。
    const ap = s.aperture
    if (ap) {
      apX = ap.x
      apY = ap.y
      // 按窗口的短边定缩放，留 14% 余量——玻璃的圆角边缘必须落在框内才认得出是一片镜片
      apS = Math.min((ap.w * halfW * 0.86) / LENS_W, (ap.h * halfH * 0.86) / LENS_H)
    }
    const lensTX = camera.position.x + apX * halfW + s.px * 0.14
    const lensTY = camera.position.y + apY * halfH + s.py * 0.16
    const k = Math.min(1, dt * 2.6)
    lens.position.x += (lensTX - lens.position.x) * k
    lens.position.y += (lensTY - lens.position.y) * k
    lens.scale.setScalar(lens.scale.x + (apS - lens.scale.x) * k)
    lens.rotation.y = Math.sin(t * 0.31) * 0.13 + s.px * 0.2 + relay * 0.22
    lens.rotation.x = Math.cos(t * 0.24) * 0.08 - s.py * 0.1
    lensMat.uniforms.uStrength.value = 0.13 + relay * 0.06
    lensMat.uniforms.uSpread.value = 0.21 + relay * 0.24

    // 灯：当前通道常亮并轻微呼吸，其余压暗
    for (let i = 0; i < BAYS; i++) {
      const live = i === s.channel
      const k = live ? 1.0 + Math.sin(t * 3.1) * 0.16 + relay * 0.7 : 0.17
      col.copy(lampBase[i]).multiplyScalar(k)
      lamps.setColorAt(i, col)
    }
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true

    raceMat.uniforms.uTime.value = t
    backdropMat.uniforms.uGlowY.value = -s.channel * BAY_GAP

    // 01 读数通道：粒子从流态收成真实数字
    const want = s.channel === 1 ? 1 : 0
    digitMix += (want - digitMix) * Math.min(1, dt * (want ? 1.9 : 3.4))
    particles.digitMix = digitMix

    if (s.pointerIn) {
      // 指针换算到管路横截面：只有指针真的靠近总线时才会拨动粒子
      pointerLocal.set(s.px * 3.6 - BUS_X + camera.position.x, s.py * 1.4)
    }
    particles.step(
      renderer,
      dt,
      t,
      Math.min(1.6, Math.abs(s.velocity) * 1.5) + relay * 0.5,
      pointerLocal,
      s.pointerIn ? 0.9 : 0,
    )

    post.bloom = 0.55 + relay * 0.5
    post.aberration = 0.05 + relay * 0.045

    // A：先画没有透镜的一趟，给透镜当折射源
    lens.visible = false
    renderer.setRenderTarget(post.bg)
    renderer.render(scene, camera)

    // B：完整一趟
    lens.visible = true
    renderer.setRenderTarget(post.main)
    renderer.render(scene, camera)

    // C + D
    post.present(renderer, t)
  }

  const onVis = () => {
    running = document.visibilityState === 'visible'
    last = performance.now()
  }
  document.addEventListener('visibilitychange', onVis)
  raf = requestAnimationFrame(tick)

  // 数字靶点比较吃 CPU（1024×256 取像素），等主线程闲下来再算
  const idle =
    (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ||
    ((cb: () => void) => window.setTimeout(cb, 600))
  idle(() => {
    if (!disposed) setDigits('4,684', -BAY_GAP)
  })
  void digitY

  return {
    setDigits,
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      particles.dispose()
      post.dispose()
      box.dispose()
      bodyMat.dispose()
      ;(ledMesh.material as MeshBasicMaterial).dispose()
      lampMat.dispose()
      lens.geometry.dispose()
      lensMat.dispose()
      backdrop.geometry.dispose()
      backdropMat.dispose()
      raceWall.geometry.dispose()
      raceMat.dispose()
      env.dispose()
      silkTex.value?.dispose()
      renderer.dispose()
    },
  }
}
