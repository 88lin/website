import { useEffect, useRef } from 'react'
import { tracksIntro, trackA, trackB } from '../content/site'
import { Eyebrow, Mark } from '../components/ui'
import { fadeUp } from '../lib/motion'

/** layouts.md #13 分栏对称：两条主线左右分列，中缝一条竖线，交点落在正中。 */
function Column({
  kicker,
  items,
  align,
}: {
  kicker: string
  items: { id: string; title: string; body: string }[]
  align: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'lg:pl-[clamp(32px,4vw,64px)]' : 'lg:pr-[clamp(32px,4vw,64px)]'}>
      <p className="pill pill--static">{kicker}</p>
      <ul className="mt-8 space-y-8">
        {items.map((t, i) => (
          <li key={t.id} className="track-item js-fade">
            <div className="flex items-baseline gap-3">
              <span className="hand text-[1.1rem] text-brand-text">0{i + 1}</span>
              <h3 className="serif text-d3">{t.title}</h3>
            </div>
            <p className="mt-2.5 text-ink-light">{t.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Tracks() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.track-item', root.current, 0.08, 24)
  }, [])

  return (
    <section id="tracks" ref={root} className="section-y">
      <div className="shell">
        <div className="max-w-[52ch]">
          <Eyebrow>Two tracks</Eyebrow>
          <h2 className="serif mt-4 text-d2">
            两条主线，<Mark>一个交点</Mark>
          </h2>
          <p className="mt-5 text-lead text-ink-light">{tracksIntro.body}</p>
        </div>

        <div className="relative mt-[clamp(48px,6vw,84px)] grid gap-[clamp(40px,5vw,0px)] lg:grid-cols-2">
          {/* 中缝：一条细线 + 正中的交点标记 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-line-strong lg:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 rotate-45 border border-line-strong bg-cream lg:block"
            style={{ width: 14, height: 14 }}
          />
          <Column kicker={trackA.kicker} items={trackA.items} align="left" />
          <Column kicker={trackB.kicker} items={trackB.items} align="right" />
        </div>
      </div>
    </section>
  )
}
