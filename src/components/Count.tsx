/* 数字滚动：进视口时从 0 滚到真值，只跑一次。 */

import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/caps'

const DURATION = 1100

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

type Parsed = { n: number; prefix: string; suffix: string; grouped: boolean; decimals: number }

function parse(raw: string): Parsed | null {
  const m = raw.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/)
  if (!m) return null
  const digits = m[2].replace(/,/g, '')
  const n = Number(digits)
  if (!Number.isFinite(n)) return null
  const dot = digits.indexOf('.')
  return {
    n,
    prefix: m[1],
    suffix: m[3],
    grouped: m[2].includes(','),
    decimals: dot === -1 ? 0 : digits.length - dot - 1,
  }
}

const format = (v: number, p: Parsed) => {
  const fixed = v.toFixed(p.decimals)
  if (!p.grouped) return p.prefix + fixed + p.suffix
  const [int, frac] = fixed.split('.')
  const withSep = Number(int).toLocaleString('en-US')
  return p.prefix + withSep + (frac ? '.' + frac : '') + p.suffix
}

export function Count({ value, className }: { value: string; className?: string }) {
  const parsed = parse(value)
  const ref = useRef<HTMLSpanElement | null>(null)
  // 初始值必须是终值：写成 0 的话预渲染产物里印的就是「0 累计 Star」，
  // 禁用 JS 的读者和爬虫看到的就是 0。归零发生在 step 的第一帧。
  const [text, setText] = useState(value)

  useEffect(() => {
    if (!parsed) return
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setText(value)
      return
    }

    let raf = 0
    let start = 0
    const step = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / DURATION)
      setText(format(parsed.n * ease(t), parsed))
      if (t < 1) raf = requestAnimationFrame(step)
      else setText(value)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          io.disconnect()
          raf = requestAnimationFrame(step)
        }
      },
      { rootMargin: '-8% 0px -8% 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      ref={ref}
      className={className}
      /* 等宽数字：滚动中位数会变，宽度不能跳 */
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={value}
    >
      {text}
    </span>
  )
}
