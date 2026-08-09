import type { CSSProperties } from 'react'

/**
 * React 的 CSSProperties 不认自定义属性，但 DOM 认。
 * 版式里有五个量是数据算出来的（--i 序号、--w 字重、--span 卡宽、--f 条长、
 * --bleed 章界咬合色），它们必须以内联自定义属性的形式落到元素上，
 * 否则就得为每一档写一个类名。
 */
export const cssv = (o: Record<string, string | number>): CSSProperties => o as CSSProperties
