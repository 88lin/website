import {
  BufferGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  type Material,
} from 'three'
import type { Atlas } from './atlas'

/** 字块总宽（几何单位）。摆位时按它换算成像素。 */
export const FOOT = 1

const DEPTH = 0.36
/** 字面四周的倒角。铅字的字肩，受光的那一圈。 */
const BEVEL = 0.055

type V3 = [number, number, number]

/**
 * 一枚铅字的几何。
 *
 * 手写而不是用 ExtrudeGeometry：真铅字是方角的，用不上曲线轮廓；
 * 省掉 Shape / Curve / 三角剖分那一整套之后，three 的打包体积也回到预算内。
 * 顶点不共享，computeVertexNormals 直接给出平法线——字肩那一圈的高光是硬的，
 * 这正是金属块该有的样子。
 */
function slugGeometry() {
  const h = 0.5
  const f = 0.5 - BEVEL
  const zc = DEPTH / 2
  const zb = DEPTH / 2 - BEVEL

  // 四角顺序：左下 → 右下 → 右上 → 左上（从 +Z 看是逆时针）
  const corner: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]
  const ring = (r: number, z: number): V3[] => corner.map(([sx, sy]) => [sx * r, sy * r, z])

  const A = ring(h, zb) // 字身前缘
  const B = ring(f, zc) // 字面
  const C = ring(h, -zb) // 字身后缘
  const D = ring(f, -zc) // 背面

  const capPos: number[] = []
  const capUv: number[] = []
  const sidePos: number[] = []
  const sideUv: number[] = []

  const pushTri = (dst: number[], a: V3, b: V3, c: V3) => dst.push(...a, ...b, ...c)
  const quad = (dst: number[], a: V3, b: V3, c: V3, d: V3) => {
    pushTri(dst, a, b, c)
    pushTri(dst, a, c, d)
  }

  // 字面：正面朝 +Z，UV 铺满 0..1
  quad(capPos, B[0], B[1], B[2], B[3])
  // 背面：反过来绕，UV 左右镜像，这样从后面看字也是正的
  quad(capPos, D[0], D[3], D[2], D[1])
  const uvFront = (p: V3) => [p[0] / (2 * f) + 0.5, p[1] / (2 * f) + 0.5]
  const uvBack = (p: V3) => [0.5 - p[0] / (2 * f), p[1] / (2 * f) + 0.5]
  for (const p of [B[0], B[1], B[2], B[0], B[2], B[3]]) capUv.push(...uvFront(p))
  for (const p of [D[0], D[3], D[2], D[0], D[2], D[1]]) capUv.push(...uvBack(p))

  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    quad(sidePos, A[i], A[j], B[j], B[i]) // 前字肩
    quad(sidePos, A[i], C[i], C[j], A[j]) // 字身侧壁
    quad(sidePos, C[i], D[i], D[j], C[j]) // 后字肩
  }
  for (let i = 0; i < sidePos.length / 3; i++) sideUv.push(0, 0)

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute([...capPos, ...sidePos], 3))
  geo.setAttribute('uv', new Float32BufferAttribute([...capUv, ...sideUv], 2))
  geo.addGroup(0, capPos.length / 3, 0)
  geo.addGroup(capPos.length / 3, sidePos.length / 3, 1)
  geo.computeVertexNormals()
  return geo
}

export type TypeMesh = {
  mesh: InstancedMesh
  aTile: InstancedBufferAttribute
  aFade: InstancedBufferAttribute
  /** 把某个实例指到图集的第 t 格 */
  setTile: (i: number, t: number) => void
  /** 单枚的不透明度。躲正文、过色场边界都走这里 */
  setFade: (i: number, v: number) => void
  dispose: () => void
}

/**
 * 让实例能各自淡出。
 *
 * 本来是拿缩放当淡出用的——躲正文时把字缩到 0。问题是缩放要连续经过
 * 0.05~0.2 这一段，一枚 40px 的铅字在这一段就是屏幕上一颗 3~8px 的灰点，
 * 一屏能有七八颗，看着像屏幕脏了。字号必须是常量，该不见的时候直接不见。
 *
 * 注入点选在 premultiplied_alpha 之前：three 的 alpha 混合走的是直通 alpha，
 * 这一步之后再乘就会漏掉 rgb 的预乘，边缘发亮。低于 1% 直接 discard，
 * 免得一枚看不见的字还在写深度、把它后面那枚挖掉。
 */
function fadeable(mat: MeshStandardMaterial, key: string, patch?: (s: Shader) => void) {
  mat.transparent = true
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif (vFade < 0.01) discard;'
      )
      .replace(
        '#include <premultiplied_alpha_fragment>',
        'gl_FragColor.a *= vFade;\n#include <premultiplied_alpha_fragment>'
      )
    patch?.(shader)
  }
  mat.customProgramCacheKey = () => key
}

type Shader = { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: unknown }> }

/**
 * 一盘活字。
 *
 * 单个 InstancedMesh，两种材质（字面 / 字身）= 2 次 draw call。
 * 字面只吃图集，不受实例色影响；字身只吃实例色。于是同一盘字里可以同时有
 * 白底黑字、墨底纸字、荧光黄底的字块，而每块的铅身各自跟着自己的面色走。
 */
export function makeTypeMesh(atlas: Atlas, count: number): TypeMesh {
  const geo = slugGeometry()

  const tileScale = 1 / atlas.grid
  const aTile = new InstancedBufferAttribute(new Float32Array(count * 2), 2)
  aTile.setUsage(DynamicDrawUsage)
  geo.setAttribute('aTile', aTile)

  const aFade = new InstancedBufferAttribute(new Float32Array(count), 1)
  aFade.setUsage(DynamicDrawUsage)
  geo.setAttribute('aFade', aFade)

  const faceMat = new MeshStandardMaterial({
    map: atlas.texture,
    roughness: 0.58,
    metalness: 0.12,
  })
  fadeable(faceMat, 'type-face', (shader) => {
    shader.uniforms.uTileScale = { value: tileScale }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aTile;\nuniform float uTileScale;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * uTileScale + aTile;')
    // 字面的颜色完全由图集决定，实例色不参与——否则面色会被铅身色二次染
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '')
  })

  const sideMat = new MeshStandardMaterial({ roughness: 0.66, metalness: 0.2 })
  fadeable(sideMat, 'type-side')

  const mesh = new InstancedMesh(geo, [faceMat, sideMat] as unknown as Material, count)
  mesh.frustumCulled = false
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)

  // 贴图默认 flipY，v=0 落在画布底边，所以行号要从下往上数
  const setTile = (i: number, t: number) => {
    const col = t % atlas.grid
    const row = Math.floor(t / atlas.grid)
    aTile.setXY(i, col * tileScale, 1 - (row + 1) * tileScale)
  }

  return {
    mesh,
    aTile,
    aFade,
    setTile,
    setFade: (i: number, v: number) => aFade.setX(i, v),
    dispose: () => {
      geo.dispose()
      faceMat.dispose()
      sideMat.dispose()
      mesh.dispose()
    },
  }
}
