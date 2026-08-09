/**
 * 手绘框 / 圈注。
 *
 * 只在两个地方出现：案例卡右栏的「取舍」，和两条主线的交点。
 * 用得多它就变成花边——它的作用是「有人在这一处停下来，用笔圈了一下」，
 * 一页出现两次刚好，出现十次就等于没出现。
 *
 * 颜色不走 frame.ts 的 annotColor：那份轮换表里有 --highlight，
 * 蜜桃色的手写标签压在米白纸上只有 1.3:1，是看不见的字。
 * 这里只用三个压得住纸的角色色。
 */

import type { ReactNode } from 'react'
import { handCircle, handFrame } from '../lib/frame'

const INK: Record<string, string> = {
  berry: 'var(--brand)',
  deep: 'var(--brand-deep)',
  pine: 'var(--pop)',
  peach: 'var(--brand)',
}

export function Hand({
  label,
  seed,
  shape = 'frame',
  tone = 'berry',
  className,
  children,
}: {
  label?: string
  seed?: string
  shape?: 'frame' | 'circle'
  tone?: keyof typeof INK
  className?: string
  children?: ReactNode
}) {
  const key = seed || label || shape
  const d = shape === 'circle' ? handCircle(key) : handFrame(key)
  return (
    <div className={className ? `hand ${className}` : 'hand'} style={{ color: INK[tone] }}>
      <svg className="hand__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={d} />
      </svg>
      {label ? <span className="hand__lb">{label}</span> : null}
      {children}
    </div>
  )
}
