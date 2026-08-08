import { useEffect, useRef, useState } from 'react'
import { nav, profile } from '../content/site'
import { Cta } from './ui'

export function Nav() {
  const [solid, setSolid] = useState(false)
  const raf = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => setSolid(window.scrollY > 40))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? 'border-b border-ink/12 bg-paper/88 backdrop-blur-md' : ''
      }`}
    >
      <nav className="shell flex h-[68px] items-center justify-between gap-6" aria-label="主导航">
        <a href="#top" className="flex items-baseline gap-3 shrink-0">
          <span className="display text-[1.35rem] leading-none tracking-tight">{profile.name}</span>
          <span className="mono hidden text-[0.7rem] tracking-[0.18em] text-ink-60 sm:inline">
            {profile.handle.toUpperCase()}
          </span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <ul className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <li key={n.href}>
                <a
                  href={n.href}
                  className="mono block px-3 py-2 text-[0.78rem] tracking-[0.1em] text-ink-60 transition-colors hover:text-ink"
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <Cta className="whitespace-nowrap" />
        </div>
      </nav>
    </header>
  )
}
