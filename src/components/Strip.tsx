/**
 * 通道条。九格通道的导航，同时也是当前位置的读数。
 *
 * 它可以拖。这不是炫技：video_vip 那个脚本里的悬浮按钮就是可拖并记住位置的，
 * 因为 22 个视频站的播放器控制条位置各不相同，固定坐标注定会挡住某个站。
 * 同一条经验搬到这里——不同屏幕、不同滚动位置，导航条该待在哪由你决定，
 * 位置写进 localStorage，下次还在那儿。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { channels } from '../content/site'
import { onSignal, signal } from '../lib/bus'
import { scrollToId } from '../lib/motion'
import { IconGrip } from './Icons'

const KEY = 'rack.strip.pos'

type Pos = { x: number; y: number } | null

export function Strip() {
  const [pos, setPos] = useState<Pos>(null)
  const [live, setLive] = useState(0)
  const ref = useRef<HTMLElement | null>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  // 位置只在挂载后才从 localStorage 读：服务端渲染时没有 localStorage，
  // 首帧必须跟服务端输出一模一样，否则 React 会报水合不一致。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number }
        if (typeof p?.x === 'number' && typeof p?.y === 'number') setPos(clamp(p))
      }
    } catch {
      /* 隐私模式下 localStorage 会抛异常，忽略即可，用默认位置 */
    }
  }, [])

  useEffect(() => {
    setLive(signal().channel)
    return onSignal((s) => setLive(s.channel))
  }, [])

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setPos(clamp({ x: e.clientX - d.dx, y: e.clientY - d.dy }))
  }, [])

  const onPointerUp = useCallback(() => {
    if (!drag.current) return
    drag.current = null
    setPos((p) => {
      if (p) {
        try {
          localStorage.setItem(KEY, JSON.stringify(p))
        } catch {
          /* 存不进去就算了，不影响本次会话 */
        }
      }
      return p
    })
  }, [])

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { left: '50%', bottom: '1.4rem', transform: 'translateX(-50%)' }

  return (
    <nav ref={ref} className="strip" style={style} aria-label="通道导航">
      <span
        className="strip__grip"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="separator"
        aria-label="拖动导航条"
        title="可以拖到任何位置，位置会记住"
      >
        <IconGrip />
      </span>
      {channels.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className="strip__btn"
          aria-current={i === live}
          onClick={() => scrollToId(`ch-${c.no}`)}
        >
          {c.no}
          <span className="strip__label">{c.label}</span>
        </button>
      ))}
    </nav>
  )
}

const clamp = (p: { x: number; y: number }) => {
  if (typeof window === 'undefined') return p
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    x: Math.max(8, Math.min(p.x, w - 120)),
    y: Math.max(8, Math.min(p.y, h - 56)),
  }
}
