import { useEffect, useRef, useState } from 'react'
import { projects, type Project } from '../content/site'
import { Cover } from '../components/Cover'
import { Eyebrow, Mark } from '../components/ui'
import { fadeUp } from '../lib/motion'

/**
 * 精选作品：一条持续自动滚动的横向轨道。
 *
 * 轨道内容复制一份，位移正好一整份的宽度即可无缝接上（间距做在每张卡的
 * margin-right 上，不用 flex gap —— 否则 -50% 会差半个间距，接缝会跳）。
 * 悬停、聚焦、显式按钮三种方式都能暂停；prefers-reduced-motion 下直接退回
 * 原生横滑 + scroll-snap，克隆卡片隐藏。
 */
function WorkCard({ p, clone = false }: { p: Project; clone?: boolean }) {
  const primary = p.live ?? p.repo
  return (
    <article
      className="work-card hscroll__item card flex flex-col overflow-hidden"
      data-clone={clone ? 'true' : undefined}
      {...(clone ? { 'aria-hidden': true } : null)}
    >
      <Cover project={p} />

      <div className="flex flex-1 flex-col p-[clamp(20px,2.2vw,26px)]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="eyebrow text-brand-text">{p.kind}</span>
          <span className="eyebrow text-ink-faint">{p.year}</span>
        </div>

        <h3 className="serif mt-3 text-[1.3rem] leading-snug">
          <a href={primary} target="_blank" rel="noreferrer noopener" tabIndex={clone ? -1 : 0}>
            <span className="work-card__title">{p.name}</span>
          </a>
        </h3>
        <p className="mt-1 text-sm font-medium text-ink-light">{p.cn}</p>
        <p className="mt-3.5 line-clamp-3 text-[0.9375rem] text-ink-light">{p.blurb}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {p.stack.slice(0, 3).map((s) => (
            <li key={s} className="pill pill--static text-xs">
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-[18px]">
          <span className="nums text-sm text-ink-light">
            <span aria-hidden>★</span> {p.stars.toLocaleString('en-US')}
            <span className="mx-2 text-ink-faint">/</span>
            <span aria-hidden>⑂</span> {p.forks}
          </span>
          <span className="flex items-center gap-3 text-sm font-semibold">
            {p.live ? (
              <a
                href={p.live}
                target="_blank"
                rel="noreferrer noopener"
                tabIndex={clone ? -1 : 0}
                className="link"
              >
                在线
              </a>
            ) : null}
            <a
              href={p.repo}
              target="_blank"
              rel="noreferrer noopener"
              tabIndex={clone ? -1 : 0}
              className="link"
            >
              仓库
            </a>
          </span>
        </div>
      </div>
    </article>
  )
}

export function Work() {
  const root = useRef<HTMLElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.work-head', root.current, 0.06, 22)
  }, [])

  return (
    <section id="work" ref={root} className="section-y bg-cream-dark">
      <div className="shell">
        <div className="work-head js-fade flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[42ch]">
            <Eyebrow>Selected work</Eyebrow>
            <h2 className="serif mt-4 text-d2">
              精选<Mark>作品</Mark>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-ink-light sm:block">轨道会自己走，指上去就停</p>
            <button
              type="button"
              className="pill"
              aria-pressed={paused}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? '继续滚动' : '暂停滚动'}
            </button>
          </div>
        </div>
      </div>

      <div
        className="hscroll mt-[clamp(32px,4vw,52px)] shell-l"
        data-paused={paused ? 'true' : 'false'}
      >
        <div className="hscroll__track py-2">
          {projects.map((p) => (
            <WorkCard key={p.slug} p={p} />
          ))}
          {projects.map((p) => (
            <WorkCard key={`clone-${p.slug}`} p={p} clone />
          ))}
        </div>
      </div>
    </section>
  )
}
