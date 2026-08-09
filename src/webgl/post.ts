/**
 * 后期链。四步，一步都不多：
 *   A. 亮部提取（只留超过阈值的部分）
 *   B. 两趟可分离模糊（横 → 竖，1/4 分辨率）
 *   C. 合成：主画面 + 泛光 + 径向色散 + 网版颗粒
 *
 * 不引 EffectComposer / UnrealBloomPass。那一套要多带 5 个 pass 类、
 * 一个 CopyShader 和一整套 RT 管理，而这里真正需要的只有上面三步。
 */

import {
  BufferAttribute,
  BufferGeometry,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'

/** 全屏三角形。比全屏四边形少一次对角线上的重复着色。 */
const fullscreen = () => {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2))
  return g
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const BRIGHT = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = smoothstep(uThreshold, uThreshold + 0.32, l);
    gl_FragColor = vec4(c * k, 1.0);
  }
`

/* 9 抽样高斯，权重来自 sigma≈2.4 的一维核，两趟合起来等效 9×9。 */
const BLUR = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    float w[5];
    w[0] = 0.2270270270;
    w[1] = 0.1945945946;
    w[2] = 0.1216216216;
    w[3] = 0.0540540541;
    w[4] = 0.0162162162;
    vec3 sum = texture2D(uTex, vUv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
      vec2 o = uDir * float(i);
      sum += texture2D(uTex, vUv + o).rgb * w[i];
      sum += texture2D(uTex, vUv - o).rgb * w[i];
    }
    gl_FragColor = vec4(sum, 1.0);
  }
`

/**
 * 合成。色散在边缘才出现（中心一像素都不偏），颗粒是网版印刷的那种
 * 规则半调 + 一点随机，不是电视雪花。
 */
const COMPOSITE = /* glsl */ `
  uniform sampler2D uMain;
  uniform sampler2D uBloom;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uBloomStrength;
  uniform float uAberration;
  uniform float uGrain;
  uniform float uExposure;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }

  // ACES 近似（Narkowicz 2015）。整条链路是线性 HDR，最后必须压回可显示范围，
  // 否则高光直接钳在 1.0 —— 灯、丝印字、透镜高光会连成一片死白。
  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  // 线性 → sRGB。自绘全屏四边形不走 three 的 colorspace_fragment，得自己来。
  vec3 toSRGB(vec3 c) {
    c = max(c, vec3(0.0));
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }

  void main() {
    vec2 c = vUv - 0.5;
    float r2 = dot(c, c);

    // 径向色散：中心为 0，越靠边越明显
    vec2 off = c * r2 * uAberration;
    vec3 col;
    col.r = texture2D(uMain, vUv + off).r;
    col.g = texture2D(uMain, vUv).g;
    col.b = texture2D(uMain, vUv - off).b;

    col += texture2D(uBloom, vUv).rgb * uBloomStrength;

    // 极轻的暗角，把视线收回中间，不做成 Instagram 那种黑圈。放在色调映射之前，
    // 因为它是「进光量」的事，不是「显示亮度」的事。
    col *= 1.0 - r2 * 0.14;

    col = toSRGB(aces(col * uExposure));

    // 网版半调点在显示空间里加：屏幕空间固定网格，随机只用来打散摩尔纹。
    // 若放在色调映射之前，暗部会被压没、亮部会被压平，颗粒就不匀了。
    vec2 px = vUv * uResolution;
    float dots = step(0.5, fract((px.x + px.y * 0.5) * 0.5));
    float n = hash(px + fract(uTime) * 91.7);
    col += (dots * 0.5 + n * 0.5 - 0.5) * uGrain;
    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
  }
`

type RTOpts = { type: typeof HalfFloatType | typeof UnsignedByteType }

const makeRT = (w: number, h: number, o: RTOpts) =>
  new WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
    format: RGBAFormat,
    type: o.type,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })

