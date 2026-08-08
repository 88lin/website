import { useEffect, useRef } from 'react'
import { metrics, META_AS_OF } from '../content/site'
import { gsap, countUp, fadeUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

export function Stats() {
  const ref = useRef<HTMLElement>(null)

  useScene(ref, { formX: -1.9, formY: 0.55, formScale: 0.92, amp: 0.34, freq: 1.5, twist: 0.9, spin: 0.3, camZ: 6.6, particles: 0.95, exposure: 1.0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      fadeUp('.stat-cell', el, 0.07, 20)
      el.querySelectorAll<HTMLElement>('.stat-value').forEach((n) => countUp(n, n.dataset.raw ?? ''))
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="field-paper relative border-y border-ink/12 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="shell">
        <dl className="grid grid-cols-2 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`stat-cell px-0 opacity-0 sm:px-7 ${
                i % 2 === 1 ? 'border-l border-ink/12 pl-6 sm:border-l-0 sm:pl-7' : ''
              } ${i > 0 ? 'sm:border-l sm:border-ink/12' : ''}`}
            >
              <dd
                className="stat-value mono text-[clamp(2rem,3.4vw,3.1rem)] font-medium leading-none tracking-tight tabular-nums"
                data-raw={m.value}
              >
                {m.value}
              </dd>
              <dt className="mt-4 text-[0.95rem] font-medium">{m.label}</dt>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-60">{m.sub}</p>
            </div>
          ))}
        </dl>
        <p className="mono mt-10 text-[0.7rem] tracking-[0.12em] text-ink-60">
          数据截至 {META_AS_OF} · 来源 GitHub API 与博客统计
        </p>
      </div>
    </section>
  )
}
