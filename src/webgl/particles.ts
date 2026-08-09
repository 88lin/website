/**
 * 总线粒子。GPGPU 乒乓：一张 RGBA 浮点贴图存所有粒子状态，
 * 每帧用一个全屏 pass 把它推进一步，再用 Points 把它画出来。
 *
 * 状态存的是「管路局部坐标」而不是世界坐标：
 *   x → 相对总线中心的横向偏移（±0.6）
 *   y → 沿管路的进度 t（0..1），世界 y = mix(top, bottom, t)
 *   z → 纵向偏移（±0.6）
 *   w → 每颗粒子的固定相位（0..1）
 * 这么存是为了精度：设备不支持可渲染的 32 位浮点时会退成 16 位半浮点，
 * 半浮点在数值 20 附近的最小间隔约 0.016，直接存世界 y 会看见阶梯抖动；
 * 存 0..1 的进度，最小间隔约 0.0005，肉眼无差别。
 *
 * 「解出数字」的形态不在模拟里做，在渲染的顶点着色器里按 uDigitMix 混合：
 * 模拟只管流动，形态只管呈现，两边都不用为对方让步。
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { seedParticles } from './textures'

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

/* 值噪声 + 有限差分求旋度。够用，且比完整 simplex 短一半。 */
const NOISE = /* glsl */ `
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n = 0.0;
    for (int dx = 0; dx < 2; dx++) {
      for (int dy = 0; dy < 2; dy++) {
        for (int dz = 0; dz < 2; dz++) {
          vec3 o = vec3(float(dx), float(dy), float(dz));
          float w = mix(1.0 - u.x, u.x, o.x) * mix(1.0 - u.y, u.y, o.y) * mix(1.0 - u.z, u.z, o.z);
          n += w * hash3(i + o).x;
        }
      }
    }
    return n;
  }
  vec3 curl(vec3 p) {
    const float e = 0.14;
    float x1 = vnoise(p + vec3(0.0, e, 0.0)) - vnoise(p - vec3(0.0, e, 0.0));
    float x2 = vnoise(p + vec3(0.0, 0.0, e)) - vnoise(p - vec3(0.0, 0.0, e));
    float y1 = vnoise(p + vec3(0.0, 0.0, e) + 19.7) - vnoise(p - vec3(0.0, 0.0, e) + 19.7);
    float y2 = vnoise(p + vec3(e, 0.0, 0.0) + 19.7) - vnoise(p - vec3(e, 0.0, 0.0) + 19.7);
    float z1 = vnoise(p + vec3(e, 0.0, 0.0) - 31.3) - vnoise(p - vec3(e, 0.0, 0.0) - 31.3);
    float z2 = vnoise(p + vec3(0.0, e, 0.0) - 31.3) - vnoise(p - vec3(0.0, e, 0.0) - 31.3);
    return normalize(vec3(x1 - x2, y1 - y2, z1 - z2) + 1e-6);
  }
`

const SIM = /* glsl */ `
  uniform sampler2D uPrev;
  uniform sampler2D uSeed;
  uniform float uTime;
  uniform float uDt;
  uniform float uFlow;      // 滚动速度换算来的流量
  uniform float uRadius;    // 管路半径
  uniform vec2  uPointer;   // 指针在管路局部平面上的位置
  uniform float uPointerAmt;
  varying vec2 vUv;
  ${NOISE}

  void main() {
    vec4 s = texture2D(uPrev, vUv);
    vec4 seed = texture2D(uSeed, vUv);
    vec3 loc = s.xyz;
    float phase = s.w;

    // 沿管路推进：基础流量 + 滚动带来的冲量，快慢由 uFlow 给
    float speed = (0.055 + phase * 0.05) * (1.0 + uFlow * 2.6);
    loc.y += speed * uDt;

    // 旋度噪声只作用在横截面上，保证「像在管子里走」而不是四散
    vec3 c = curl(vec3(loc.x * 1.8, loc.y * 5.5 - uTime * 0.12, loc.z * 1.8) + phase);
    loc.x += c.x * uDt * 0.55;
    loc.z += c.z * uDt * 0.55;

    // 指针局部吸引：只在指针附近生效，离得远完全不受影响
    vec2 d = uPointer - loc.xz;
    float dist = length(d);
    loc.xz += normalize(d + 1e-6) * uPointerAmt * uDt * 1.6 * exp(-dist * 2.4);

    // 软约束回管壁
    float r = length(loc.xz);
    if (r > uRadius) loc.xz *= mix(1.0, uRadius / r, min(1.0, uDt * 6.0));

    // 走到底就从头再来，顺便换一个横截面上的位置，避免出现固定队列
    if (loc.y > 1.0) {
      loc.y -= 1.0;
      float a = fract(phase * 97.31 + uTime * 0.37) * 6.2831853;
      float rr = sqrt(fract(phase * 41.17 + uTime * 0.11)) * uRadius;
      loc.x = cos(a) * rr;
      loc.z = sin(a) * rr;
    }

    gl_FragColor = vec4(loc.xyz, seed.w);
  }
`

