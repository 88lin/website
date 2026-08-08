import { useEffect, useRef } from 'react'
import { contact, footer, profile, META_AS_OF } from '../content/site'
import { Cta } from '../components/ui'
import { gsap, revealLines, fadeUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

export function Contact() {
  const ref = useRef<HTMLElement>(null)

  // 收尾放到最大：晶簇压在标题右侧，色散拉满
  useScene(
    ref,
    { clusterX: 2.45, clusterY: -0.25, clusterScale: 0.85, spread: 1.0, spin: 0.2, tilt: 0.16, dispersion: 6.2, glow: 1.1, tint: 0.5, camZ: 6.2, exposure: 1.05 },
    { clusterX: 0.28, clusterY: -1.42, clusterScale: 0.72, spread: 0.85 }
  )

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
            <p className="contact-fade mt-8 max-w-[44ch] text-lead text-ink-70 opacity-0">{contact.body}</p>
            <div className="contact-fade mt-10 opacity-0">
              <Cta size="lg" />
            </div>
          </div>
        </div>

        <ul className="mt-[clamp(4rem,9vw,7rem)] grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-ink/15 bg-ink/15 sm:grid-cols-2 md:grid-cols-3">
          {contact.channels.map((c) => (
            <li key={c.id} className="channel bg-paper opacity-0">
              <a
                href={c.href}
                target={c.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="group flex h-full flex-col gap-2 p-5 transition-colors duration-200 hover:bg-ink sm:p-6"
              >
                <span className="mono text-[0.875rem] tracking-[0.06em] text-ink-70 group-hover:text-paper/88">
                  {c.label}
                </span>
                <span className="break-all text-[1rem] group-hover:text-paper">{c.value}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className="field-vermilion mt-[clamp(3.5rem,7vw,5.5rem)] py-9">
        <div className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <p className="mono text-[0.875rem] tracking-[0.05em] text-ink">{footer.copyright}</p>
          <p className="mono text-[0.875rem] tracking-[0.05em] text-ink/90">
            {footer.note}{' '}
            <a href={footer.source} target="_blank" rel="noopener noreferrer" className="on-vermilion-link">
              查看源码
            </a>
          </p>
          <p className="mono text-[0.875rem] tracking-[0.05em] text-ink/90">
            {profile.location} · 数据 {META_AS_OF}
          </p>
        </div>
      </footer>
    </section>
  )
}
