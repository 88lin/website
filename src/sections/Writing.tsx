import { useEffect, useMemo, useRef } from 'react'
import { writing } from '../content/site'
import { posts, postCategories, postYears, postCount, postHref } from '../content/writing'
import { Section } from '../components/Section'
import { Mark } from '../components/ui'
import { revealChars, revealRows } from '../lib/motion'

/**
 * 按年分栏的账簿。
 *
 * 这一段的组织逻辑是「时间轴」，和全站其它八段都不一样：
 * - 刊头一行，标题与统计压在同一条基线上（别处都是标题在上、内容在下）；
 * - 年份是巨型竖排刻度，sticky 跟着该年的列表走；
 * - 每年的分隔线越过基准线向左出血，横线切竖线，像一本被划过格的账簿。
 *
 * 55 篇全是真实文章、每条可点，年份与分类计数来自博客数据库。
 * 行入场用 revealRows（x -12 → 0），一年一个 trigger，不让 55 行排成一条长队。
 */
export function Writing() {
  const root = useRef<HTMLElement>(null)
  const head = useRef<HTMLHeadingElement>(null)

  const byYear = useMemo(() => {
    const m = new Map<string, typeof posts>()
    posts.forEach((p) => {
      const y = p.date.slice(0, 4)
      const arr = m.get(y)
      if (arr) arr.push(p)
      else m.set(y, [p])
    })
    return [...m.entries()]
  }, [])

  const span = useMemo(() => {
    const ys = postYears.map((y) => y.year).sort()
    return ys.length ? `${ys[0]}–${ys[ys.length - 1]}` : ''
  }, [])

  useEffect(() => {
    const el = root.current
    if (!el) return
    if (head.current) revealChars(head.current, 0.03)
    el.querySelectorAll<HTMLElement>('.year-row').forEach((row) => {
      revealRows(row.querySelectorAll('.entry'), row)
    })
  }, [])

  return (
    <Section id="writing" tone="cream" label="写作 WRITING" ref={root}>
      {/* 刊头：标题与统计同基线 */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2">
        <h2 className="serif text-d2 writing-head" ref={head}>
          写下来的<Mark>部分</Mark>
        </h2>
        <p className="nums text-sm font-semibold tracking-[0.06em] text-ink-light">
          {postCount} 篇 · {span} · {writing.days} 天
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <p className="max-w-[46ch] text-lead text-ink-light">{writing.body}</p>
        <a
          href={writing.href}
          target="_blank"
          rel="noreferrer noopener"
          className="btn btn--outline btn--sm"
        >
          <span>{writing.hrefLabel}</span>
          <span aria-hidden className="btn__arrow">
            &rarr;
          </span>
        </a>
      </div>

      <ul className="cat-line mt-8 border-t border-line pt-5">
        {postCategories.map((c) => (
          <li key={c.name}>
            {c.name}
            <span className="cat-line__n">{c.count}</span>
          </li>
        ))}
      </ul>

      <div className="mt-[clamp(30px,3.6vw,52px)]">
        {byYear.map(([year, list]) => (
          <div key={year} className="year-row">
            <p className="year-mark">
              <span className="year-mark__num">{year}</span>
              <span className="year-mark__n">{list.length} 篇</span>
            </p>
            <ul className="xl:columns-2 xl:gap-x-7">
              {list.map((p) => (
                <li key={p.slug} className="entry js-fade xl:break-inside-avoid">
                  <a
                    href={postHref(p.slug)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="post-row"
                  >
                    <span aria-hidden className="post-row__icon text-[1.05rem] leading-none">
                      {p.icon}
                    </span>
                    <span>
                      <span className="post-row__title block text-[0.9375rem] leading-snug">
                        {p.title}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="nums text-xs font-semibold text-ink-faint">{p.date}</span>
                        {p.cat ? <span className="text-xs text-ink-faint">{p.cat}</span> : null}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