const RENDER_VERT = /* glsl */ `
  uniform sampler2D uPos;
  uniform sampler2D uDigit;
  uniform float uDigitMix;
  uniform vec3 uDigitCenter;
  uniform float uBusX;
  uniform float uTop;
  uniform float uBottom;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute vec2 aRef;
  varying float vPhase;
  varying float vGlow;

  void main() {
    vec4 s = texture2D(uPos, aRef);
    float phase = s.w;

    vec3 flow = vec3(uBusX + s.x, mix(uTop, uBottom, s.y), s.z);
    vec3 digit = uDigitCenter + texture2D(uDigit, aRef).xyz;

    // 每颗粒子的到位时间错开：整体从流态收成字形要有先后，
    // 一起到位看着像贴图切换，不像粒子在归位。
    float m = clamp((uDigitMix - phase * 0.35) / 0.65, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(flow, digit, m);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (1.0 + m * 0.55) / max(0.35, -mv.z);
    vPhase = phase;
    vGlow = m;
  }
`

const RENDER_FRAG = /* glsl */ `
  uniform vec3 uCoolColor;
  uniform vec3 uHotColor;
  uniform vec3 uLockColor;
  uniform float uAlpha;
  varying float vPhase;
  varying float vGlow;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float a = smoothstep(0.25, 0.0, r);
    vec3 col = mix(uCoolColor, uHotColor, smoothstep(0.35, 0.95, vPhase));
    col = mix(col, uLockColor, vGlow);
    // 加色混合的总能量 = 粒子数 × 点面积 × 单颗 alpha。6.5 万颗挤在一条总线上，
    // 单颗给 1.0 会把这一竖条累加到线性 50 以上，色调映射之后就是一片死白。
    // uAlpha 按粒子数反比给，换档位时视觉密度才不跳。
    gl_FragColor = vec4(col, a * (0.34 + vPhase * 0.4 + vGlow * 0.25) * uAlpha);
  }
`

export type ParticleOpts = {
  side: number
  busX: number
  top: number
  bottom: number
  hdr: boolean
}

export class Particles {
  readonly points: Points
  private rtA: WebGLRenderTarget
  private rtB: WebGLRenderTarget
  private seedTex: DataTexture
  private simMat: ShaderMaterial
  private renderMat: ShaderMaterial
  private simScene = new Scene()
  private simCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private simQuad: Mesh
  private flip = false
  private side: number

  constructor(o: ParticleOpts) {
    this.side = o.side
    const type = o.hdr ? FloatType : HalfFloatType
    const rt = () =>
      new WebGLRenderTarget(o.side, o.side, {
        format: RGBAFormat,
        type,
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      })
    this.rtA = rt()
    this.rtB = rt()

    // 初值：管路局部坐标（x/z 是横截面偏移，y 是 0..1 的进度）
    this.seedTex = seedParticles(o.side, 0, 0, 1)
    this.seedTex.minFilter = NearestFilter
    this.seedTex.magFilter = NearestFilter
    this.seedTex.needsUpdate = true

    this.simMat = new ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: SIM,
      uniforms: {
        uPrev: { value: this.seedTex as unknown as Texture },
        uSeed: { value: this.seedTex as unknown as Texture },
        uTime: { value: 0 },
        uDt: { value: 0.016 },
        uFlow: { value: 0 },
        uRadius: { value: 0.26 },
        uPointer: { value: new Vector2(9, 9) },
        uPointerAmt: { value: 0 },
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })

