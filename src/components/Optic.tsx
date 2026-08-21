/**
 * 满幅光学体。整站的底，不是某一栏里的插图。
 *
 * 固定铺满视口，z-index 在内容之下；滚动进度喂给相机，指针给极小的视差。
 * 这是从参考站学到的最重要一条：**3D 就是整幅画面**，字压在它上面。
 *
 * 三档，按设备能力分：
 *  loop  桌面 + 好 GPU —— 连续渲染，0.55 倍分辨率，5 条色散波长
 *  slow  桌面但机器弱 —— 连续渲染但降到 0.42 倍、3 条波长
 *  still 手机 / 减弱动效 / 无 WebGL2 —— 只渲一帧，滚动停下后再补一帧
 *
 * still 档不是「降级成一张渐变」：它渲的是同一个着色器、同一帧真实画面，
 * 只是不动。手机因此拿到的是真东西，不是替代品。
 */

import { useEffect, useRef } from 'react'
import { detectTier, prefersReducedMotion } from '../lib/caps'
import type { OpticScene } from '../webgl/optic'

/** 滚动进度铺开的行程：两屏走完 0→1，之后维持在 1。 */
const RUN = 2

export function Optic() {
  const canvas = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return

    const tier = detectTier()
    const still = tier === 'static'
    const quality: 'high' | 'mid' = tier === 'high' ? 'high' : 'mid'

    let scene: OpticScene | null = null
    let raf = 0
    let dead = false
    /** 最近一次交互的时间戳。有交互就全速，静下来就掉到低频漂移。 */
    let active = 0
    let last = 0

    const progress = () => {
      const run = window.innerHeight * RUN
      return Math.min(1, Math.max(0, window.scrollY / run))
    }

    const frame = (now: number) => {
      raf = 0
      if (dead || !scene) return
      const busy = now - active < 400
      /* 空闲时降到 20fps。漂移本来就慢，肉眼看不出来，但 GPU 少烧三分之二。 */
      const gap = busy ? 0 : 50
      if (now - last >= gap) {
        last = now
        scene.setScroll(progress())
        scene.render(now / 1000)
      }
      raf = requestAnimationFrame(frame)
    }

    const once = () => {
      if (!scene) return
      scene.setScroll(progress())
      scene.render(0)
    }

    const kick = () => {
      active = performance.now()
      if (still) {
        once()
      } else if (!raf && !dead) {
        raf = requestAnimationFrame(frame)
      }
    }

    const onPointer = (e: PointerEvent) => {
      if (!scene) return
      scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
      active = performance.now()
    }

    const onResize = () => {
      if (!scene) return
      scene.resize()
      kick()
    }

    const boot = async () => {
      const { createOptic } = await import('../webgl/optic')
      if (dead) return
      scene = createOptic(cv, quality)
      if (!scene) {
        // WebGL2 建不起来：标记一下，CSS 的亮场兜底会露出来
        cv.dataset.dead = '1'
        return
      }
      cv.dataset.live = '1'
      once()
      if (!still) kick()

      window.addEventListener('scroll', kick, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      if (!prefersReducedMotion()) window.addEventListener('pointermove', onPointer, { passive: true })
    }

    // 点火排在 idle：首屏的字不该跟一块全屏 raymarch 抢主线程
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const timer = idle ? idle(boot) : window.setTimeout(boot, 180)

    return () => {
      dead = true
      if (raf) cancelAnimationFrame(raf)
      window.clearTimeout(timer as number)
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      scene?.dispose()
    }
  }, [])

  return <canvas className="optic" ref={canvas} aria-hidden="true" />
}
