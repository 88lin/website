import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Stage, StageTargets } from './Stage'
import { ScrollTrigger, prefersReduced, isTouch } from '../lib/motion'

const Ctx = createContext<Stage | null>(null)

/** 相机视场角。分区需要把世界坐标反投影成屏幕像素时要用同一个值 */
export const CLUSTER_FOV = 38

export function useStage() {
  return useContext(Ctx)
}

/**
 * 当区块进入视口时把场景参数推给 Stage。
 * Stage 内部做临界阻尼插值，所以这里只需给目标值，不必自己写补间。
 */
export type SceneTargets = Partial<StageTargets> | ((vw: number, vh: number) => Partial<StageTargets>)

export function useScene(
  ref: React.RefObject<HTMLElement | null>,
  targets: SceneTargets,
  narrowTargets?: Partial<StageTargets>
) {
  const stage = useStage()
  useEffect(() => {
    const el = ref.current
    if (!el || !stage) return
    const apply = () => {
      // 窄屏视野只有宽屏的四分之一，同一组世界坐标会退化成边缘上的碎片，
      // 所以允许区块单独给窄屏一套构图。
      const vw = window.innerWidth
      const vh = window.innerHeight
      // 函数形式：世界坐标要跟版面上的某个屏幕位置对齐时，必须按当前宽高比解算
      const base = typeof targets === 'function' ? targets(vw, vh) : targets
      stage.set(vw < 1024 && narrowTargets ? { ...base, ...narrowTargets } : base)
    }
    // start 与 end 必须落在同一条视口基准线上。相邻区块满足 A.bottom === B.top，
    // 因此 A 的 end 与 B 的 start 首尾相接、绝不重叠，任意滚动位置上有且只有
    // 一个区块在控制舞台。
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 62%',
      end: 'bottom 62%',
      onEnter: apply,
      onEnterBack: apply,
    })
    const onResize = () => st.isActive && apply()
    window.addEventListener('resize', onResize)
    return () => {
      st.kill()
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
}

export function StageProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stage, setStage] = useState<Stage | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let s: Stage | null = null
    let disposed = false
    const cleanups: Array<() => void> = []

    // three.js 是 121 KB gzip，压在关键路径上会直接拖慢 LCP。
    // 等首屏画完、主线程空下来再动态载入；载入失败就退回 .no-webgl 静态版。
    const boot = async () => {
      if (disposed) return
      let mod: typeof import('./Stage')
      try {
        mod = await import('./Stage')
      } catch {
        document.documentElement.classList.add('no-webgl')
        return
      }
      if (disposed) return
      if (!mod.webglAvailable()) {
        document.documentElement.classList.add('no-webgl')
        return
      }
      const lowPower = isTouch() || window.innerWidth < 900
      try {
        s = new mod.Stage(canvas, { lowPower, reduced: prefersReduced() })
      } catch {
        document.documentElement.classList.add('no-webgl')
        return
      }
      const st = s

      st.start()
      // 画布底色与页面纸底一致，但仍留一段淡入，避免首帧未渲染时闪一下
      document.documentElement.classList.add('stage-on')
      setStage(st)
      ScrollTrigger.refresh()

      const onPointer = (e: PointerEvent) => {
        st.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
      }
      if (!isTouch()) {
        window.addEventListener('pointermove', onPointer, { passive: true })
        cleanups.push(() => window.removeEventListener('pointermove', onPointer))
      }

      const onVis = () => (document.hidden ? st.stop() : st.start())
      document.addEventListener('visibilitychange', onVis)
      cleanups.push(() => document.removeEventListener('visibilitychange', onVis))

      const onLost = (e: Event) => {
        e.preventDefault()
        document.documentElement.classList.add('no-webgl')
        st.stop()
      }
      canvas.addEventListener('webglcontextlost', onLost)
      cleanups.push(() => canvas.removeEventListener('webglcontextlost', onLost))
    }

    const idle = (cb: () => void) => {
      const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number })
        .requestIdleCallback
      return ric ? ric(cb, { timeout: 1600 }) : window.setTimeout(cb, 220)
    }
    let handle = 0
    if (document.readyState === 'complete') handle = idle(boot)
    else {
      const onLoad = () => (handle = idle(boot))
      window.addEventListener('load', onLoad, { once: true })
      cleanups.push(() => window.removeEventListener('load', onLoad))
    }

    return () => {
      disposed = true
      if (handle) {
        const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback
        cic ? cic(handle) : clearTimeout(handle)
      }
      cleanups.forEach((f) => f())
      document.documentElement.classList.remove('stage-on')
      s?.dispose()
      setStage(null)
    }
  }, [])

  return (
    <Ctx.Provider value={stage}>
      <canvas id="stage" ref={canvasRef} aria-hidden="true" />
      {children}
    </Ctx.Provider>
  )
}
