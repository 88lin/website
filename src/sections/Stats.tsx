import { useEffect, useRef } from 'react'
import { metrics, META_AS_OF } from '../content/site'
import { countUp, fadeUp } from '../lib/motion'

/** 五个柔光统计块横排。数字用衬线大字，底色是三种 soft token 轮换。 */
const TINT = [
  'bg-info-soft',
  'bg-highlight-soft',
  'bg-pop-soft',
  'bg-info-soft',
  'bg-highlight-soft',
]

export function Stats() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.metric', root.current, 0.07, 22)
    root.current.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      countUp(el, el.dataset.count || '')
    })
  }, [])

  return (
    <section id="numbers" className="bg-cream-dark py-[clamp(46px,6vh,76px)]">
      <div className="shell" ref={root}>
        <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-line pb-4">
          <p className="eyebrow text-ink-light">公开可查的一些数字</p>
          <p className="eyebrow text-ink-faint">截至 {META_AS_OF}</p>
        </div>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m, i) => (
            <li
              key={m.label}
              className={`metric js-fade rounded-md px-5 py-6 ${TINT[i % TINT.length]}`}
            >
              <span
                  className="nums block text-[clamp(2rem,3.4vw,2.9rem)] leading-none"
                  data-count={m.value}
                >
                  {m.value}
                </span>
              <span className="mt-3 block text-[0.9375rem] font-semibold">{m.label}</span>
              <span className="mt-1 block text-xs font-medium text-ink-light">{m.sub}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
