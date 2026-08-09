/**
 * 程序化贴图。一张都不下载——环境光、丝印字条、数字靶点全部现画。
 *
 * 理由不只是省流量：这些内容跟站点数据是绑定的（4,684 / 502 / 55 会变），
 * 画出来的东西必须跟 src/content/site.ts 是同一个真相来源，不能是美工图。
 */

import { CanvasTexture, DataTexture, EquirectangularReflectionMapping, FloatType, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three'

const C = {
  chassis: '#1b4fd8',
  deep: '#12308c',
  lift: '#4c82f0',
  lemon: '#f2da2e',
  verm: '#ff3a2c',
  jade: '#12a594',
  panel: '#fffdf4',
  ink: '#10122b',
}

const make2D = (w: number, h: number) => {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  return { cv, ctx }
}

/** 等距柱状环境贴图：上方冷白补光、腰部钴蓝色场、下方墨色地面反射。 */
export function envTexture() {
  const { cv, ctx } = make2D(256, 128)
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0.0, '#eef3ff')
  g.addColorStop(0.28, C.lift)
  g.addColorStop(0.55, C.chassis)
  g.addColorStop(0.78, C.deep)
  g.addColorStop(1.0, '#070a1c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 128)

  // 两盏偏色的补光，让 clearcoat 上出现两条不同颜色的高光带
  const spot = (x: number, y: number, r: number, color: string, a: number) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, color)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = a
    ctx.fillStyle = rg
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
    ctx.globalAlpha = 1
  }
  spot(58, 30, 52, C.lemon, 0.75)
  spot(196, 44, 46, C.verm, 0.5)
  spot(128, 16, 70, '#ffffff', 0.45)

  const tex = new CanvasTexture(cv)
  tex.mapping = EquirectangularReflectionMapping
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/**
 * 丝印字条：一条竖着重复的巨型等宽字带，透镜后面折射出来的就是它。
 * 内容是真的——通道号、handle、两个核心数字。
 */
export async function silkStrip(lines: string[]) {
  /*
   * 尺寸是被走线槽倒推出来的：槽在屏上约 164px 宽。字带是折射素材、是背景里的
   * 一层信息，不是标题——占满槽宽会盖过前景，所以让五个等宽字符（3em = 435px）
   * 只占 720px 画布的六成，落到屏上约 99px 宽、33px 高。
   * 横竖比例 720:1600 必须和着色器里的 0.5085 配平，否则字会被拉扁。
   */
  const W = 720
  const LH = 200
  const H = LH * lines.length // 精确整倍：着色器用 fract 平铺，留白会在接缝处露馅
  const { cv, ctx } = make2D(W, H)

  ctx.fillStyle = C.deep
  ctx.fillRect(0, 0, W, H)

  // 丝印网点：网版印刷的半调网，不是随手加的噪点
  ctx.fillStyle = 'rgba(255,253,244,0.09)'
  for (let y = 0; y < H; y += 12) {
    for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) {
      ctx.fillRect(x, y, 3, 3)
    }
  }

  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.load('800 145px "JetBrains Mono"')
  } catch {
    /* 字体没就绪就用系统等宽，图是折射素材，不影响可读性 */
  }
  ctx.font = '800 145px "JetBrains Mono", ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center' // 槽是以总线为中心的，字不居中就会被槽沿切掉
  const tones = [C.lemon, C.panel, C.verm, C.jade]
  lines.forEach((line, i) => {
    // 每行下面压一条细规线，读起来才像丝印刻度而不是漂浮的字
    ctx.fillStyle = 'rgba(255,253,244,0.16)'
    ctx.fillRect(W * 0.16, i * LH + LH - 14, W * 0.68, 3)
    ctx.fillStyle = tones[i % tones.length]
    ctx.fillText(line, W / 2, i * LH + LH * 0.46)
  })

  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/**
 * 数字靶点。把要「解出来」的数字画进画布，取出所有不透明像素，
 * 按粒子数均匀抽样成一张 RGBA Float 的位置贴图。
 *
 * 在 CPU 上抽样而不是在着色器里采：着色器采样得循环重试才能落到笔画上，
 * 又慢又会在字的稀疏处结块。
 */
export function digitTargets(text: string, side: number, worldW = 5.2) {
  const W = 1024
  const H = 256
  const { ctx } = make2D(W, H)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.font = '800 168px "JetBrains Mono", ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center' // 带是以总线为中心的高斯，字不居中就会飘到带外面
  ctx.fillStyle = '#fff'
  ctx.fillText(text, W / 2, H / 2)

  const img = ctx.getImageData(0, 0, W, H).data
  const hits: number[] = []
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (img[(y * W + x) * 4] > 128) hits.push(y * W + x)
    }
  }

  const n = side * side
  const data = new Float32Array(n * 4)
  const worldH = (worldW * H) / W
  if (hits.length === 0) return new DataTexture(data, side, side, RGBAFormat, FloatType)

  for (let i = 0; i < n; i++) {
    const p = hits[(i * 2654435761) % hits.length]
    const x = p % W
    const y = Math.floor(p / W)
    data[i * 4 + 0] = (x / W - 0.5) * worldW
    data[i * 4 + 1] = -(y / H - 0.5) * worldH
    data[i * 4 + 2] = (((i * 1103515245) % 1000) / 1000 - 0.5) * 0.18
    data[i * 4 + 3] = 1
  }
  const tex = new DataTexture(data, side, side, RGBAFormat, FloatType)
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}

/** 粒子初始状态：散在总线管路上，带各自的相位与寿命。 */
export function seedParticles(side: number, busX: number, top: number, bottom: number) {
  const n = side * side
  const data = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 0.25
    data[i * 4 + 0] = busX + Math.cos(a) * r
    data[i * 4 + 1] = top + Math.random() * (bottom - top)
    data[i * 4 + 2] = Math.sin(a) * r
    data[i * 4 + 3] = Math.random()
  }
  const tex = new DataTexture(data, side, side, RGBAFormat, FloatType)
  tex.needsUpdate = true
  return tex
}