    const q = new BufferGeometry()
    q.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    q.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2))
    this.simQuad = new Mesh(q, this.simMat)
    this.simQuad.frustumCulled = false
    this.simScene.add(this.simQuad)

    const n = o.side * o.side
    const refs = new Float32Array(n * 2)
    const dummy = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      refs[i * 2] = ((i % o.side) + 0.5) / o.side
      refs[i * 2 + 1] = (Math.floor(i / o.side) + 0.5) / o.side
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(dummy, 3))
    geo.setAttribute('aRef', new BufferAttribute(refs, 2))
    geo.boundingSphere = null

    this.renderMat = new ShaderMaterial({
      vertexShader: RENDER_VERT,
      fragmentShader: RENDER_FRAG,
      uniforms: {
        uPos: { value: this.seedTex as unknown as Texture },
        uDigit: { value: null as Texture | null },
        uDigitMix: { value: 0 },
        uDigitCenter: { value: new Vector3() },
        uBusX: { value: o.busX },
        uTop: { value: o.top },
        uBottom: { value: o.bottom },
        uSize: { value: 26 },
        uPixelRatio: { value: 1 },
        uCoolColor: { value: new Vector3(0.62, 0.78, 1.0) },
        uHotColor: { value: new Vector3(0.95, 0.86, 0.18) },
        uLockColor: { value: new Vector3(1.0, 0.23, 0.17) },
        uAlpha: { value: 0.05 * (256 / o.side) ** 2 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })

    this.points = new Points(geo, this.renderMat)
    this.points.frustumCulled = false
    this.points.renderOrder = 3
  }

  setDigitTexture(tex: DataTexture | null) {
    this.renderMat.uniforms.uDigit.value = tex
    if (tex) {
      tex.minFilter = LinearFilter
      tex.magFilter = LinearFilter
      tex.needsUpdate = true
    }
  }

  setDigitCenter(x: number, y: number, z: number) {
    ;(this.renderMat.uniforms.uDigitCenter.value as Vector3).set(x, y, z)
  }

  set digitMix(v: number) {
    this.renderMat.uniforms.uDigitMix.value = v
  }
  get digitMix() {
    return this.renderMat.uniforms.uDigitMix.value as number
  }
  set pixelRatio(v: number) {
    this.renderMat.uniforms.uPixelRatio.value = v
  }

  /** 第一帧从种子纹理起步，之后一律读上一帧的 ping-pong 结果。 */
  private first = true

  step(r: WebGLRenderer, dt: number, time: number, flow: number, pointer: Vector2, pointerAmt: number) {
    const src = this.flip ? this.rtB : this.rtA
    const dst = this.flip ? this.rtA : this.rtB
    this.simMat.uniforms.uPrev.value = this.first ? this.seedTex : src.texture
    this.simMat.uniforms.uTime.value = time
    this.simMat.uniforms.uDt.value = Math.min(0.05, dt)
    this.simMat.uniforms.uFlow.value = flow
    ;(this.simMat.uniforms.uPointer.value as Vector2).copy(pointer)
    this.simMat.uniforms.uPointerAmt.value = pointerAmt

    r.setRenderTarget(dst)
    r.render(this.simScene, this.simCam)
    r.setRenderTarget(null)

    this.renderMat.uniforms.uPos.value = dst.texture
    this.flip = !this.flip
    this.first = false
  }

  get count() {
    return this.side * this.side
  }

  dispose() {
    this.rtA.dispose()
    this.rtB.dispose()
    this.seedTex.dispose()
    this.simMat.dispose()
    this.renderMat.dispose()
    this.simQuad.geometry.dispose()
    this.points.geometry.dispose()
  }
}
