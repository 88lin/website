/**
 * 入场包装。只做一件事：元素进视口时加 .is-in，把 --rv 从 0 推到 1。
 *
 * 九格 bay 各有各的入场（见 index.css 的 data-reveal 段），差别写在 CSS 里，
 * 这里不管长什么样，只管什么时候接上电。默认状态是「已经可见」——
 * JS 挂了、IntersectionObserver 不在、用户要求减弱动效，内容都照样完整。
 */

import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useReveal } from '../lib/motion'

export type RevealVariant =
  | 'shutter'
  | 'digit'
  | 'wire-l'
  | 'wire-r'
  | 'wire-c'
  | 'slide'
  | 'seat'
  | 'cascade'
  | 'latch'
  | 'sweep'
  | 'flood'

export function Reveal({
  v,
  as = 'div',
  className,
  style,
  delay,
  margin,
  children,
  ...rest
}: {
  v: RevealVariant
  as?: ElementType
  className?: string
  style?: CSSProperties
  /** 同一格里多个元素依次接电时用，单位毫秒 */
  delay?: number
  margin?: string
  children?: ReactNode
} & Record<string, unknown>) {
  const ref = useReveal<HTMLElement>(margin)
  const Tag = as as ElementType
  const s = delay ? ({ ...style, ['--d']: `${delay}ms` } as CSSProperties) : style
  return (
    <Tag ref={ref} className={className} data-reveal={v} style={s} {...rest}>
      {children}
    </Tag>
  )
}
