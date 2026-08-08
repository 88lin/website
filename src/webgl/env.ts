import * as THREE from 'three'

/**
 * 程序化生成的等距柱状环境贴图。
 * 铬合金体反射的就是这张图：骨白顶光 + 钴蓝色带 + 朱红色带 + 深色地面。
 * 全部在 canvas 上画出来，零网络请求，品牌色直接出现在金属反射里。
 */
export function makeBrandEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const w = 1024
  const h = 512
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!

  // 基础天地渐变
  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0.0, '#ffffff')
  base.addColorStop(0.34, '#f2e9db')
  base.addColorStop(0.52, '#cbbfae')
  base.addColorStop(0.72, '#4a4436')
  base.addColorStop(1.0, '#14131b')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // 顶部主光源：一块柔和的高亮矩形，给铬面一条干净的高光带
  const key = ctx.createRadialGradient(w * 0.28, h * 0.1, 10, w * 0.28, h * 0.1, h * 0.55)
  key.addColorStop(0, 'rgba(255,255,255,1)')
  key.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = key
  ctx.fillRect(0, 0, w, h)

  // 钴蓝色场
  const cobalt = ctx.createRadialGradient(w * 0.72, h * 0.34, 10, w * 0.72, h * 0.34, h * 0.72)
  cobalt.addColorStop(0, 'rgba(18,38,232,0.95)')
  cobalt.addColorStop(0.55, 'rgba(18,38,232,0.35)')
  cobalt.addColorStop(1, 'rgba(18,38,232,0)')
  ctx.fillStyle = cobalt
  ctx.fillRect(0, 0, w, h)

  // 朱红补光
  const verm = ctx.createRadialGradient(w * 0.06, h * 0.62, 10, w * 0.06, h * 0.62, h * 0.6)
  verm.addColorStop(0, 'rgba(255,59,20,0.9)')
  verm.addColorStop(0.6, 'rgba(255,59,20,0.25)')
  verm.addColorStop(1, 'rgba(255,59,20,0)')
  ctx.fillStyle = verm
  ctx.fillRect(0, 0, w, h)

  const verm2 = ctx.createRadialGradient(w * 0.99, h * 0.66, 10, w * 0.99, h * 0.66, h * 0.5)
  verm2.addColorStop(0, 'rgba(255,59,20,0.75)')
  verm2.addColorStop(1, 'rgba(255,59,20,0)')
  ctx.fillStyle = verm2
  ctx.fillRect(0, 0, w, h)

  // 水平细光条：让铬面出现「摄影棚灯管」质感的锐利反射
  ctx.globalAlpha = 0.9
  for (const [y, hh, alpha] of [
    [h * 0.19, 7, 1],
    [h * 0.26, 4, 0.7],
    [h * 0.44, 3, 0.45],
  ] as const) {
    const g = ctx.createLinearGradient(0, y, w, y)
    g.addColorStop(0, `rgba(255,255,255,0)`)
    g.addColorStop(0.2, `rgba(255,255,255,${alpha})`)
    g.addColorStop(0.8, `rgba(255,255,255,${alpha})`)
    g.addColorStop(1, `rgba(255,255,255,0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, y, w, hh)
  }
  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const rt = pmrem.fromEquirectangular(tex)
  tex.dispose()
  pmrem.dispose()
  return rt.texture
}
