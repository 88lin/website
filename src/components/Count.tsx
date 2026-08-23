/**
 * 数字滚动。读数从 0 滚到真值。
 *
 * 为什么值得单独做一个组件：这一页的论点就是「每个数字都能核」，
 * 那么数字本身就该是主角。静态摆着的一个四位数和滚上去的同一个数，
 * 读者对前者只是「看到」，对后者是「看着它长出来」——后者才会记住。
 *
 * 三条纪律：
 *  1) 只在进视口时跑一次，不重播，不循环。
 *  2) 原样保留千分位与后缀：带逗号的滚完还带逗号，'5.4pp' 不动它。
 *  3) prefers-reduced-motion 直接给终值，不是放慢 —— 减弱动效不是「慢动作」。
 */

import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/caps'

/** 滚多久。1.1s 是「看得见在长」与「不耽误读」的交点。 */
const DURATION = 1100

/** 缓出。起步快、收尾慢，最后几十毫秒几乎停住，读数因此落得稳。 */
const ease = (t: number) => 1 - Math.pow(1 - t, 3)

type Parsed = { n: number; prefix: string; suffix: string; grouped: boolean; decimals: number }

/**
 * 把 '4,821' / '5.4pp' / 'CI' 这类值拆成能滚的部分。
 * 拆不出数字（'CI'）就返回 null，交给调用方原样渲染 —— 不是每个读数都是数。
 */
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
  const [text, setText] = useState(() => (parsed ? format(0, parsed) : value))

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
    // value 变了就重来；parsed 由 value 派生，不必单列
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      ref={ref}
      className={className}
      /* 滚动中位数会变，等宽数字保证宽度不跳；aria 只播终值，不念中间过程 */
      style={{ fontVariantNumeric: 'tabular-nums' }}
      aria-label={value}
    >
      {text}
    </span>
  )
}
