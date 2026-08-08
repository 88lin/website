import * as THREE from 'three'
import { SIMPLEX3D } from './noise.glsl'

type Uniforms = {
  uTime: { value: number }
  uAmp: { value: number }
  uFreq: { value: number }
  uTwist: { value: number }
}

/**
 * 液态铬合金体。
 * 高分辨二十面体 + 顶点着色器里的两倍频噪声位移；法线用切平面有限差分重算，
 * 因此 PBR 高光与环境反射始终贴合真实起伏，不会出现「贴图糊在球上」的塑料感。
 */
export class ChromeForm {
  readonly mesh: THREE.Mesh
  private uniforms: Uniforms
  private geo: THREE.IcosahedronGeometry
  private mat: THREE.MeshPhysicalMaterial

  constructor(env: THREE.Texture, lowPower: boolean) {
    this.geo = new THREE.IcosahedronGeometry(1, lowPower ? 14 : 30)

    this.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.26 },
      uFreq: { value: 1.0 },
      uTwist: { value: 0.0 },
    }

    this.mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#ffffff'),
      metalness: 1.0,
      roughness: 0.06,
      envMap: env,
      envMapIntensity: 1.55,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      iridescence: 0.42,
      iridescenceIOR: 1.45,
      iridescenceThicknessRange: [120, 520],
    })

    this.mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime
      shader.uniforms.uAmp = this.uniforms.uAmp
      shader.uniforms.uFreq = this.uniforms.uFreq
      shader.uniforms.uTwist = this.uniforms.uTwist

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `
          #include <common>
          uniform float uTime;
          uniform float uAmp;
          uniform float uFreq;
          uniform float uTwist;
          ${SIMPLEX3D}

          vec3 twistY(vec3 p, float k){
            float a = p.y * k;
            float s = sin(a), c = cos(a);
            return vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
          }

          vec3 displace(vec3 p){
            vec3 q = twistY(p, uTwist);
            float d = field(q * uFreq, uTime);
            return q * (1.0 + d * uAmp);
          }
          `
        )
        .replace(
          '#include <beginnormal_vertex>',
          /* glsl */ `
          vec3 nRef = normalize(position);
          vec3 tA = normalize(abs(nRef.y) < 0.99 ? cross(vec3(0.0,1.0,0.0), nRef) : vec3(1.0,0.0,0.0));
          vec3 tB = normalize(cross(nRef, tA));
          float eps = 0.035;
          vec3 pC = displace(nRef);
          vec3 pA = displace(normalize(nRef + tA * eps));
          vec3 pB = displace(normalize(nRef + tB * eps));
          vec3 objectNormal = normalize(cross(pA - pC, pB - pC));
          if (dot(objectNormal, nRef) < 0.0) objectNormal = -objectNormal;
          `
        )
        .replace(
          '#include <begin_vertex>',
          /* glsl */ `
          vec3 transformed = pC;
          `
        )
    }

    this.mesh = new THREE.Mesh(this.geo, this.mat)
    this.mesh.frustumCulled = false
  }

  set amp(v: number) {
    this.uniforms.uAmp.value = v
  }
  set freq(v: number) {
    this.uniforms.uFreq.value = v
  }
  set twist(v: number) {
    this.uniforms.uTwist.value = v
  }
  set roughness(v: number) {
    this.mat.roughness = v
  }

  update(t: number) {
    this.uniforms.uTime.value = t
  }

  dispose() {
    this.geo.dispose()
    this.mat.dispose()
  }
}
