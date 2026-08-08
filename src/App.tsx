import { useEffect } from 'react'
import Lenis from 'lenis'
import { Nav } from './components/Nav'
import { ChannelFilters } from './components/Cover'
import { StageProvider } from './webgl/StageContext'
import { Hero } from './sections/Hero'
import { Stats } from './sections/Stats'
import { Tracks } from './sections/Tracks'
import { Work } from './sections/Work'
import { Cases } from './sections/Cases'
import { Garden } from './sections/Garden'
import { Stack } from './sections/Stack'
import { Writing } from './sections/Writing'
import { Contact } from './sections/Contact'
import { gsap, ScrollTrigger, prefersReduced } from './lib/motion'

function useSmoothScroll() {
  useEffect(() => {
    let lenis: Lenis | null = null
    let cleanupTicker: (() => void) | undefined

    if (!prefersReduced()) {
      const l = new Lenis({ duration: 1.05, wheelMultiplier: 1, touchMultiplier: 1.6, smoothWheel: true })
      lenis = l
      l.on('scroll', ScrollTrigger.update)
      const raf = (time: number) => l.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
      cleanupTicker = () => gsap.ticker.remove(raf)
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

export default function App() {
  useSmoothScroll()

  return (
    <StageProvider>
      <ChannelFilters />
      <Nav />
      <main className="above">
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
    </StageProvider>
  )
}
