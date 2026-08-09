/**
 * 信号总线。DOM 层与 WebGL 层唯一的通信方式。
 *
 * 刻意不做「3D 跟着某个 DOM 元素走」那种耦合：一改版式，3D 就跟着崩。
 * 这里只广播几个语义化的量——当前通道、滚动速度、指针位置——
 * 3D 场景自己决定拿它们做什么。DOM 不知道有 3D，3D 不认识 DOM。
 */

export type Signal = {
  /** 当前 live 的通道序号（0..8） */
  channel: number
  /** 上一格通道，用来做「改道」动画 */
  prevChannel: number
  /** 通道切换发生的时间戳（performance.now()） */
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
  /**
   * 当前 live 通道那个机身开口，NDC 归一化（中心 x/y ∈ -1..1，宽高 ∈ 0..2）。
   * 广播的是「机身上现在开在哪」这件事，不是某个 DOM 节点——3D 层拿它把透镜
   * 摆进洞里。没开窗的通道是 null，透镜留在上一个位置。
   */
  aperture: { x: number; y: number; w: number; h: number } | null
}

const state: Signal = {
  channel: 0,
  prevChannel: 0,
  switchedAt: 0,
  progress: 0,
  velocity: 0,
  px: 0,
  py: 0,
  pointerIn: false,
  aperture: null,
}

type Listener = (s: Signal) => void
const listeners = new Set<Listener>()

export const signal = () => state

export const setChannel = (n: number) => {
  if (n === state.channel) return
  state.prevChannel = state.channel
  state.channel = n
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

export const setAperture = (a: Signal['aperture']) => {
  state.aperture = a
}

export const onSignal = (l: Listener) => {
  listeners.add(l)
  // 明确返回 void：useEffect 的清理函数不接受返回值，Set.delete 会漏一个 boolean 出去
  return () => {
    listeners.delete(l)
  }
}
