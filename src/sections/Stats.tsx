import { useEffect, useRef } from 'react'
import { metrics, META_AS_OF } from '../content/site'
import { Section } from '../components/Section'
import { countScrub, fadeUp } from '../lib/motion'

/**
 * 数字带。
 *
 * V3 是五个等宽色卡——那是把「五个数」当成「五个格子」。这里换成一条基线对齐的
 * 数字带：字号直接映射量级，4,667 就该比 21 大一个数量级看得见的量。标签竖排挂在
 * 各自数字右侧，和基准线上的微标签是同一套竖排语言。
 *
 * 数字跟着滚动进度走（countScrub），滚到一半就停在一半——这是「滚动确实在驱动
 * 页面」最直接的一处反馈。宽度用一个隐藏的终值撑住，计数过程不会推动版面，CLS 为 0。
 */

/** 按量级排名给字号。名次由数值本身决定，不是手写死的。 */
const TIER = [
  'clamp(4rem, 9vw, 10rem)',
  'clamp(3rem, 6.4vw, 7rem)',
  'clamp(2.4rem, 4.6vw, 5rem)',
  'clamp(2rem, 3.6vw, 3.9rem)',
  'clamp(1.8rem, 3vw, 3.2rem)',
]

const numeric = (v: string) => Number(v.replace(/[^\d]/g, ''))

const ranked = [...metrics]
  .map((m, i) => ({ m, i, n: numeric(m.value) }))
  .sort((a, b) => b.n - a.n)
  .reduce<Record<number, string>>((acc, cur, rank) => {
    acc[cur.i] = TIER[Math.min(rank, TIER.length - 1)]
    return acc
  }, {})

export function Stats() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    fadeUp('.metric', el, 0.07, 18)
    el.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
      countScrub(n, n.dataset.count || '')
    })
  }, [])

  return (
    <Section
      id="numbers"
      tone="creamDark"
      label="数字 NUMBERS"
      padTop="clamp(56px,7vh,92px)"
      padBottom="clamp(56px,7vh,92px)"
      ref={root}
    >
      <p className="mb-[clamp(26px,3vw,44px)] border-b border-line pb-3.5 text-right eyebrow text-ink-faint">
        截至 {META_AS_OF}
      </p>

      <ul className="metric-band">
        {metrics.map((m, i) => (
          <li key={m.label} className="metric js-fade">
            <span className="metric__num nums" style={{ fontSize: ranked[i] }}>
              <span aria-hidden className="metric__ghost">
                {m.value}
              </span>
              <span className="metric__live" data-count={m.value}>
                {m.value}
              </span>
            </span>
            <span className="metric__side">
              <span className="metric__label">{m.label}</span>
              <span className="metric__sub">{m.sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
