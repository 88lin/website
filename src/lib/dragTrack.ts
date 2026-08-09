import { ENABLE_DRAG_TRACK } from './flags'
import { onVelocity, prefersReduced } from './motion'

/**
 * 可拖拽的循环轨道。
 *
 * V3 这里是一条 CSS `@keyframes translateX` 的恒速传送带：拖不动、甩不出去、
 * 跟滚动速度也没有任何关系。轨道是这个页面里唯一一处「横向的时间轴」，用一条
 * 匀速动画去表达它，等于告诉访客这块内容不值得你上手。
 *
 * 这里改成一个真正的物理系统，三段状态连续过渡：
 *   拖拽 —— 指针位移 1:1 跟随，同时用 dx/dt 采样速度
 *   动量 —— 松手后每帧 v *= 0.94 自由滑行，速度越高卡片 skewX 越大
 *   巡航 —— 空闲 1.5s 后从当前速度平滑接回慢速自动滚动（V3 速度的一半）
 *
 * 轨道内容复制了一份，位移半程即可无缝衔接（间距做在 item 的 margin-right 上，
 * 不能用 flex gap，否则两份宽度差半个间距，接缝会跳）。
 *
 * prefers-reduced-motion 下整个模块不接管：不注册任何监听、不写 transform，
 * 交回给 CSS 的原生 overflow-x + scroll-snap。
 */

const FRICTION = 0.94
/**
 * 巡航速度，px/帧。V3 的 CSS marquee 约 1.1px/帧，这里减半。
 *
 * 窄屏取 0：一屏只放得下一张多一点的卡，持续巡航意味着当前这张的标题永远缺一截
 * （实测滑 1.5s 就把 "Lofi Radio Web" 啃成 "ofi Radio Web"），而手机上又没有
 * hover 可以叫停。改成静止起手、拖了才动，动量与循环都照旧。
 */
const CRUISE = -0.55
const CRUISE_MIN_W = 768
/** 松手后多久恢复巡航 */
const IDLE_MS = 1500
/** 位移超过这个像素数就判定为「拖过」，随后的 click 要吞掉 */
const DRAG_SLOP = 6

export type TrackHandle = {
  destroy(): void
  setPaused(p: boolean): void
  /** 调试与审计用 */
  readonly state: { x: number; v: number }
}

const NOOP: TrackHandle = {
  destroy() {},
  setPaused() {},
  state: { x: 0, v: 0 },
}

