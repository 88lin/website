import { useEffect, useRef } from 'react'
import { writing } from '../content/site'
import { gsap, fadeUp, countUp } from '../lib/motion'
import { useScene } from '../webgl/StageContext'

export function Writing() {
  const ref = useRef<HTMLElement>(null)

  useScene(ref, { formX: -2.1, formY: -1.62, formScale: 1.25, amp: 0.26, freq: 1.05, twist: 0.5, spin: 0.2, camZ: 6.8, particles: 0.5, exposure: 1.0 })

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
          <p className="mt-6 max-w-[38ch] text-lead text-ink-60 opacity-0">{writing.body}</p>

          <div className="mt-10 flex gap-12 opacity-0">
            <div>
              <p className="w-count mono text-[clamp(2.6rem,5vw,4rem)] font-medium leading-none tabular-nums" data-raw={writing.posts}>
                {writing.posts}
              </p>
              <p className="mt-2 text-[0.85rem] text-ink-60">篇文章</p>
            </div>
            <div>
              <p className="w-count mono text-[clamp(2.6rem,5vw,4rem)] font-medium leading-none tabular-nums" data-raw={writing.days}>
                {writing.days}
              </p>
              <p className="mt-2 text-[0.85rem] text-ink-60">天持续更新</p>
            </div>
          </div>

          <a
            href={writing.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link mt-9 inline-block text-[0.98rem] opacity-0"
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
                <span className="text-[1.02rem]">{c.name}</span>
                <span className="h-px grow bg-ink/12" aria-hidden />
                <span className="mono shrink-0 text-[0.88rem] tabular-nums text-ink-60">{c.count} 篇</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
