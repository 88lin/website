import * as THREE from 'three'
import { SIMPLEX3D } from './noise.glsl'

/**
 * GPU 粒子场。位置在着色器里被同一族噪声推动，
 * 与铬合金体共享一个"流场"，所以两者看起来属于同一个世界。
 */
export class ParticleField {
  readonly points: THREE.Points
  private geo: THREE.BufferGeometry
  private mat: THREE.ShaderMaterial

  constructor(count: number, dpr: number) {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const tint = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // 环形壳层分布，中心留空给主体
      const r = 2.6 + Math.pow(Math.random(), 0.6) * 6.2
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.62
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) * 0.75
      seed[i] = Math.random()
      tint[i] = Math.random()
    }

    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    this.geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))

    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.0 },
        uSize: { value: 2.0 * dpr },
        uCobalt: { value: new THREE.Color('#1226e8') },
        uVermilion: { value: new THREE.Color('#ff3b14') },
        uInk: { value: new THREE.Color('#0e1230') },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSize;
        attribute float aSeed;
        attribute float aTint;
        varying float vTint;
        varying float vFade;
        ${SIMPLEX3D}
        void main(){
          vec3 p = position;
          float t = uTime * 0.14 + aSeed * 6.283;
          p.x += snoise(p * 0.12 + vec3(t, 0.0, 0.0)) * 0.85;
          p.y += snoise(p * 0.12 + vec3(0.0, t, 0.0)) * 0.85;
          p.z += snoise(p * 0.12 + vec3(0.0, 0.0, t)) * 0.85;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vFade = smoothstep(24.0, 5.0, d) * (0.35 + 0.65 * aSeed);
          vTint = aTint;
          gl_PointSize = uSize * (7.0 / max(d, 0.6));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform vec3 uCobalt;
        uniform vec3 uVermilion;
        uniform vec3 uInk;
        varying float vTint;
        varying float vFade;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = dot(uv, uv);
          if (d > 0.25) discard;
          float a = smoothstep(0.25, 0.02, d);
          vec3 col = vTint < 0.55 ? uInk : (vTint < 0.85 ? uCobalt : uVermilion);
          gl_FragColor = vec4(col, a * vFade * uOpacity);
        }
      `,
    })

    this.points = new THREE.Points(this.geo, this.mat)
    this.points.frustumCulled = false
  }

  set opacity(v: number) {
    this.mat.uniforms.uOpacity.value = v
  }

  update(t: number) {
    this.mat.uniforms.uTime.value = t
  }

  dispose() {
    this.geo.dispose()
    this.mat.dispose()
  }
}
