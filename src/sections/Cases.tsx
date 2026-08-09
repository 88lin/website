import { useEffect, useRef } from 'react'
import { cases, type CaseStudy } from '../content/site'
import { Mark } from '../components/ui'
import { Section } from '../components/Section'
import { revealMask } from '../lib/motion'

/**
 * 阶梯错落。
 *
 * 三段案例沿对角线依次右移 0 / 8% / 16%，序号做成 --highlight-soft 的巨型背景
 * 数字压在正文后面。刻意取消卡片外框：分组信息全部由缩进量和间距承担，读的时候
 * 眼睛是斜着往下走的，而不是一格一格往下跳。这也是全站唯一一处「标题比正文小」
 * 的区块——版面的重量交给了 01/02/03。
 */
const TONE: Record<CaseStudy['tone'], string> = {
  brand: 'bg-brand-surface',
  pop: 'bg-pop-surface',
  ink: 'bg-ink',
}

function Case({ c, step }: { c: CaseStudy; step: number }) {
  return (
    <article className="case-step" data-step={step} data-no={c.index}>

      <div className="case-step__body pt-[clamp(34px,5vw,72px)]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          <h3 className="serif text-d3">{c.name}</h3>
          <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${TONE[c.tone]}`} />
          <p className="text-[1.0625rem] text-ink-light">{c.cn}</p>
        </div>

        {/* 三段正文：标签左置、正文右置，中间只有排印距离，没有线也没有框 */}
        <div className="mt-[clamp(22px,2.6vw,36px)] grid gap-y-[clamp(18px,2vw,28px)]">
          {c.sections.map((s) => (
            <div key={s.label} className="grid gap-x-8 gap-y-1.5 sm:grid-cols-[5.5rem_1fr]">
              <p className="eyebrow text-ink-faint sm:pt-[0.42rem]">{s.label}</p>
              <p className="max-w-[60ch] text-[1.0625rem] leading-[1.85] text-ink-light">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-[clamp(24px,3vw,40px)] flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <ul className="flex flex-wrap gap-x-[clamp(24px,3vw,48px)] gap-y-5">
            {c.result.map((r) => (
              <li key={r.label}>
                <span className="nums block text-[clamp(1.5rem,2.4vw,2.1rem)] leading-none">
                  {r.value}
                </span>
                <span className="mt-2 block text-sm font-medium text-ink-light">{r.label}</span>
              </li>
            ))}
          </ul>
          <a
            href={c.link}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn--outline btn--sm"
          >
            <span>{c.linkLabel}</span>
            <span aria-hidden className="btn__arrow">
              &rarr;
            </span>
          </a>
        </div>
      </div>
    </article>
  )
}

export function Cases() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    // 一段一段从左边揭开，与阶梯的行进方向一致
    el.querySelectorAll<HTMLElement>('.case-step').forEach((step) => {
      revealMask(step, step, 'l', 0)
    })
  }, [])

  return (
    <Section id="cases" tone="cream" label="拆解 CASE STUDIES" ref={root}>
      <div className="flex flex-wrap items-baseline gap-x-[clamp(24px,4vw,64px)] gap-y-3">
        <h2 className="serif text-[clamp(1.6rem,2.8vw,2.4rem)] leading-tight">
          怎么<Mark>做的</Mark>
        </h2>
        <p className="max-w-[46ch] text-[1.0625rem] text-ink-light">
          三个项目，各写清楚一件事：背景、卡在哪、最后怎么解。数字都是仓库里能查到的。
        </p>
      </div>

      <div className="mt-[clamp(10px,1.6vw,24px)] grid gap-[clamp(34px,4.5vw,70px)]">
        {cases.map((c, i) => (
          <Case key={c.slug} c={c} step={i} />
        ))}
      </div>
    </Section>
  )
}
