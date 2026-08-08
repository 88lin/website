import { useEffect, useRef } from 'react'
import { writing } from '../content/site'
import { gsap, fadeUp, countUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

export function Writing() {
  const ref = useRef<HTMLElement>(null)

  useScene(
    ref,
    { clusterX: -2.1, clusterY: -1.8, clusterScale: 0.66, spread: 1.0, spin: 0.17, tilt: -0.18, dispersion: 5.0, glow: 0.9, tint: 0.22, camZ: 6.8, exposure: 1.0 },
    // 窄屏分类清单占满整幅，晶簇沉到底边只露一角
    { clusterX: 0.55, clusterY: -2.35, clusterScale: 0.52, spread: 0.8 }
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      fadeUp('.writing-l > *', el, 0.08, 24)
      fadeUp('.writing-row', el, 0.045, 16)
      el.querySelectorAll<HTMLElement>('.w-count').forEach((n) => countUp(n, n.dataset.raw ?? ''))
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} id="writing" className="relative py-[clamp(4.5rem,10vw,8rem)]">
      <div className="shell grid grid-cols-12 gap-x-6 gap-y-12">
        <div className="writing-l col-span-12 lg:col-span-5">
          <h2 className="display text-d2 opacity-0">{writing.headline}</h2>
          <p className="mt-6 max-w-[38ch] text-lead text-ink-70 opacity-0">{writing.body}</p>

          <div className="mt-10 flex gap-12 opacity-0">
            <div>
              <p className="w-count mono text-[clamp(2.6rem,5vw,4rem)] font-medium leading-none tabular-nums" data-raw={writing.posts}>
                {writing.posts}
              </p>
              <p className="mt-2 text-[0.9375rem] text-ink-70">篇文章</p>
            </div>
            <div>
              <p className="w-count mono text-[clamp(2.6rem,5vw,4rem)] font-medium leading-none tabular-nums" data-raw={writing.days}>
                {writing.days}
              </p>
              <p className="mt-2 text-[0.9375rem] text-ink-70">天持续更新</p>
            </div>
          </div>

          <a
            href={writing.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link mt-9 inline-block text-[1rem] opacity-0"
          >
            {writing.hrefLabel}
          </a>
        </div>

        <div className="col-span-12 lg:col-span-6 lg:col-start-7">
          <ul>
            {writing.categories.map((c) => (
              <li
                key={c.name}
                className="writing-row flex items-baseline justify-between gap-4 border-t border-ink/12 py-4 opacity-0 last:border-b"
              >
                <span className="text-[1.0625rem]">{c.name}</span>
                <span className="h-px grow bg-ink/12" aria-hidden />
                <span className="mono shrink-0 text-[0.9375rem] tabular-nums text-ink-70">{c.count} 篇</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
