/**
 * 信号总线。DOM 层与 WebGL 层唯一的通信方式。
 *
 * 刻意不做「3D 跟着某个 DOM 元素走」那种耦合：一改版式，3D 就跟着崩。
 * 这里只广播几个语义化的量——当前章、滚动进度与速度、指针位置——
 * 织带自己决定拿它们做什么。DOM 不知道有 3D，3D 不认识 DOM。
 */

export type Signal = {
  /** 当前 live 的章序号（0..7） */
  chapter: number
  /** 上一章，用来做转场 */
  prevChapter: number
  /** 章切换发生的时间戳（performance.now()） */
  switchedAt: number
  /** 页面滚动进度 0..1 */
  progress: number
  /** 归一化滚动速度，约 -1..1 */
  velocity: number
  /** 指针位置，视口归一化到 -1..1 */
  px: number
  py: number
  /** 指针是否在页面内 */
  pointerIn: boolean
}

const state: Signal = {
  chapter: 0,
  prevChapter: 0,
  switchedAt: 0,
  progress: 0,
  velocity: 0,
  px: 0,
  py: 0,
  pointerIn: false,
}

type Listener = (s: Signal) => void
const listeners = new Set<Listener>()

export const signal = () => state

export const setChapter = (n: number) => {
  if (n === state.chapter) return
  state.prevChapter = state.chapter
  state.chapter = n
  state.switchedAt = typeof performance !== 'undefined' ? performance.now() : 0
  listeners.forEach((l) => l(state))
}

export const setScroll = (progress: number, velocity: number) => {
  state.progress = progress
  state.velocity = velocity
}

export const setPointer = (px: number, py: number, inside: boolean) => {
  state.px = px
  state.py = py
  state.pointerIn = inside
}

export const onSignal = (l: Listener) => {
  listeners.add(l)
  // 明确返回 void：useEffect 的清理函数不接受返回值，Set.delete 会漏一个 boolean 出去
  return () => {
    listeners.delete(l)
  }
}
