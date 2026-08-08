import { useEffect, useRef } from 'react'
import { cases, type CaseStudy } from '../content/site'
import { gsap, prefersReduced, fadeUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

const TONE: Record<CaseStudy['tone'], { spine: string; num: string }> = {
  cobalt: { spine: 'bg-cobalt', num: 'text-cobalt' },
  vermilion: { spine: 'bg-vermilion', num: 'text-vermilion-deep' },
  ink: { spine: 'bg-ink', num: 'text-ink' },
}

export function Cases() {
  const ref = useRef<HTMLElement>(null)

  // 卡片是实色面板，只有导语区透光：晶簇停在标题右侧的空白里
  useScene(
    ref,
    { clusterX: 2.55, clusterY: 0.85, clusterScale: 0.7, spread: 1.0, spin: 0.24, tilt: -0.12, dispersion: 5.6, glow: 0.95, tint: 0.55, camZ: 6.0, exposure: 1.02 },
    { clusterX: 0.38, clusterY: 1.45, clusterScale: 0.55, spread: 0.75 }
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      fadeUp('.cases-head > *', el, 0.08, 22)
      if (prefersReduced()) return
      const cards = gsap.utils.toArray<HTMLElement>('.case-card')
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        gsap.to(card, {
          scale: 0.945,
          opacity: 0.4,
          ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top 88%', end: 'top 18%', scrub: true },
        })
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} id="cases" className="relative py-[clamp(4.5rem,10vw,8rem)]">
      <div className="shell mb-[clamp(2.5rem,5vw,4rem)]">
        <div className="grid grid-cols-12 items-center gap-x-6">
          <div className="cases-head col-span-12 max-w-[54ch] lg:col-span-7">
            <h2 className="display text-d2 opacity-0">怎么做的</h2>
            <p className="mt-6 text-lead text-ink-70 opacity-0">
              三个项目，各写清楚一件事：背景、卡在哪、最后怎么解。数字都是仓库里能查到的。
            </p>
          </div>
        </div>
      </div>

      <div className="shell">
        {cases.map((c, i) => {
          const tone = TONE[c.tone]
          return (
            <div
              key={c.slug}
              className="case-card"
              style={{ top: `calc(7vh + ${i * 16}px)`, zIndex: i + 1, marginBottom: i < cases.length - 1 ? '3rem' : 0 }}
            >
              <article className="panel relative flex min-h-[68vh] flex-col overflow-hidden rounded-xl">
                <div className={`absolute inset-y-0 left-0 w-[5px] ${tone.spine}`} aria-hidden />
                <div className="grid grid-cols-12 gap-x-6 gap-y-8 p-7 pl-9 sm:p-10 sm:pl-12">
                  <header className="col-span-12 lg:col-span-4">
                    <p className={`mono text-[clamp(2.6rem,5vw,4.2rem)] font-medium leading-none tabular-nums ${tone.num}`}>
                      {c.index}
                    </p>
                    <h3 className="display mt-5 text-[clamp(1.6rem,2.6vw,2.3rem)] leading-none tracking-tight">
                      {c.name}
                    </h3>
                    <p className="mt-3 max-w-[26ch] text-[1.0625rem] leading-[1.7] text-ink-70">{c.cn}</p>
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-link mt-6 inline-block text-[1rem]"
                    >
                      {c.linkLabel}
                    </a>
                  </header>

                  <div className="col-span-12 lg:col-span-8">
                    <div className="space-y-6">
                      {c.sections.map((s) => (
                        <div key={s.label} className="grid grid-cols-12 gap-x-5 border-t border-ink/12 pt-5">
                          <p className="mono col-span-12 text-[0.875rem] tracking-[0.06em] text-ink-70 sm:col-span-2">
                            {s.label}
                          </p>
                          <p className="col-span-12 mt-2 text-[1rem] leading-[1.8] sm:col-span-10 sm:mt-0">
                            {s.body}
                          </p>
                        </div>
                      ))}
                    </div>

                    <dl className="mt-9 grid grid-cols-2 gap-y-6 border-t-2 border-ink pt-6 sm:grid-cols-4">
                      {c.result.map((r) => (
                        <div key={r.label}>
                          <dd className="mono text-[clamp(1.5rem,2.4vw,2.1rem)] font-medium leading-none tabular-nums">
                            {r.value}
                          </dd>
                          <dt className="mt-2 text-[0.875rem] font-medium text-ink-70">{r.label}</dt>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </article>
            </div>
          )
        })}
      </div>
    </section>
  )
}
