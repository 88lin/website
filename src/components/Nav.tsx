import { useEffect, useRef, useState } from 'react'
import { nav, profile } from '../content/site'
import { Btn } from './ui'

/** components.md #9：细 hairline 底边 + 黄色下划线的导航项 + 一个胶囊 CTA。 */
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
        solid ? 'border-b border-line bg-cream' : ''
      }`}
    >
      <nav className="shell flex h-[72px] items-center justify-between gap-6" aria-label="主导航">
        <a href="#top" className="flex shrink-0 items-baseline gap-2.5">
          <span className="serif text-[1.3rem] leading-none font-bold tracking-tight">
            {profile.name}
          </span>
          <span className="serif hidden text-[0.9rem] leading-none font-semibold text-brand-text sm:inline">
            {profile.handle}
          </span>
        </a>

        <div className="flex items-center gap-1 sm:gap-4">
          <ul className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="nav-item">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <Btn size="sm" arrow={false} className="whitespace-nowrap" />
        </div>
      </nav>
    </header>
  )
}
