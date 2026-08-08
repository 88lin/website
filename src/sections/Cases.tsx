import { useEffect, useRef } from 'react'
import { cases, type CaseStudy } from '../content/site'
import { Eyebrow, Mark } from '../components/ui'
import { fadeUp } from '../lib/motion'

/**
 * layouts.md #16：Sticky 编号侧栏 + 杂志式正文。
 *
 * 刻意不做「卡片里再放卡片」——三段正文靠 hairline 与排印分隔，
 * 编号用 .numeral 大字钉在左栏，随内容滚动一直贴在视野里。
 */
const TONE: Record<CaseStudy['tone'], { eyebrow: 'brand' | 'pop' | 'ink'; rule: string }> = {
  brand: { eyebrow: 'brand', rule: 'bg-brand-surface' },
  pop: { eyebrow: 'pop', rule: 'bg-pop-surface' },
  ink: { eyebrow: 'ink', rule: 'bg-ink' },
}

function Case({ c }: { c: CaseStudy }) {
  const tone = TONE[c.tone]
  return (
    <article className="case-item grid gap-[clamp(28px,4vw,64px)] border-t border-line pt-[clamp(40px,5vw,72px)] lg:grid-cols-12">
      {/* 左：sticky 编号侧栏 */}
      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-[120px]">
          <p className="numeral text-[clamp(3.4rem,7vw,6rem)]">{c.index}</p>
          <span aria-hidden className={`mt-6 block h-[6px] w-10 rounded-full ${tone.rule}`} />
          <h3 className="serif mt-5 text-d3">{c.name}</h3>
          <p className="mt-2 text-[1.0625rem] text-ink-light">{c.cn}</p>
          <a
            href={c.link}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn--outline btn--sm mt-6"
          >
            <span>{c.linkLabel}</span>
            <span aria-hidden className="btn__arrow">
              &rarr;
            </span>
          </a>
        </div>
      </div>

      {/* 右：杂志正文 —— 标签左置，正文右置，行与行之间只有一条细线 */}
      <div className="lg:col-span-8">
        <div className="grid gap-y-[clamp(22px,2.4vw,34px)]">
          {c.sections.map((s) => (
            <div key={s.label} className="grid gap-x-8 gap-y-2 sm:grid-cols-[6.5rem_1fr]">
              <Eyebrow tone={tone.eyebrow} className="sm:pt-[0.42rem]">
                {s.label}
              </Eyebrow>
              <p className="max-w-[62ch] text-[1.0625rem] leading-[1.85] text-ink-light">{s.body}</p>
            </div>
          ))}
        </div>

        <ul className="mt-[clamp(30px,3.4vw,46px)] grid grid-cols-2 gap-x-6 gap-y-7 border-t border-line pt-7 sm:grid-cols-4">
          {c.result.map((r) => (
            <li key={r.label}>
              <span className="nums block text-[clamp(1.6rem,2.6vw,2.25rem)] leading-none">
                {r.value}
              </span>
              <span className="mt-2.5 block text-sm font-medium text-ink-light">{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export function Cases() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.case-item', root.current, 0.1, 26)
  }, [])

  return (
    <section id="cases" ref={root} className="section-y">
      <div className="shell">
        <div className="max-w-[46ch]">
          <Eyebrow>Case studies</Eyebrow>
          <h2 className="serif mt-4 text-d2">
            三个<Mark>拆开讲</Mark>
          </h2>
          <p className="mt-5 text-lead text-ink-light">
            背景、难点、方案，以及最后落到的数。不写「赋能」，只写做了什么。
          </p>
        </div>

        <div className="mt-[clamp(44px,5.5vw,80px)] grid gap-[clamp(48px,6vw,86px)]">
          {cases.map((c) => (
            <Case key={c.slug} c={c} />
          ))}
        </div>
      </div>
    </section>
  )
}
