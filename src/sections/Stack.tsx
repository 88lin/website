import { useEffect, useRef } from 'react'
import { stack } from '../content/site'
import { gsap, revealLines, fadeUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

const SPAN = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

export function Stack() {
  const ref = useRef<HTMLElement>(null)

  // 朱红实色场同样盖住画布：这里把晶簇推到正中放大，作为进入写作区之前的蓄力
  useScene(
    ref,
    { clusterX: 0, clusterY: -0.3, clusterScale: 2.1, spread: 1.6, spin: 0.09, tilt: 0.3, dispersion: 7.5, glow: 1.3, tint: 0.95, camZ: 5.0, exposure: 1.2 },
    { clusterX: 0, clusterY: -0.2, clusterScale: 1.1, spread: 1.0 }
  )

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
          <p className="mt-6 text-[1.125rem] leading-[1.75] text-ink">{stack.body}</p>
        </div>

        <div className="mt-[clamp(2.5rem,5vw,4rem)] grid grid-cols-12 gap-4">
          {stack.clusters.map((c, i) => (
            <div key={c.id} className={`stack-panel col-span-12 rounded-xl bg-paper p-7 opacity-0 sm:p-8 ${SPAN[i]}`}>
              <h3 className="display text-[clamp(1.25rem,1.9vw,1.6rem)] leading-none tracking-tight">{c.title}</h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {c.items.map((s) => (
                  <li
                    key={s}
                    className="mono rounded-full border border-ink/20 px-3.5 py-1.5 text-[0.875rem] tracking-[0.04em] text-ink-70"
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
