/**
 * 指针总线。
 *
 * v6 这里广播四组量（章序号、滚动进度、速度、指针），因为当时有一层常驻 WebGL
 * 织带要靠它决定形态。v7 把 3D 收回到「卡片 CSS 3D + 分层视差」，织带删了，
 * 剩下的唯一订阅者是开场那叠截图。所以这里只留指针。
 *
 * 一个必须写死的细节：通知走 rAF 合帧。pointermove 在高刷屏上一秒能来 240 次，
 * 每次都同步回调去写自定义属性，会把样式重算摊到输入线程上。合帧之后一帧最多
 * 写一次，位移本身交给合成器。
 */

export type Signal = {
  /** 指针位置，视口归一化到 -1..1（y 轴向上为正） */
  px: number
  py: number
  /** 指针是否在页面内。移出去要回中，否则视差会卡在最后一个角度上 */
  pointerIn: boolean
}

const state: Signal = { px: 0, py: 0, pointerIn: false }

type Listener = (s: Signal) => void
const listeners = new Set<Listener>()

let queued = 0
const flush = () => {
  queued = 0
  listeners.forEach((l) => l(state))
}

export const setPointer = (px: number, py: number, inside: boolean) => {
  state.px = px
  state.py = py
  state.pointerIn = inside
  if (queued || typeof requestAnimationFrame === 'undefined') return
  queued = requestAnimationFrame(flush)
}

export const onSignal = (l: Listener) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