export class Post {
  readonly bg: WebGLRenderTarget
  readonly main: WebGLRenderTarget
  private a: WebGLRenderTarget
  private b: WebGLRenderTarget

  private quad: Mesh
  private cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private sceneRT = new Scene()

  private mBright: ShaderMaterial
  private mBlur: ShaderMaterial
  private mComp: ShaderMaterial

  /** bgRT 的分辨率系数。透镜采的是它，降一点没人看得出来，但省一整趟填充。 */
  private bgScale: number

  constructor(hdr: boolean, bgScale = 0.6) {
    const type = hdr ? HalfFloatType : UnsignedByteType
    this.bgScale = bgScale
    this.bg = makeRT(2, 2, { type })
    this.main = makeRT(2, 2, { type })
    this.a = makeRT(2, 2, { type })
    this.b = makeRT(2, 2, { type })
    this.bg.depthBuffer = true
    this.main.depthBuffer = true

    this.mBright = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: BRIGHT,
      uniforms: { uTex: { value: null as Texture | null }, uThreshold: { value: 0.86 } },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })
    this.mBlur = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: BLUR,
      uniforms: { uTex: { value: null as Texture | null }, uDir: { value: new Vector2() } },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })
    this.mComp = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: COMPOSITE,
      uniforms: {
        uMain: { value: null as Texture | null },
        uBloom: { value: null as Texture | null },
        uResolution: { value: new Vector2(2, 2) },
        uTime: { value: 0 },
        uBloomStrength: { value: 0.34 },
        uAberration: { value: 0.018 },
        uGrain: { value: 0.05 },
        uExposure: { value: 0.95 },
      },
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })

    this.quad = new Mesh(fullscreen(), this.mBright)
    this.quad.frustumCulled = false
    this.sceneRT.add(this.quad)
  }

  setSize(w: number, h: number) {
    this.main.setSize(w, h)
    this.bg.setSize(Math.round(w * this.bgScale), Math.round(h * this.bgScale))
    const q = Math.max(2, Math.round(w * 0.25))
    const p = Math.max(2, Math.round(h * 0.25))
    this.a.setSize(q, p)
    this.b.setSize(q, p)
    this.mComp.uniforms.uResolution.value.set(w, h)
  }

  private draw(r: WebGLRenderer, mat: ShaderMaterial, target: WebGLRenderTarget | null) {
    this.quad.material = mat
    r.setRenderTarget(target)
    r.render(this.sceneRT, this.cam)
  }

  /** 泛光 + 合成，直接画到屏幕。 */
  present(r: WebGLRenderer, time: number) {
    this.mBright.uniforms.uTex.value = this.main.texture
    this.draw(r, this.mBright, this.a)

    const qw = this.a.width
    const qh = this.a.height
    this.mBlur.uniforms.uTex.value = this.a.texture
    this.mBlur.uniforms.uDir.value.set(1 / qw, 0)
    this.draw(r, this.mBlur, this.b)
    this.mBlur.uniforms.uTex.value = this.b.texture
    this.mBlur.uniforms.uDir.value.set(0, 1 / qh)
    this.draw(r, this.mBlur, this.a)

    this.mComp.uniforms.uMain.value = this.main.texture
    this.mComp.uniforms.uBloom.value = this.a.texture
    this.mComp.uniforms.uTime.value = time
    this.draw(r, this.mComp, null)
    r.setRenderTarget(null)
  }

  set bloom(v: number) {
    this.mComp.uniforms.uBloomStrength.value = v
  }
  set aberration(v: number) {
    this.mComp.uniforms.uAberration.value = v
  }
  set grain(v: number) {
    this.mComp.uniforms.uGrain.value = v
  }

  dispose() {
    this.bg.dispose()
    this.main.dispose()
    this.a.dispose()
    this.b.dispose()
    this.quad.geometry.dispose()
    this.mBright.dispose()
    this.mBlur.dispose()
    this.mComp.dispose()
  }
}
