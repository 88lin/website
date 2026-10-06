/** Lenis 的输入接管与生命周期；滚动曲线保持原站配置。 */
export async function bootScroll(signal?: AbortSignal) {
  if (typeof window === 'undefined' || signal?.aborted) return () => {}
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  // StrictMode 的第一次 effect 可能在异步加载期间清理。
  const [{ default: Lenis }, { ScrollTrigger }] = await Promise.all([
    import('lenis'),
    import('gsap/ScrollTrigger'),
  ])
  if (signal?.aborted) return () => {}

  const root = document.documentElement
  const events = new AbortController()
  let lenis: InstanceType<typeof Lenis> | null = null
  let observer: ResizeObserver | null = null
  let raf = 0
  let lastWritten = window.scrollY
  let touchUntil = 0
  let pageActive = true
  let disposed = false

  const interrupt = () => {
    // 通过公开 API 清掉惯性，不补写位置，也不留下页面锁定状态。
    // immediate scrollTo 会打断浏览器刚开始的原生平滑导航，不能用于这里。
    lenis?.stop()
    lenis?.start()
    lastWritten = window.scrollY
  }

  const resize = () => {
    if (!lenis) return
    const dimensions = lenis.dimensions
    if (dimensions.scrollHeight === root.scrollHeight && dimensions.scrollWidth === root.scrollWidth
      && dimensions.height === window.innerHeight && dimensions.width === window.innerWidth) return
    interrupt()
    lenis.resize()
  }

  const needsNativeScroll = (event: WheelEvent | TouchEvent) => {
    for (const element of event.composedPath()) {
      if (!(element instanceof Element) || element === root || element === document.body) continue
      if (element.matches('input, textarea, select, [contenteditable], dialog, [role="dialog"], [data-native-scroll], [data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-vertical]')) return true
      // 只判断当前的纵向手势。横推轨到头时仍须把纵向输入交回页面。
      const style = getComputedStyle(element)
      if (/(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) return true
    }
    return false
  }

  const loop = (time: number) => {
    if (!lenis) return
    if (lenis.isScrolling === 'smooth' && Math.abs(window.scrollY - lastWritten) > .5) interrupt()
    lenis.raf(time)
    lastWritten = window.scrollY
    raf = requestAnimationFrame(loop)
  }

  const suspend = () => {
    cancelAnimationFrame(raf)
    raf = 0
    observer?.disconnect()
    observer = null
    // 清掉滚动态，防止库内延迟的 native-scroll 回调在销毁后重写 class。
    lenis?.stop()
    lenis?.destroy()
    lenis = null
  }

  const sync = () => {
    if (disposed || !pageActive || document.hidden || reducedMotion.matches) {
      suspend()
      return
    }
    if (lenis) return
    lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
      wheelMultiplier: 0.92,
      touchMultiplier: 1.4,
      // 布局观察在下一次绘制前刷新边界，不等待默认的 250ms debounce。
      autoResize: false,
      virtualScroll: ({ event, deltaX, deltaY }) => {
        if (event.type !== 'wheel' || event.defaultPrevented || !event.cancelable
          || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
          || !deltaY || Math.abs(deltaX) >= Math.abs(deltaY)
          || performance.now() < touchUntil || needsNativeScroll(event)) {
          interrupt()
          return false
        }
        if (Math.abs(window.scrollY - lastWritten) > .5) interrupt()
        return true
      },
    })
    lenis.on('scroll', () => ScrollTrigger.update())
    observer = new ResizeObserver(resize)
    observer.observe(root)
    lastWritten = window.scrollY
    raf = requestAnimationFrame(loop)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    suspend()
    events.abort()
    ScrollTrigger.removeEventListener('refresh', resize)
    signal?.removeEventListener('abort', dispose)
  }

  const capture = { capture: true, signal: events.signal }
  document.addEventListener('pointerdown', interrupt, { ...capture, passive: true })
  document.addEventListener('touchstart', () => {
    touchUntil = performance.now() + 800
    interrupt()
  }, { ...capture, passive: true })
  document.addEventListener('keydown', interrupt, capture)
  document.addEventListener('click', interrupt, capture)
  document.addEventListener('focusin', interrupt, capture)
  document.addEventListener('visibilitychange', sync, { signal: events.signal })
  window.addEventListener('resize', resize, { passive: true, signal: events.signal })
  window.visualViewport?.addEventListener('resize', resize, { passive: true, signal: events.signal })
  window.addEventListener('pagehide', () => { pageActive = false; suspend() }, { signal: events.signal })
  window.addEventListener('pageshow', () => { pageActive = true; sync() }, { signal: events.signal })
  window.addEventListener('popstate', interrupt, { signal: events.signal })
  window.addEventListener('hashchange', interrupt, { signal: events.signal })
  reducedMotion.addEventListener('change', sync, { signal: events.signal })
  ScrollTrigger.addEventListener('refresh', resize)
  signal?.addEventListener('abort', dispose, { once: true })
  sync()
  return dispose
}
