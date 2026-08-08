import { useEffect, useMemo, useRef } from 'react'
import { writing } from '../content/site'
import { posts, postCategories, postYears, postCount, yearMax, postHref } from '../content/writing'
import { Eyebrow, Mark } from '../components/ui'
import { countUp, fadeUp } from '../lib/motion'

/**
 * layouts.md #2 Sticky 侧栏 + 内容滚动。
 *
 * 上一版整个 #writing 只有 1 个 <a>（指向博客首页），右侧十个「分类」是纯文本，
 * 而且那份分类其实是博客的标签不是分类。现在右侧是 55 篇真实文章，
 * 每一条都是可点的 <a>，按年份分组；分类与年份分布取自博客数据库。
 */
export function Writing() {
  const root = useRef<HTMLElement>(null)

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

  useEffect(() => {
    if (!root.current) return
    fadeUp('.writing-fade', root.current, 0.08, 24)
    fadeUp('.year-block', root.current, 0.06, 20)
    root.current.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      countUp(el, el.dataset.count || '')
    })
  }, [])

  return (
    <section id="writing" ref={root} className="section-y">
      <div className="shell grid gap-x-[clamp(32px,4vw,72px)] gap-y-[clamp(40px,5vw,64px)] lg:grid-cols-12">
        {/* 左：sticky 侧栏 */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[112px]">
            <div className="writing-fade js-fade">
              <Eyebrow>Writing</Eyebrow>
              <h2 className="serif mt-4 text-d2">
                写下来的<Mark>部分</Mark>
              </h2>
              <p className="mt-5 max-w-[38ch] text-lead text-ink-light">{writing.body}</p>
            </div>

            <div className="writing-fade js-fade mt-9 flex gap-10">
              <p>
                <span
                  className="nums block text-[clamp(2.2rem,3.6vw,3rem)] leading-none"
                  data-count={String(postCount)}
                >
                  {postCount}
                </span>
                <span className="mt-2 block text-sm font-medium text-ink-light">篇文章</span>
              </p>
              <p>
                <span
                  className="nums block text-[clamp(2.2rem,3.6vw,3rem)] leading-none"
                  data-count={writing.days}
                >
                  {writing.days}
                </span>
                <span className="mt-2 block text-sm font-medium text-ink-light">天持续更新</span>
              </p>
            </div>

            {/* 年份分布条形 */}
            <ul className="writing-fade js-fade mt-9 space-y-2.5 border-t border-line pt-6">
              {postYears.map((y) => (
                <li key={y.year} className="flex items-center gap-3">
                  <span className="nums w-[3.2rem] shrink-0 text-sm font-semibold text-ink-light">
                    {y.year}
                  </span>
                  <span aria-hidden className="h-2.5 grow rounded-full bg-cream-dark">
                    <span
                      className="block h-full rounded-full bg-brand-tint"
                      style={{ width: `${Math.round((y.count / yearMax) * 100)}%` }}
                    />
                  </span>
                  <span className="nums w-[2.4rem] shrink-0 text-right text-sm text-ink-light">
                    {y.count}
                  </span>
                </li>
              ))}
            </ul>

            {/* 真实分类（博客自己的 categoryOptions） */}
            <ul className="writing-fade js-fade mt-7 flex flex-wrap gap-2 border-t border-line pt-6">
              {postCategories.map((c) => (
                <li key={c.name} className="pill pill--static">
                  {c.name}
                  <span className="nums text-[0.8125rem]">{c.count}</span>
                </li>
              ))}
            </ul>

            <a
              href={writing.href}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn--outline btn--sm writing-fade js-fade mt-8"
            >
              <span>{writing.hrefLabel}</span>
              <span aria-hidden className="btn__arrow">
                &rarr;
              </span>
            </a>
          </div>
        </div>

        {/* 右：按年份分组的全量文章索引，每条都可点 */}
        <div className="lg:col-span-8">
          {byYear.map(([year, list]) => (
            <section key={year} className="year-block js-fade mb-[clamp(28px,3vw,40px)]">
              <div className="flex items-baseline gap-4 border-b border-line pb-3">
                <h3 className="nums text-[1.5rem] leading-none">{year}</h3>
                <span className="text-sm font-medium text-ink-faint">{list.length} 篇</span>
              </div>
              <ul className="mt-2 xl:columns-2 xl:gap-x-8">
                {list.map((p) => (
                  <li key={p.slug} className="xl:break-inside-avoid">
                    <a
                      href={postHref(p.slug)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="post-row"
                    >
                      <span aria-hidden className="text-[1.05rem] leading-none">
                        {p.icon}
                      </span>
                      <span>
                        <span className="post-row__title block text-[0.9375rem] leading-snug">
                          {p.title}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="nums text-xs font-semibold text-ink-faint">{p.date}</span>
                          {p.cat ? (
                            <span className="pill pill--static px-2.5 py-0.5 text-[0.75rem]">
                              {p.cat}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
