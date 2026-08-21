/**
 * 图版 00「一物两读」。
 *
 * 双层同源（v5/v11/v12 立下的纪律）：SSR 直出 SVG 静态层，桌面端 idle 之后
 * 点火 WebGL。两层的形状来自同一份 src/gen/sculpt.json，换层那一帧构图不跳。
 *
 * 静态层不是占位图。它自己就成立：两个剪影上下并置、中间标着 90° 的转向、
 * 底下印着定义式。手机、无 JS、减弱动效看到的是一张完整的图版，
 * 说的和 3D 层是同一件事，只是不能转。
 *
 * 交互只有一件事：转角。拖、点按钮，两端磁吸卡位，松手一定落在可读的角度上。
 * 中途那个不可读的中间态是设计意图 —— 那正是「同一个实体」的证据。
 * 静止时不发一帧（渲染由 rAF 按需驱动），设计系统的「无永动机」在渲染层也守住。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { sculpt } from '../lib/sculpt'
import { detectTier, dprCap } from '../lib/caps'
import type { SculptScene } from '../webgl/sculpt'

const HALF_PI = Math.PI / 2
/** 入场起始角：从这里转回正读位，一次性。 */
const ENTRY = 0.62
/** 拖动灵敏度：约 360px 走完 90°。 */
const PER_PX = HALF_PI / 360
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

/** 一个读向的剪影。paper 面 + 砖缝 pattern + 彩色轮廓描边，三层都由掩膜派生。 */
function Reading({
  role,
  path,
  outline,
  cols,
}: {
  role: 'a' | 'b'
  path: string
  outline: string
  cols: number
}) {
  const brick = `brick-${role}`
  const clip = `clip-${role}`
  const word = role === 'a' ? sculpt.wordA : sculpt.wordB
  return (
    <svg
      className="sculpt__read"
      data-role={role}
      viewBox={`0 0 ${cols} ${sculpt.rows}`}
      role="img"
      aria-label={`${role === 'a' ? '正面' : '侧面'}读作「${word}」`}
    >
      <defs>
        <pattern id={brick} width="1" height="1" patternUnits="userSpaceOnUse">
          <path className="seam" d="M0 0H1V1" />
        </pattern>
        <clipPath id={clip}>
          <path d={path} />
        </clipPath>
      </defs>
      <path className="paper" d={path} />
      <g clipPath={`url(#${clip})`}>
        <rect width={cols} height={sculpt.rows} fill={`url(#${brick})`} />
      </g>
      <path className="edge" d={outline} />
    </svg>
  )
}

export function Sculpt() {
  const host = useRef<HTMLDivElement | null>(null)
  const stage = useRef<HTMLDivElement | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const api = useRef<{ to: (v: number) => void } | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const tier = detectTier()
    if (tier === 'static') return

    const cv = canvas.current
    const st = stage.current
    if (!cv || !st) return

    let scene: SculptScene | null = null
    let raf = 0
    let dead = false
    let yaw = ENTRY
    let target = 0
    let dragging = false
    let startX = 0
    let startYaw = 0

    /*
      转角同时写进 CSS 自定义属性，标题上的荧光笔与朱圈靠它亮灭。
      写在 documentElement 上是有意的：字雕在右栏、被它点亮的词在左栏，
      两者没有共同的容器；而全站只有一件字雕，不存在第二个作用域。
    */
    const writeRead = () => {
      document.documentElement.style.setProperty('--read', (yaw / HALF_PI).toFixed(4))
    }

    const draw = () => {
      scene!.setYaw(yaw)
      scene!.render()
      writeRead()
    }

    /** 等差逼近，到位即停 —— 不引缓动库，也不留一个空转的 rAF。 */
    const frame = () => {
      raf = 0
      if (dead || !scene) return
      const d = target - yaw
      if (Math.abs(d) < 0.0009) {
        yaw = target
        draw()
        return
      }
      yaw += d * 0.15
      draw()
      raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!raf && !dead) raf = requestAnimationFrame(frame)
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      dragging = true
      startX = e.clientX
      startYaw = yaw
      host.current?.setAttribute('data-drag', '1')
      cv.setPointerCapture(e.pointerId)
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging || !scene) return
      // 拖动时不做逼近：手指到哪就是哪，中间加一层缓动会觉得黏
      yaw = clamp(startYaw + (e.clientX - startX) * PER_PX, -0.06, HALF_PI + 0.06)
      target = yaw
      draw()
    }

    const onUp = () => {
      if (!dragging) return
      dragging = false
      host.current?.removeAttribute('data-drag')
      // 磁吸：松手落到更近的那一读，绝不停在读不出字的角度上
      target = yaw < HALF_PI / 2 ? 0 : HALF_PI
      kick()
    }

    const boot = async () => {
      const { createSculpt } = await import('../webgl/sculpt')
      if (dead) return
      scene = createSculpt(cv, dprCap(tier))
      if (!scene) return // WebGL2 建不起来就留在静态层，不报错给用户看
      setLive(true)
      draw()
      // 入场：从 35° 转回正读位。一次性，不循环。
      target = 0
      kick()

      cv.addEventListener('pointerdown', onDown)
      cv.addEventListener('pointermove', onMove)
      cv.addEventListener('pointerup', onUp)
      cv.addEventListener('pointercancel', onUp)

      api.current = {
        to: (v: number) => {
          target = v
          kick()
        },
      }
    }

    // 点火排在 idle：首屏的字与数不该跟一块 canvas 抢主线程
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback
    const timer = idle ? idle(boot) : window.setTimeout(boot, 220)

    const ro = new ResizeObserver(() => {
      if (!scene) return
      scene.resize()
      scene.render()
    })
    ro.observe(st)

    return () => {
      dead = true
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      window.clearTimeout(timer as number)
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointercancel', onUp)
      api.current = null
      scene?.dispose()
      document.documentElement.style.removeProperty('--read')
    }
  }, [])

  const [reading, setReading] = useState<'a' | 'b'>('a')
  const swap = useCallback(() => {
    const next = reading === 'a' ? 'b' : 'a'
    setReading(next)
    api.current?.to(next === 'a' ? 0 : HALF_PI)
  }, [reading])

  return (
    <div className="sculpt" ref={host} data-live={live ? '1' : undefined}>
      <div className="sculpt__stage" ref={stage}>
        <canvas className="sculpt__gl" ref={canvas} aria-hidden="true" />
        <div className="sculpt__static">
          <Reading role="a" path={sculpt.pathA} outline={sculpt.outlineA} cols={sculpt.colsA} />
          <p className="sculpt__turn">转 90°</p>
          <Reading role="b" path={sculpt.pathB} outline={sculpt.outlineB} cols={sculpt.colsB} />
        </div>
      </div>

      <div className="sculpt__hud">
        {live && (
          <button className="sculpt__swap" type="button" onClick={swap} aria-pressed={reading === 'b'}>
            <span className="a">{sculpt.wordA}</span>
            <em>⇄</em>
            <span className="b">{sculpt.wordB}</span>
          </button>
        )}
        <p className="sculpt__hint">
          {live ? '拖动转向 · 同一个实体的两次阅读' : `一个实体，两个正交剪影`}
        </p>
      </div>

      <p className="sculpt__formula">
        <b>solid(x,y,z) =</b> {sculpt.wordA}(x,y) ∧ {sculpt.wordB}(z,y)
        <b> · 双读保真 {(sculpt.fidelity.a * 100).toFixed(0)}%</b>
      </p>
    </div>
  )
}
