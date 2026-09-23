/** 指针位置的全局总线：一处写，多处读，不走 React state。 */

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
