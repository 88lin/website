import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Stage, StageTargets, SubjectKey } from './Stage'
import { ScrollTrigger, prefersReduced, isTouch } from '../lib/motion'
import { asset } from '../lib/asset'

const Ctx = createContext<Stage | null>(null)

export function useStage() {
  return useContext(Ctx)
}

/**
 * 当区块进入视口时把场景参数推给 Stage。
 * Stage 内部做临界阻尼插值，所以这里只需给目标值，不必自己写补间。
 */
export function useScene(
  ref: React.RefObject<HTMLElement | null>,
  targets: Partial<StageTargets>,
  subjects?: Partial<Record<'car' | 'robot' | 'cat' | 'rabbit', number>>,
  narrowTargets?: Partial<StageTargets>
) {
  const stage = useStage()
  useEffect(() => {
    const el = ref.current
    if (!el || !stage) return
    const apply = () => {
      // 窄屏视野只有宽屏的四分之一，同一组世界坐标会退化成边缘上的碎片，
      // 所以允许区块单独给窄屏一套构图。
      const narrow = window.innerWidth < 1024
      stage.set(narrow && narrowTargets ? { ...targets, ...narrowTargets } : targets)
      stage.hideAllSubjects()
      // 素材只在有横向余量的宽屏出现，窄屏交给主形体
      if (subjects && window.innerWidth >= 1024) {
        for (const [k, v] of Object.entries(subjects)) {
          stage.showSubject(k as 'car', v as number)
        }
      }
    }
    // start 与 end 必须落在同一条视口基准线上。相邻区块满足 A.bottom === B.top，
    // 因此 A 的 end 与 B 的 start 首尾相接、绝不重叠，任意滚动位置上有且只有
    // 一个区块在控制舞台。若写成 62% / 38% 这种不对称区间，会留下一条 24vh 的
    // 重叠带；在带内往回滚会重新触发上一区块的 hideAllSubjects()，
    // 素材（机器人 / 车 / 兔 / 猫）会凭空消失。
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 62%',
      end: 'bottom 62%',
      onEnter: apply,
      onEnterBack: apply,
    })
    return () => st.kill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])
}

/**
 * 把某个 DOM 占位框和一张写实素材绑定：素材始终填进这个框。
 * 版面怎么排，素材就怎么落位，不需要再手调世界坐标。
 */
export function useAnchorEl(
  elRef: React.RefObject<HTMLElement | null>,
  key: SubjectKey,
  hMul = 1,
  z = 1.1
) {
  const stage = useStage()
  useEffect(() => {
    const el = elRef.current
    if (!el || !stage) return
    const sync = () => {
      const r = el.getBoundingClientRect()
      if (r.width < 1) return
      stage.anchorSubject(
        key,
        (r.left + r.width / 2) / window.innerWidth,
        (r.top + r.height / 2) / window.innerHeight,
        (r.height / window.innerHeight) * hMul,
        z
      )
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: sync,
      onRefresh: sync,
    })
    sync()
    window.addEventListener('resize', sync)
    return () => {
      st.kill()
      window.removeEventListener('resize', sync)
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

      const base = asset('')
      Promise.all([
        st.loadSubject('car', `${base}subjects/car.webp`, 1.5),
        st.loadSubject('robot', `${base}subjects/robot.webp`, 1),
        st.loadSubject('cat', `${base}subjects/cat.webp`, 1),
        st.loadSubject('rabbit', `${base}subjects/rabbit.webp`, 1),
      ]).then(() => {
        if (disposed) return
        // 开孔里的素材几乎填满圆窗，纸底上漂浮的素材保留柔和渐隐边
        st.setSubjectFeather('robot', 0.43, 0.53)
        st.setSubjectFeather('car', 0.42, 0.54)
        st.setSubjectFeather('cat', 0.3, 0.52)
        st.setSubjectFeather('rabbit', 0.32, 0.52)
        // 兜底锚点，真正的落位由各区块的 useAnchorEl 用版面占位框覆盖
        st.anchorSubject('cat', 0.775, 0.3, 0.36, 1.1)
        ScrollTrigger.refresh()
      })

      st.start()
      setStage(st)

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
