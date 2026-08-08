import * as THREE from 'three'

/* 程序化生成的多面色散玻璃晶体群。
   没有下载任何模型：晶体是参数化的棱柱 + 双锥顶，每个面独立法线（硬棱）。
   材质用 MeshPhysicalMaterial 的 transmission + dispersion + iridescence，
   three r180 原生支持真实色散，折射出的边缘会分出彩虹条。 */

function rng(seed: number) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export type CrystalSpec = {
  sides: number
  height: number
  radius: number
  taper: number
  tipTop: number
  tipBottom: number
  jitter: number
  seed: number
}

/**
 * 棱柱主体 + 上下锥顶。返回非索引几何，每个三角形独占顶点，
 * computeVertexNormals() 之后自然得到平面着色的硬棱。
 */
export function crystalGeometry(spec: CrystalSpec): THREE.BufferGeometry {
  const { sides, height, radius, taper, tipTop, tipBottom, jitter } = spec
  const rand = rng(spec.seed)
  const h = height / 2

  // 每条棱单独抖动半径，避免看起来像规则的工业管件
  const rMul: number[] = []
  for (let i = 0; i < sides; i++) rMul.push(1 + (rand() * 2 - 1) * jitter)

  const ring = (y: number, scale: number) =>
    Array.from({ length: sides }, (_, i) => {
      const th = (i / sides) * Math.PI * 2
      const r = radius * scale * rMul[i]
      return new THREE.Vector3(Math.sin(th) * r, y, Math.cos(th) * r)
    })

  const top = ring(h, 1)
  const bot = ring(-h, taper)
  const apexT = new THREE.Vector3((rand() - 0.5) * radius * 0.3, h + tipTop, (rand() - 0.5) * radius * 0.3)
  const apexB = new THREE.Vector3((rand() - 0.5) * radius * 0.3, -h - tipBottom, (rand() - 0.5) * radius * 0.3)

  const tris: THREE.Vector3[][] = []
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides
    tris.push([top[i], bot[i], top[j]])
    tris.push([bot[i], bot[j], top[j]])
    tris.push([top[i], top[j], apexT])
    tris.push([bot[j], bot[i], apexB])
  }

  // 凸体：面法线必须与质心同向。不同向就换两个顶点，绕序问题一次性解决。
  const n = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const c = new THREE.Vector3()
  const pos = new Float32Array(tris.length * 9)
  tris.forEach((t, k) => {
    ab.subVectors(t[1], t[0])
    ac.subVectors(t[2], t[0])
    n.crossVectors(ab, ac)
    c.copy(t[0]).add(t[1]).add(t[2]).multiplyScalar(1 / 3)
    const tri = n.dot(c) < 0 ? [t[0], t[2], t[1]] : t
    for (let v = 0; v < 3; v++) {
      pos[k * 9 + v * 3] = tri[v].x
      pos[k * 9 + v * 3 + 1] = tri[v].y
      pos[k * 9 + v * 3 + 2] = tri[v].z
    }
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

type Piece = {
  mesh: THREE.Mesh
  base: THREE.Vector3
  axis: THREE.Vector3
  rate: number
  phase: number
  bob: number
}

/** 每块晶体的构成参数。attenuation 决定透过它的光被染成什么颜色。 */
const RECIPE: Array<{
  spec: Omit<CrystalSpec, 'seed'>
  seed: number
  at: number
  atDist: number
  pos: [number, number, number]
  scale: number
  rate: number
  bob: number
}> = [
  // 主晶：高瘦六棱柱，钴蓝芯
  { spec: { sides: 6, height: 2.5, radius: 0.62, taper: 0.82, tipTop: 1.05, tipBottom: 0.5, jitter: 0.1 }, seed: 7, at: 0x6b7dff, atDist: 4.2, pos: [0, 0.12, 0], scale: 1, rate: 0.1, bob: 0.09 },
  // 侧晶：矮胖五棱，朱红芯
  { spec: { sides: 5, height: 1.25, radius: 0.52, taper: 0.7, tipTop: 0.62, tipBottom: 0.34, jitter: 0.16 }, seed: 23, at: 0xff8a6b, atDist: 3.6, pos: [0.95, -0.72, 0.42], scale: 0.82, rate: -0.16, bob: 0.13 },
  // 碎晶：细长七棱，近无色
  { spec: { sides: 7, height: 2.0, radius: 0.3, taper: 0.9, tipTop: 0.8, tipBottom: 0.62, jitter: 0.13 }, seed: 41, at: 0xeaf0ff, atDist: 7.0, pos: [-1.02, 0.58, 0.3], scale: 0.9, rate: 0.21, bob: 0.11 },
  // 背晶：宽扁八棱，冷调
  { spec: { sides: 8, height: 0.9, radius: 0.78, taper: 0.62, tipTop: 0.42, tipBottom: 0.28, jitter: 0.09 }, seed: 59, at: 0xa8bcff, atDist: 5.0, pos: [-0.72, -0.95, -0.55], scale: 0.86, rate: -0.12, bob: 0.08 },
  // 远晶：小六棱，暖调
  { spec: { sides: 6, height: 1.5, radius: 0.34, taper: 0.78, tipTop: 0.66, tipBottom: 0.4, jitter: 0.18 }, seed: 83, at: 0xffcdb4, atDist: 4.6, pos: [1.16, 0.86, -0.42], scale: 0.7, rate: 0.26, bob: 0.14 },
  // 小碎片：五棱短锥
  { spec: { sides: 5, height: 0.66, radius: 0.28, taper: 0.66, tipTop: 0.5, tipBottom: 0.24, jitter: 0.2 }, seed: 97, at: 0xc7d6ff, atDist: 6.0, pos: [-1.55, -0.2, 0.66], scale: 0.72, rate: -0.3, bob: 0.16 },
]

const _bob = new THREE.Vector3()

export class CrystalCluster {
  readonly group = new THREE.Group()
  private pieces: Piece[] = []
  private mats: THREE.MeshPhysicalMaterial[] = []
  private geos: THREE.BufferGeometry[] = []

  constructor(env: THREE.Texture, lowPower: boolean) {
    const recipes = lowPower ? RECIPE.slice(0, 4) : RECIPE
    const rand = rng(1337)

    for (const r of recipes) {
      const geo = crystalGeometry({ ...r.spec, seed: r.seed })
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.02 + (r.seed % 7) * 0.008,
        transmission: 1,
        // 厚度直接决定折射位移量。薄了就只是一块淡色玻璃，看不出折射
        thickness: 2.4 * r.scale,
        ior: 1.54 + (r.seed % 5) * 0.03,
        // 必须一开始就 > 0：dispersion 从 0 变非 0 会触发 shader 重编译
        dispersion: lowPower ? 2.4 : 5.2,
        iridescence: lowPower ? 0 : 0.55,
        iridescenceIOR: 1.34,
        iridescenceThicknessRange: [140, 520],
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMap: env,
        envMapIntensity: 2.1,
        attenuationColor: new THREE.Color(r.at),
        attenuationDistance: r.atDist,
        specularIntensity: 1,
        flatShading: true,
        side: THREE.FrontSide,
      })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.scale.setScalar(r.scale)
      mesh.rotation.set(rand() * 0.6 - 0.3, rand() * Math.PI * 2, rand() * 0.5 - 0.25)
      this.group.add(mesh)

      this.pieces.push({
        mesh,
        base: new THREE.Vector3(...r.pos),
        axis: new THREE.Vector3(rand() * 0.5 - 0.25, 1, rand() * 0.5 - 0.25).normalize(),
        rate: r.rate,
        phase: rand() * Math.PI * 2,
        bob: r.bob,
      })
      this.mats.push(mat)
      this.geos.push(geo)
    }
  }

  /** spread 拉开/收拢星座，dispersion 调色散强度 */
  update(t: number, spread: number, dispersion: number, still: boolean) {
    for (const p of this.pieces) {
      _bob.set(0, still ? 0 : Math.sin(t * 0.42 + p.phase) * p.bob, 0)
      p.mesh.position.copy(p.base).multiplyScalar(spread).add(_bob)
      if (!still) p.mesh.rotateOnAxis(p.axis, p.rate * 0.0075)
    }
    for (const m of this.mats) {
      if (Math.abs(m.dispersion - dispersion) > 0.01) m.dispersion = dispersion
    }
  }

  dispose() {
    for (const g of this.geos) g.dispose()
    for (const m of this.mats) m.dispose()
  }
}
