/**
 * 标注层：彩色手绘虚线框 + 手写注。
 *
 * 它不是装饰。整站的立场是「每个数字都要说清自己从哪来」，
 * 标注层就是那句话的界面形态——框住某个东西，然后在旁边写清它是什么。
 * 框的路径由 src/lib/frame.ts 按 key 生成，同一个 key 永远同一个框
 * （SSR 与水合必须一字不差），不同 key 各不相同。
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { annotColor, handCircle, handFrame, handLead } from '../lib/frame'
import { prefersReducedMotion } from '../lib/caps'

type Place = 'top' | 'right' | 'bottom'

export function Annot({
  k,
  note,
  place = 'top',
  color,
  lead = false,
  children,
  className,
}: {
  /** 稳定的种子。同一个 key 画出同一个框。 */
  k: string
  note: string
  place?: Place
  color?: string
  lead?: boolean
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const c = color ?? annotColor(k)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      el.classList.add('is-open')
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            // 框先亮，注再展开——继电器的语法：先切换，再稳定
            window.setTimeout(() => e.target.classList.add('is-open'), 240)
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '-8% 0px -8% 0px', threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      className={className ? `annot ${className}` : 'annot'}
      style={{ ['--annot-color' as string]: c }}
    >
      <svg className="annot__frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={handFrame(k)} />
      </svg>
      {children}
      {lead ? (
        <svg
          className="annot__lead"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          style={{ left: '100%', top: '0.2em', width: '4.5rem', height: '2rem' }}
        >
          <path d={handLead(k)} />
        </svg>
      ) : null}
      <span className="annot__note" data-place={place}>
        {note}
      </span>
    </span>
  )
}

/** 马克笔下划线。柠檬色，压在字下面，不是 border-bottom。 */
export function MarkUnder({ children }: { children: ReactNode }) {
  return <span className="mark-under">{children}</span>
}

/** 手绘圈注。两圈叠加，收笔处过冲，跟真用笔圈一样收不回原点。 */
export function MarkCircle({ k, children }: { k: string; children: ReactNode }) {
  return (
    <span className="mark-circle">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={handCircle(k, 0)} />
        <path d={handCircle(k, 1)} opacity="0.7" />
      </svg>
      {children}
    </span>
  )
}