export function dragTrack(view: HTMLElement, inner: HTMLElement): TrackHandle {
  if (!ENABLE_DRAG_TRACK || prefersReduced()) return NOOP

  let x = 0
  let v = 0
  let half = inner.scrollWidth / 2
  let sv = 0

  let dragging = false
  let moved = 0
  let lastX = 0
  let lastT = 0
  let pid = -1

  let hover = false
  let focused = false
  let external = false
  let visible = true
  let idleUntil = 0
  let raf = 0

  let cruise = 0
  const measure = () => {
    half = inner.scrollWidth / 2 || 1
    // 跟着尺寸一起量，别在帧循环里读 innerWidth
    cruise = view.ownerDocument.defaultView!.innerWidth >= CRUISE_MIN_W ? CRUISE : 0
  }
  measure()

  /* ------------------------------------------------------------ 主循环 */
  const frame = () => {
    raf = requestAnimationFrame(frame)
    if (!visible) return

    if (!dragging) {
      const canCruise = !hover && !focused && !external && performance.now() >= idleUntil
      const target = canCruise ? cruise : 0
      if (Math.abs(v) > Math.abs(target) + 0.02) {
        // 高速段：纯摩擦，这一段才是「甩出去」的手感
        v *= FRICTION
      } else {
        // 低速段：指数逼近巡航速度（或停住），不要硬切
        v += (target - v) * 0.035
        // 判 target 而不是 canCruise：窄屏 target 恒为 0，canCruise 仍是 true，
        // 用后者会让速度只渐近不归零，轨道永远在写亚像素 transform。
        if (target === 0 && Math.abs(v) < 0.012) v = 0
      }
      x += v
    }

    if (x <= -half) x += half
    else if (x > 0) x -= half

    // 惯性期的速度倾斜：只在快的时候出现，慢下来自然回正
    const skew = Math.max(-1.6, Math.min(1.6, v * 0.14))
    // 页面纵向滚动速度反向带动轨道，让横轴也参与整页的惯性
    const drift = -sv * 24
    inner.style.transform = `translate3d(${(x + drift).toFixed(2)}px,0,0) skewX(${skew.toFixed(3)}deg)`
  }

  /* -------------------------------------------------------------- 指针 */
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragging = true
    moved = 0
    lastX = e.clientX
    lastT = performance.now()
    pid = e.pointerId
    v = 0
    try {
      view.setPointerCapture(pid)
    } catch {
      /* Safari 在某些 pointerType 上会抛，忽略即可 */
    }
    view.dataset.drag = 'on'
  }

  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    const now = performance.now()
    const dt = Math.max(1, now - lastT)
    lastT = now
    x += dx
    moved += Math.abs(dx)
    // 归一到「每 16.7ms 一帧」，与 FRICTION 的每帧衰减同一量纲
    v = (dx / dt) * 16.7
  }

  const onUp = () => {
    if (!dragging) return
    dragging = false
    idleUntil = performance.now() + IDLE_MS
    if (pid >= 0 && view.hasPointerCapture?.(pid)) view.releasePointerCapture(pid)
    pid = -1
    view.dataset.drag = 'off'
  }

  // 拖过之后紧接着的那次 click 是误触，捕获阶段吞掉
  const onClick = (e: MouseEvent) => {
    if (moved > DRAG_SLOP) {
      e.preventDefault()
      e.stopPropagation()
      moved = 0
    }
  }

  /* -------------------------------------------------------------- 键盘 */
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== view) return
    focused = true // 键盘接管了，巡航让位
    const kick = (n: number) => {
      v = n
      idleUntil = performance.now() + IDLE_MS
      e.preventDefault()
    }
    if (e.key === 'ArrowRight') kick(-9)
    else if (e.key === 'ArrowLeft') kick(9)
    else if (e.key === 'Home') {
      x = 0
      v = 0
      idleUntil = performance.now() + IDLE_MS
      e.preventDefault()
    } else if (e.key === 'End') {
      x = -(half - view.clientWidth * 0.5)
      v = 0
      idleUntil = performance.now() + IDLE_MS
      e.preventDefault()
    }
  }

  /* ------------------------------------------------------------ 生命周期 */
  const enter = () => {
    hover = true
  }
  const leave = () => {
    hover = false
  }
  const fin = () => {
    // 鼠标按一下轨道也会 focusin。只有「键盘焦点」才该冻住巡航 ——
    // 否则拖一次松手，轨道就永远定死在那儿，是最难查的一类手感 bug。
    focused = typeof view.matches === 'function' ? view.matches(':focus-visible') : true
  }
  const fout = () => {
    focused = false
  }

  view.addEventListener('pointerdown', onDown)
  view.addEventListener('pointermove', onMove)
  view.addEventListener('pointerup', onUp)
  view.addEventListener('pointercancel', onUp)
  view.addEventListener('lostpointercapture', onUp)
  view.addEventListener('click', onClick, true)
  view.addEventListener('keydown', onKey)
  view.addEventListener('pointerenter', enter)
  view.addEventListener('pointerleave', leave)
  view.addEventListener('focusin', fin)
  view.addEventListener('focusout', fout)

  const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null
  ro?.observe(inner)
  window.addEventListener('resize', measure)

  let io: IntersectionObserver | null = null
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((en) => en.isIntersecting)
      },
      { rootMargin: '200px 0px' }
    )
    io.observe(view)
  }

  const offVel = onVelocity((next) => {
    sv = next
  })

  measure()
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      cancelAnimationFrame(raf)
      view.removeEventListener('pointerdown', onDown)
      view.removeEventListener('pointermove', onMove)
      view.removeEventListener('pointerup', onUp)
      view.removeEventListener('pointercancel', onUp)
      view.removeEventListener('lostpointercapture', onUp)
      view.removeEventListener('click', onClick, true)
      view.removeEventListener('keydown', onKey)
      view.removeEventListener('pointerenter', enter)
      view.removeEventListener('pointerleave', leave)
      view.removeEventListener('focusin', fin)
      view.removeEventListener('focusout', fout)
      window.removeEventListener('resize', measure)
      ro?.disconnect()
      io?.disconnect()
      offVel()
    },
    setPaused(p: boolean) {
      external = p
      if (!p) idleUntil = performance.now() + 400
    },
    state: {
      get x() {
        return x
      },
      get v() {
        return v
      },
    } as { x: number; v: number },
  }
}
