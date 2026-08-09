import { useEffect } from 'react'
import Lenis from 'lenis'
import { Nav } from './components/Nav'
import { Hero } from './sections/Hero'
import { Stats } from './sections/Stats'
import { Tracks } from './sections/Tracks'
import { Work } from './sections/Work'
import { Cases } from './sections/Cases'
import { Garden } from './sections/Garden'
import { Stack } from './sections/Stack'
import { Writing } from './sections/Writing'
import { Contact } from './sections/Contact'
import {
  gsap,
  ScrollTrigger,
  prefersReduced,
  pushVelocity,
  tickVelocity,
  enableVelocityBus,
} from './lib/motion'
import { ENABLE_3D, ENABLE_VELOCITY_BUS } from './lib/flags'
import { typeCaps } from './webgl/caps'

/**
 * duration 模式在快速连续滚轮下会不断重置补间，表现为「黏、飘、追不上」。
 * lerp 模式是每帧指数逼近，连续输入时更跟手，松手后仍留惯性。
 * 两套参数都留着，scripts/scroll-feel.mjs 用 ?scroll= 切换后逐帧比对。
 */
// lerp 由 scripts/scroll-feel.mjs 扫描选定：
// 0.07→lag 134px / 0.09→104 / 0.12→79 / 0.15→66 / 0.20→43（V3 的 duration 模式 ≈96）
// 0.12 是「明显比 V3 跟手」与「松手后仍有惯性」的交点，且速度抖动率停在 0.032 的地板上。
const LENIS_LERP = {
  lerp: 0.12,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.5,
  smoothWheel: true,
  syncTouch: true,
  syncTouchLerp: 0.075,
  gestureOrientation: 'vertical' as const,
}

const LENIS_DURATION = {
  duration: 1.05,
  wheelMultiplier: 1,
  touchMultiplier: 1.6,
  smoothWheel: true,
}

/** 调参用：?scroll=duration 切旧模式，?lerp=0.11 覆盖阻尼系数。仅 scroll-feel.mjs 使用。 */
function lenisOptions() {
  if (typeof window === 'undefined') return LENIS_LERP
  const q = new URLSearchParams(window.location.search)
  if (q.get('scroll') === 'duration') return LENIS_DURATION
  const override = Number(q.get('lerp'))
  return Number.isFinite(override) && override > 0 && override < 1
    ? { ...LENIS_LERP, lerp: override }
    : LENIS_LERP
}

function useSmoothScroll() {
  useEffect(() => {
    let lenis: Lenis | null = null
    let cleanupTicker: (() => void) | undefined

    if (!prefersReduced()) {
      const l = new Lenis(lenisOptions())
      lenis = l
      const busOn = ENABLE_VELOCITY_BUS
      enableVelocityBus(busOn)
      l.on('scroll', (e: { velocity: number }) => {
        ScrollTrigger.update()
        if (busOn) pushVelocity(e.velocity)
      })
      const raf = (time: number) => {
        l.raf(time * 1000)
        tickVelocity()
      }
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
      cleanupTicker = () => {
        gsap.ticker.remove(raf)
        enableVelocityBus(false)
      }
      ;(window as unknown as { __lenis?: Lenis }).__lenis = l
    } else {
      enableVelocityBus(false)
    }

    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      if (!a) return
      const id = a.getAttribute('href')!
      if (id === '#') return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      if (lenis) lenis.scrollTo(target as HTMLElement, { offset: -76, duration: 1.15 })
      else (target as HTMLElement).scrollIntoView({ behavior: 'auto', block: 'start' })
      history.replaceState(null, '', id)
    }
    document.addEventListener('click', onAnchor)

    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    if (document.fonts?.ready) document.fonts.ready.then(refresh)
    const t = window.setTimeout(refresh, 900)

    return () => {
      document.removeEventListener('click', onAnchor)
      window.removeEventListener('load', refresh)
      window.clearTimeout(t)
      cleanupTicker?.()
      lenis?.destroy()
    }
  }, [])
}

/**
 * 3D 活字舞台。
 *
 * 门禁在加载 three 之前就判完：不合格的设备一个字节都不下载，它们看到的是
 * DOM 活字方阵——那一层不是降级截图，本来就是设计的一部分。合格的设备等到
 * 空闲时才动态 import，不进关键路径。
 */
function useTypeStage() {
  useEffect(() => {
    if (!ENABLE_3D) return
    const verdict = typeCaps()
    const w = window as unknown as { __typeStage?: unknown; requestIdleCallback?: typeof setTimeout }
    if (!verdict.ok) {
      w.__typeStage = { ok: false, reason: verdict.reason, running: false, calls: 0 }
      return
    }

    let dispose: (() => void) | undefined
    let dropped = false
    const boot = () => {
      import('./webgl/Stage')
        .then(({ mountTypeStage }) => {
          if (dropped) return
          dispose = mountTypeStage()
          ScrollTrigger.refresh()
        })
        .catch(() => {
          w.__typeStage = { ok: false, reason: 'import-failed', running: false, calls: 0 }
        })
    }

    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => number })
      .requestIdleCallback
    const id = ric ? ric(boot, { timeout: 3000 }) : window.setTimeout(boot, 1400)

    return () => {
      dropped = true
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback
      if (ric && cic) cic(id)
      else window.clearTimeout(id)
      dispose?.()
    }
  }, [])
}

export default function App() {
  useSmoothScroll()
  useTypeStage()

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Tracks />
        <Work />
        <Cases />
        <Garden />
        <Stack />
        <Writing />
        <Contact />
      </main>
    </>
  )
}
