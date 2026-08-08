import { useEffect, useRef } from 'react'
import { contact, footer, profile, META_AS_OF } from '../content/site'
import { Cta } from '../components/ui'
import { gsap, revealLines, fadeUp } from '../lib/motion'
import { useScene, useAnchorEl } from '../webgl/StageContext'
import { asset } from '../lib/asset'

export function Contact() {
  const ref = useRef<HTMLElement>(null)
  const catRef = useRef<HTMLDivElement>(null)

  useScene(
    ref,
    { formX: -3.5, formY: -3.5, formScale: 2.3, amp: 0.2, freq: 0.95, twist: 0.45, spin: 0.22, camZ: 6.2, particles: 0.7, exposure: 1.05 },
    { cat: 1 }
  )
  useAnchorEl(catRef, 'cat', 1.0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      revealLines(el)
      fadeUp('.contact-fade', el, 0.09, 24)
      fadeUp('.channel', el, 0.05, 18)
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} id="contact" className="relative pt-[clamp(5rem,12vw,9rem)]">
      <div className="shell">
        <div className="grid grid-cols-12 gap-x-6">
          <div className="col-span-12 lg:col-span-7">
            <h2 className="display text-d1">
              <span className="reveal-line">
                <span>{contact.headline}</span>
              </span>
            </h2>
            <p className="contact-fade mt-8 max-w-[44ch] text-lead text-ink-60 opacity-0">{contact.body}</p>
            <div className="contact-fade mt-10 opacity-0">
              <Cta size="lg" />
            </div>
            <img
              src={asset('subjects/cat.webp')}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="subject-img mt-8 aspect-square w-[min(58vw,260px)] object-cover lg:hidden"
            />
          </div>
          <div className="relative col-span-5 hidden lg:block">
            <div
              ref={catRef}
              aria-hidden
              className="pointer-events-none absolute right-[4%] top-1/2 aspect-square w-[min(26vw,360px)] -translate-y-1/2"
            />
          </div>
        </div>

        <ul className="mt-[clamp(4rem,9vw,7rem)] grid grid-cols-1 gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 md:grid-cols-3">
          {contact.channels.map((c) => (
            <li key={c.id} className="channel bg-paper opacity-0">
              <a
                href={c.href}
                target={c.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="group flex h-full flex-col gap-2 p-5 transition-colors duration-200 hover:bg-ink sm:p-6"
              >
                <span className="mono text-[0.7rem] tracking-[0.18em] text-ink-60 group-hover:text-paper/60">
                  {c.label}
                </span>
                <span className="break-all text-[0.95rem] group-hover:text-paper">{c.value}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className="field-vermilion mt-[clamp(3.5rem,7vw,5.5rem)] py-9">
        <div className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <p className="mono text-[0.76rem] tracking-[0.08em] text-ink">{footer.copyright}</p>
          <p className="mono text-[0.76rem] tracking-[0.08em] text-ink/90">
            {footer.note}{' '}
            <a href={footer.source} target="_blank" rel="noopener noreferrer" className="on-vermilion-link">
              查看源码
            </a>
          </p>
          <p className="mono text-[0.76rem] tracking-[0.08em] text-ink/90">
            {profile.location} · 数据 {META_AS_OF}
          </p>
        </div>
      </footer>
    </section>
  )
}
