import { useEffect, useRef } from 'react'
import { cases, type CaseStudy } from '../content/site'
import { gsap, prefersReduced, fadeUp } from '../lib/motion'
import { useScene, useAnchorEl } from '../webgl/StageContext'
import { asset } from '../lib/asset'

const TONE: Record<CaseStudy['tone'], { spine: string; num: string }> = {
  cobalt: { spine: 'bg-cobalt', num: 'text-cobalt' },
  vermilion: { spine: 'bg-vermilion', num: 'text-vermilion-deep' },
  ink: { spine: 'bg-ink', num: 'text-ink' },
}

export function Cases() {
  const ref = useRef<HTMLElement>(null)
  const carRef = useRef<HTMLDivElement>(null)

  // 主形体退到画面下方之外，这一屏的视觉主体是那台车
  useScene(
    ref,
    { formX: -1.2, formY: -3.4, formScale: 1.0, amp: 0.22, freq: 1.9, twist: 0.9, spin: 0.3, camZ: 6.0, particles: 0.22, exposure: 1.0 },
    { car: 1 }
  )
  useAnchorEl(carRef, 'car', 1.0)

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
          {/* 写实素材占位框：真车落在标题左侧的空白里 */}
          <div className="relative col-span-4 hidden lg:block">
            <div
              ref={carRef}
              aria-hidden
              className="pointer-events-none absolute left-[-6%] top-1/2 aspect-[3/2] w-[min(32vw,440px)] -translate-y-1/2"
            />
          </div>
          {/* 窄屏补位：宽屏这张图由 WebGL 素材层渲染在标题左侧 */}
          <img
            src={asset('subjects/car.webp')}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="subject-img col-span-12 mb-2 aspect-[3/2] w-[min(86vw,420px)] object-cover lg:hidden"
          />
          <div className="cases-head col-span-12 max-w-[54ch] lg:col-span-8">
            <h2 className="display text-d2 opacity-0">怎么做的</h2>
            <p className="mt-6 text-lead text-ink-60 opacity-0">
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
              <article className="panel relative flex min-h-[68vh] flex-col overflow-hidden">
                <div className={`absolute inset-y-0 left-0 w-[5px] ${tone.spine}`} aria-hidden />
                <div className="grid grid-cols-12 gap-x-6 gap-y-8 p-7 pl-9 sm:p-10 sm:pl-12">
                  <header className="col-span-12 lg:col-span-4">
                    <p className={`mono text-[clamp(2.6rem,5vw,4.2rem)] font-medium leading-none tabular-nums ${tone.num}`}>
                      {c.index}
                    </p>
                    <h3 className="display mt-5 text-[clamp(1.6rem,2.6vw,2.3rem)] leading-none tracking-tight">
                      {c.name}
                    </h3>
                    <p className="mt-3 max-w-[26ch] text-[1rem] leading-[1.7] text-ink-60">{c.cn}</p>
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-link mt-6 inline-block text-[0.92rem]"
                    >
                      {c.linkLabel}
                    </a>
                  </header>

                  <div className="col-span-12 lg:col-span-8">
                    <div className="space-y-6">
                      {c.sections.map((s) => (
                        <div key={s.label} className="grid grid-cols-12 gap-x-5 border-t border-ink/12 pt-5">
                          <p className="mono col-span-12 text-[0.72rem] tracking-[0.18em] text-ink-60 sm:col-span-2">
                            {s.label}
                          </p>
                          <p className="col-span-12 mt-2 text-[0.97rem] leading-[1.8] sm:col-span-10 sm:mt-0">
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
                          <dt className="mt-2 text-[0.82rem] text-ink-60">{r.label}</dt>
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
