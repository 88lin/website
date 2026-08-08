/**
 * 把生成的写实素材裁切、归一化亮度并压成 WebP，写入 public/subjects/。
 * 目标：单张 <= 150KB，主体居中，背景与 --paper 同族。
 */
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

const SRC = '/mnt/results'
const OUT = new URL('../public/subjects/', import.meta.url).pathname

const JOBS = [
  { in: 'subject-car.jpg', out: 'car.webp', w: 1400, h: 933, crop: null },
  // 机器人偏右，向右裁一块正方形把主体带回画面中心
  { in: 'subject-robot-v2.jpg', out: 'robot.webp', w: 1000, h: 1000, crop: { left: 0.13, top: 0.0, w: 0.87, h: 1.0 } },
  { in: 'subject-cat.jpg', out: 'cat.webp', w: 1000, h: 1000, crop: null },
  { in: 'subject-rabbit.jpg', out: 'rabbit.webp', w: 1000, h: 1000, crop: { left: 0.0, top: 0.02, w: 0.9, h: 0.98 } },
]

await mkdir(OUT, { recursive: true })

for (const job of JOBS) {
  const src = path.join(SRC, job.in)
  let img = sharp(src)
  const meta = await img.metadata()

  if (job.crop) {
    img = img.extract({
      left: Math.round(meta.width * job.crop.left),
      top: Math.round(meta.height * job.crop.top),
      width: Math.round(meta.width * job.crop.w),
      height: Math.round(meta.height * job.crop.h),
    })
  }

  const dest = path.join(OUT, job.out)
  await img
    .resize(job.w, job.h, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 1.02 })
    .linear(1.03, -4)
    .webp({ quality: 82, effort: 6 })
    .toFile(dest)

  const s = await stat(dest)
  console.log(`${job.out.padEnd(14)} ${job.w}x${job.h}  ${(s.size / 1024).toFixed(1)} KB`)
}
