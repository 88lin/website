import * as THREE from 'three'
import { SIMPLEX3D } from './noise.glsl'

/**
 * 写实素材载体。
 * 生成的写实图不是平贴在页面上，而是映射到一块有真实几何起伏的曲面上：
 * 顶点做桶形弯曲 + 噪声波动，片元做随离心距离增长的 RGB 通道偏移与边缘羽化，
 * 再叠一层菲涅尔式品牌色轮廓光，使它与铬合金体处在同一套光照语言里。
 */
export class SubjectPlane {
  readonly mesh: THREE.Mesh
  private geo: THREE.PlaneGeometry
  private mat: THREE.ShaderMaterial

  constructor(texture: THREE.Texture, aspect: number, lowPower: boolean) {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    this.geo = new THREE.PlaneGeometry(aspect, 1, lowPower ? 24 : 72, lowPower ? 24 : 72)

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uMap: { value: texture },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uWarp: { value: 0.09 },
        uShift: { value: 0.006 },
        uFeatherIn: { value: 0.3 },
        uFeatherOut: { value: 0.52 },
        uRimA: { value: new THREE.Color('#1226e8') },
        uRimB: { value: new THREE.Color('#ff3b14') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uWarp;
        varying vec2 vUv;
        varying float vRim;
        ${SIMPLEX3D}
        void main(){
          vUv = uv;
          vec3 p = position;
          vec2 c = uv - 0.5;
          float r2 = dot(c, c);
          p.z -= r2 * 0.85;                                   // 桶形弯曲
          p.z += snoise(vec3(uv * 2.4, uTime * 0.25)) * uWarp; // 缓慢起伏
          vRim = smoothstep(0.02, 0.24, r2);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOpacity;
        uniform float uShift;
        uniform float uFeatherIn;
        uniform float uFeatherOut;
        uniform vec3 uRimA;
        uniform vec3 uRimB;
        varying vec2 vUv;
        varying float vRim;
        void main(){
          vec2 c = vUv - 0.5;
          float d = length(c);
          vec2 dir = d > 0.0001 ? c / d : vec2(0.0);
          float k = uShift * d * 2.4;
          float r = texture2D(uMap, vUv + dir * k).r;
          vec4 g = texture2D(uMap, vUv);
          float b = texture2D(uMap, vUv - dir * k).b;
          vec3 col = vec3(r, g.g, b);

          // 品牌色轮廓光
          col = mix(col, mix(uRimA, uRimB, vUv.x), vRim * 0.16);

          // 椭圆羽化，去掉硬边矩形感
          float mask = smoothstep(uFeatherOut, uFeatherIn, length(vec2(c.x * 1.02, c.y)));
          gl_FragColor = vec4(col, g.a * mask * uOpacity);
        }
      `,
    })

    this.mesh = new THREE.Mesh(this.geo, this.mat)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
  }

  /** 羽化半径（UV 单位）。inner 内全实，outer 外全透。 */
  setFeather(inner: number, outer: number) {
    this.mat.uniforms.uFeatherIn.value = inner
    this.mat.uniforms.uFeatherOut.value = outer
  }

  set opacity(v: number) {
    this.mat.uniforms.uOpacity.value = v
    this.mesh.visible = v > 0.003
  }
  get opacity() {
    return this.mat.uniforms.uOpacity.value as number
  }

  update(t: number) {
    this.mat.uniforms.uTime.value = t
  }

  dispose() {
    this.geo.dispose()
    this.mat.uniforms.uMap.value?.dispose?.()
    this.mat.dispose()
  }
}
