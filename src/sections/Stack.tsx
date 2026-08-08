import { useEffect, useRef } from 'react'
import { stack } from '../content/site'
import { gsap, revealLines, fadeUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

const SPAN = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

export function Stack() {
  const ref = useRef<HTMLElement>(null)

  useScene(ref, { formX: 0, formY: -0.4, formScale: 2.4, amp: 0.7, freq: 1.2, twist: 3.0, spin: 0.1, camZ: 5.0, particles: 0.0, exposure: 1.2 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      revealLines(el)
      fadeUp('.stack-panel', el, 0.09, 26)
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="field-vermilion relative py-[clamp(4.5rem,10vw,8rem)]">
      <div className="shell">
        <div className="max-w-[46ch]">
          <h2 className="display text-d2 text-paper">
            <span className="reveal-line">
              <span>{stack.headline}</span>
            </span>
          </h2>
          <p className="mt-6 text-[1.05rem] leading-[1.75] text-ink">{stack.body}</p>
        </div>

        <div className="mt-[clamp(2.5rem,5vw,4rem)] grid grid-cols-12 gap-4">
          {stack.clusters.map((c, i) => (
            <div key={c.id} className={`stack-panel col-span-12 bg-paper p-7 opacity-0 sm:p-8 ${SPAN[i]}`}>
              <h3 className="display text-[clamp(1.25rem,1.9vw,1.6rem)] leading-none tracking-tight">{c.title}</h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {c.items.map((s) => (
                  <li
                    key={s}
                    className="mono border border-ink/18 px-3 py-1.5 text-[0.78rem] tracking-[0.04em] text-ink-60"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
