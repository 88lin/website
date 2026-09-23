/**
 * 微信二维码的制版脚本。跑法：node scripts/qr.mjs
 *
 * 源图是微信导出的那张名片式截图（1100×1556：头像、昵称、地区、码、说明文字）。
 * 直接放上页面有两个问题：
 *  1) 四周一大片留白与文字，在 208px 的展示尺寸下码本身只剩不到一半，扫不动；
 *  2) 微信默认那套蓝紫渐变正好是这个站明令禁止的配色（DESIGN §8），
 *     压在联系块那面饱和蓝上会脏成一片。
 *
 * 所以这里只做两件事：裁出码本身，再把它二值化后重染成墨色。
 * 二值化不损害可扫性 —— 反而把对比度拉到最大；重染只换色相，不动模块几何。
 * 输出 336px（展示尺寸 168px 的 2×），PNG 无损：码靠边缘锐利，
 * 有损压缩会糊掉定位符，非整数倍缩放会吃掉模块。
 *
 * 换码的时候：把新图覆盖到 SRC，量一下码的外框改 BOX，再跑一遍，
 * 然后**真的拿手机扫一次**。脚本只能保证它是张图，保证不了它还指向你的微信。
 */

import sharp from 'sharp'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
/* 源图不放 public/：那一整目录会原样进 dist，101 kB 的名片截图没有理由发出去。 */
const SRC = path.join(ROOT, 'scripts/assets/wechat-qr.src.jpg')
const OUT = path.join(ROOT, 'public/wechat-qr.png')

/** 码在源图里的外框（含一圈安静区），像素量出来的。 */
const BOX = { left: 140, top: 385, width: 835, height: 835 }
/** 展示尺寸 168px 的 2×。整数倍是有讲究的：非整数缩放会在模块边界上吃掉格子。 */
const SIZE = 336
/** 墨色，与 palettes.css 的 --ink 同值。 */
const INK = [0x1a, 0x1a, 0x2e]

const meta = await sharp(SRC).metadata()
if (BOX.left + BOX.width > meta.width || BOX.top + BOX.height > meta.height) {
  console.error(`qr: 裁切框超出源图（源图 ${meta.width}×${meta.height}）`)
  process.exit(1)
}

/* 阈值 170：源图的码是有渐变的紫蓝，灰度落在 90–150；纸白落在 245 以上。 */
const mono = await sharp(SRC)
  .extract(BOX)
  .resize(SIZE, SIZE, { kernel: 'lanczos3' })
  .greyscale()
  .threshold(170)
  .raw()
  .toBuffer()

/* 二值灰度 → 双色。0 是模块、255 是纸，中间值经 threshold 之后不存在。 */
const rgb = Buffer.allocUnsafe(SIZE * SIZE * 3)
let dark = 0
for (let i = 0; i < mono.length; i++) {
  const on = mono[i] < 128
  if (on) dark++
  rgb[i * 3] = on ? INK[0] : 255
  rgb[i * 3 + 1] = on ? INK[1] : 255
  rgb[i * 3 + 2] = on ? INK[2] : 255
}

/* 码的黑模块占比一般在 35%–55%。掉到这个区间外多半是阈值或裁框错了。 */
const ratio = dark / (SIZE * SIZE)
if (ratio < 0.2 || ratio > 0.65) {
  console.error(`qr: 黑模块占比 ${(ratio * 100).toFixed(1)}%，不像一个二维码，检查 BOX 与阈值`)
  process.exit(1)
}

await sharp(rgb, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .png({ compressionLevel: 9, palette: true })
  .toFile(OUT)

/*
  ---- 出厂校验：有没有哪个模块被这趟缩放 + 二值化翻掉 ----

  值得写这一段，是因为这张码是用户真正的联系方式：扫不出来 = 这一页最主要的
  转化路径直接断了，而它坏了不会有任何报错。

  试过用 jsQR 真解一次，解不出来 —— 但**原图整张也解不出来**（中心那枚微信 logo
  超出了它的容错），所以那个测试对「我有没有改坏」一句话都说明不了，扔掉。

  这里换一个不需要解码、也不需要先找出模块网格的判法：
    把原图在**全分辨率**上二值化得到 A；把成品最近邻放大回同一尺寸得到 B；
    取两者的分歧图，然后腐蚀 1px。
  模块宽约 22px，真翻掉一个模块会留下 22×22 的实心块，腐蚀到半径 8 都还在；
  而重采样在模块边界上的抖动只有 1–2px 宽的细线，腐蚀一轮就全没。
  所以「腐蚀 1px 后存活 0」等价于「没有任何一个模块内部被改变」。
  实测：分歧 4.21% 全在边界，腐蚀 1px 后存活 0。
*/
const full = await sharp(SRC).extract(BOX).greyscale().threshold(170).raw().toBuffer()
const back = await sharp(OUT)
  .greyscale()
  .resize(BOX.width, BOX.height, { kernel: 'nearest' })
  .threshold(128)
  .raw()
  .toBuffer()

const W = BOX.width
const disagree = new Uint8Array(W * W)
for (let i = 0; i < W * W; i++) disagree[i] = (full[i] < 128) !== (back[i] < 128) ? 1 : 0

let survived = 0
for (let y = 1; y < W - 1 && !survived; y++) {
  for (let x = 1; x < W - 1; x++) {
    let solid = 1
    for (let dy = -1; dy <= 1 && solid; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!disagree[(y + dy) * W + x + dx]) {
          solid = 0
          break
        }
      }
    }
    if (solid) {
      survived++
      break
    }
  }
}
if (survived) {
  console.error('qr: 腐蚀 1px 后仍有成片分歧 —— 有模块被改坏了，别发这张图')
  process.exit(1)
}

const out = await sharp(OUT).metadata()
const bytes = (await stat(OUT)).size
console.log(
  `qr: ${path.relative(ROOT, OUT)} → ${out.width}×${out.height}，黑模块 ${(ratio * 100).toFixed(1)}%，${(bytes / 1024).toFixed(1)} kB，模块零改变`,
)
