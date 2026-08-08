import * as THREE from 'three'

/* 画布底板 —— 同时也是晶体的光台。
   three 的 transmission 只折射三维场景里的不透明物体，看不见 HTML 页面，
   而折射缓冲是用渲染器的清屏色清掉的。所以底板承担两件事：
   1) 底色严格等于 --color-paper 并绕开 tone mapping（只做色彩空间转换），
      画布和页面纸底之间不会出现色差接缝；
   2) 在晶簇背后画一团高对比的品牌色辉光加几道细光条 —— 没有这层结构，
      折射出来的就是一片纯色，晶体会读成磨砂塑料而不是玻璃。
   辉光画在同一张全屏面片上，而不是单独一块平面：单独的平面会在页面上留下
   一个矩形接缝（它写的是纯纸色，会盖掉底板自己的渐变）。 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec3 uPaper;
uniform vec3 uCobalt;
uniform vec3 uViolet;
uniform vec3 uVermilion;
uniform vec3 uInk;
uniform float uTime;
uniform float uTint;
uniform float uGlow;
uniform float uAspect;
uniform vec2 uShift;
uniform vec2 uAura;
uniform float uAuraR;
varying vec2 vUv;

float blob(vec2 p, vec2 c, float r) {
  return smoothstep(r, 0.0, length((p - c) * vec2(uAspect, 1.0)));
}

void main() {
  vec2 p = vUv + uShift;
  float t = uTime * 0.05;

  // ---- 大尺度环境色团：整页纸底的呼吸，强度必须压住，正文压在上面
  vec2 c1 = vec2(0.30 + sin(t * 0.9) * 0.05, 0.66 + cos(t * 0.7) * 0.05);
  vec2 c2 = vec2(0.74 + cos(t * 0.6) * 0.06, 0.34 + sin(t * 1.1) * 0.05);
  vec2 c3 = vec2(0.52 + sin(t * 0.4 + 2.0) * 0.08, 0.13 + cos(t * 0.5) * 0.04);
  float cool = mix(0.90, 0.22, uTint);
  float warm = mix(0.20, 0.95, uTint);

  vec3 col = uPaper;
  col = mix(col, uCobalt, blob(p, c1, 0.60) * 0.155 * uGlow * cool);
  col = mix(col, uVermilion, blob(p, c2, 0.54) * 0.145 * uGlow * warm);
  col = mix(col, uInk, blob(p, c3, 0.46) * 0.045 * uGlow);

  // ---- 光台：跟着晶簇走的一小团高饱和辉光，绝大部分被晶体挡住
  float ta = uTime * 0.17;
  vec2 q = (vUv - uAura) * vec2(uAspect, 1.0) / max(uAuraR, 0.0001);
  float d = length(q);
  float win = smoothstep(1.35, 0.0, d);              // 收敛窗，杜绝硬边
  // 光条用更紧的窗：它们是给晶体折射用的，露在页面上就是一道莫名其妙的细线
  float bwin = smoothstep(0.95, 0.0, d) * smoothstep(1.0, 0.62, abs(q.x));
  float lit = win * uGlow;

  vec2 a = vec2(-0.10 + sin(ta) * 0.06, 0.10 + cos(ta * 0.8) * 0.06);
  vec2 b = vec2(0.34 + cos(ta * 1.1) * 0.08, -0.20 + sin(ta * 0.7) * 0.06);
  vec2 c = vec2(0.04 + sin(ta * 0.6 + 1.7) * 0.09, 0.36 + cos(ta * 0.9) * 0.07);

  col = mix(col, uCobalt, smoothstep(1.05, 0.0, length(q - a)) * 0.16 * lit);
  col = mix(col, uCobalt, smoothstep(0.50, 0.0, length(q - a)) * 0.60 * lit * mix(1.0, 0.34, uTint));
  col = mix(col, uViolet, smoothstep(0.42, 0.0, length(q - c)) * 0.50 * lit);
  col = mix(col, uVermilion, smoothstep(0.40, 0.0, length(q - b)) * 0.58 * lit * mix(0.34, 1.0, uTint));

  // 三道细光条。直接看几乎察觉不到，但穿过晶体会被折射拉成锐利高光，
  // 色散的彩色边缘正是在这种高频结构上产生的。
  float bx = smoothstep(0.034, 0.0, abs(q.y + 0.02 - sin(ta * 0.5) * 0.16));
  col = mix(col, vec3(1.0), bx * 0.95 * bwin);
  float by = smoothstep(0.024, 0.0, abs(q.x + 0.06 + cos(ta * 0.42) * 0.15));
  col = mix(col, vec3(1.0), by * 0.80 * bwin);
  float bz = smoothstep(0.018, 0.0, abs(q.y - 0.44 + sin(ta * 0.33) * 0.13));
  col = mix(col, uInk, bz * 0.45 * bwin * uGlow);

  // 细颗粒，抹掉大面积渐变的色带
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.005;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

const DIST = 15
const OVER = 1.06

export class Backdrop {
  readonly mesh: THREE.Mesh
  private geo = new THREE.PlaneGeometry(1, 1)
  private mat: THREE.ShaderMaterial

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uPaper: { value: new THREE.Color(0xfbf5eb) },
        uCobalt: { value: new THREE.Color(0x1226e8) },
        uViolet: { value: new THREE.Color(0x7b4bff) },
        uVermilion: { value: new THREE.Color(0xff3b14) },
        uInk: { value: new THREE.Color(0x0e1230) },
        uTime: { value: 0 },
        uTint: { value: 0.4 },
        uGlow: { value: 1 },
        uAspect: { value: 1.6 },
        uShift: { value: new THREE.Vector2() },
        uAura: { value: new THREE.Vector2(0.5, 0.5) },
        uAuraR: { value: 0.25 },
      },
    })
    this.mesh = new THREE.Mesh(this.geo, this.mat)
    this.mesh.position.set(0, 0, -DIST)
    this.mesh.renderOrder = -1
    this.mesh.frustumCulled = false
  }

  /** 底板挂在相机下，永远正对视口，按视锥算出恰好铺满的尺寸 */
  fit(camera: THREE.PerspectiveCamera) {
    const h = 2 * DIST * Math.tan(((camera.fov / 2) * Math.PI) / 180)
    const w = h * camera.aspect
    this.mesh.scale.set(w * OVER, h * OVER, 1)
    this.mat.uniforms.uAspect.value = camera.aspect
  }

  update(t: number, tint: number, glow: number, px: number, py: number) {
    const u = this.mat.uniforms
    u.uTime.value = t
    u.uTint.value = tint
    u.uGlow.value = glow
    ;(u.uShift.value as THREE.Vector2).set(px * 0.02, -py * 0.02)
  }

  /**
   * 光台跟随晶簇。ndc 是晶簇中心投影到裁剪空间的位置，radius 是它在世界里
   * 的半径 —— 两者都换算成底板自己的 uv，才能在任何宽高比下对准。
   */
  aim(ndc: THREE.Vector3, worldRadius: number, camDist: number, fov: number) {
    const u = this.mat.uniforms
    ;(u.uAura.value as THREE.Vector2).set(ndc.x / OVER / 2 + 0.5, ndc.y / OVER / 2 + 0.5)
    const halfH = Math.max(camDist, 0.001) * Math.tan(((fov / 2) * Math.PI) / 180)
    u.uAuraR.value = worldRadius / halfH / OVER / 2
  }

  dispose() {
    this.geo.dispose()
    this.mat.dispose()
  }
}
