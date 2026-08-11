/**
 * 入场包装。参考站 dst 的 .reveal / .reveal-d1..d5 那一套：进入视口时
 * translateY(32px) → 0，0.7s cubic-bezier(.16,1,.3,1)，可选 1–5 档延迟。
 *
 * 隐藏态写在 `.js .reveal:not(.is-in)` 上，所以禁用 JS、预渲染快照、
 * prefers-reduced-motion 三种情况下内容都是完整可见的 —— 这是 lib/motion.ts
 * 的第一条纪律，包装组件不能破它。
 */

import type { ElementType, ReactNode } from 'react'
import { useReveal } from '../lib/motion'

export function Reveal({
  as,
  d,
  className,
  children,
  ...rest
}: {
  /** 渲染成什么标签，默认 div。语义容器（section / article）请显式传。 */
  as?: ElementType
  /** 延迟档位 1–5，对应 .08s–.4s。同一批元素错开用它，不要写 style。 */
  d?: 1 | 2 | 3 | 4 | 5
  className?: string
  children: ReactNode
} & Record<string, unknown>) {
  const ref = useReveal<HTMLElement>()
  const Tag = (as || 'div') as ElementType
  const cls = ['reveal', d ? `reveal-d${d}` : '', className || ''].filter(Boolean).join(' ')
  return (
    <Tag ref={ref} className={cls} {...rest}>
      {children}
    </Tag>
  )
}
