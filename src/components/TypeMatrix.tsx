import type { CSSProperties, ReactNode } from 'react'

export type SlugTone = 'paper' | 'ink' | 'mark' | 'brand' | 'pop'
export type Slug = { c: string; t: SlugTone }

/** 用一个字符串 + 一组着色下标快速写一盘字。 */
export function slugs(text: string, tones: Partial<Record<number, SlugTone>> = {}): Slug[] {
  return Array.from(text).map((c, i) => ({ c, t: tones[i] ?? 'paper' }))
}

/** 索引推出来的固定抖动。必须是确定式的，否则 SSR 与 CSR 会不一致。 */
function jitter(i: number) {
  return (((i * 37) % 7) - 3) * 0.24
}

type Props = {
  slugs: Slug[]
  cols?: number
  /** 3D 活字场景用它定位这一盘字在页面里的位置 */
  anchor: string
  className?: string
  style?: CSSProperties
  /**
   * 每块字的入场间隔（秒）。给了就走纯 CSS 关键帧——首屏用这条路，
   * 不必等 GSAP。首屏之下的用 GSAP 走滚动触发，这里留空。
   */
  cssStagger?: number
  cssDelay?: number
  children?: ReactNode
}

/**
 * 活字方阵。
 *
 * 这是 3D 活字系统的 DOM 底层：它自己就是一件成品（0 KB、任意 DPR 下都锐利、
 * 跟着色板走），移动端与 reduced-motion 下就用它，不退化成一张截图。
 * WebGL 可用时字块在同一位置接管，这一层淡出（只改 opacity，不改布局，CLS 为 0）。
 */
export function TypeMatrix({
  slugs,
  cols = 4,
  anchor,
  className = '',
  style,
  cssStagger,
  cssDelay = 0,
}: Props) {
  return (
    <div
      className={`type-matrix ${className}`}
      data-type-anchor={anchor}
      style={{ ...style, ['--tm-cols' as string]: cols } as CSSProperties}
      aria-hidden
    >
      {slugs.map((s, i) => (
        <span
          key={`${s.c}-${i}`}
          className={`type-slug type-slug--${s.t}${cssStagger ? ' type-slug--drop' : ''}`}
          style={
            {
              ['--tm-r' as string]: `${jitter(i)}deg`,
              ...(cssStagger
                ? { animationDelay: `${(cssDelay + i * cssStagger).toFixed(3)}s` }
                : null),
            } as CSSProperties
          }
        >
          {s.c}
        </span>
      ))}
    </div>
  )
}
