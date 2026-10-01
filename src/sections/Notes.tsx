/** 05 写作：左边标签量表，右边最近更新（每篇带永久链接）。 */

import { Section } from '../components/Section'
import { Count } from '../components/Count'
import { writing } from '../content/site'
import { useStagger } from '../lib/motion'

const TINTS = ['blue', 'yellow', 'coral', 'teal'] as const

export function Notes() {
  const ref = useStagger<HTMLDivElement>(40)
  const max = Math.max(...writing.tags.map((t) => t.count))

  return (
    <Section id="notes" title={writing.headline} intro={writing.body}>
      <div className="notes" ref={ref}>
        <div className="notes__left">
          <div className="notes__nums">
            <span>
              <b>
                <Count value={String(writing.posts)} />
              </b>
              <s>篇文章</s>
            </span>
            <span>
              <b>
                <Count value={String(writing.years)} />
              </b>
              <s>年一直在写</s>
            </span>
            <span>
              <b>
                <Count value={String(writing.tagTotal)} />
              </b>
              <s>个标签</s>
            </span>
          </div>

          <ul className="bars">
            {writing.tags.map((t, i) => (
              <li key={t.name} data-stagger>
                <span className="bars__name">{t.name}</span>
                <span className="bars__track">
                  <i
                    data-t={TINTS[i % TINTS.length]}
                    style={{ width: `${Math.round((t.count / max) * 100)}%` }}
                  />
                </span>
                <span className="bars__n">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="notes__right">
          {/* 「最近更新」与博客入口同一行左右分列。上一版入口是列表下面一枚孤零零的胶囊，
              四周全是空白，读起来像掉在那儿的。 */}
          <p className="notes__hd">
            <span className="notes__label">最近更新</span>
            <a href={writing.href} target="_blank" rel="noreferrer">
              {writing.hrefLabel} ↗
            </a>
          </p>
          <ul className="posts">
            {writing.latest.map((p) => (
              <li key={p.href} data-stagger>
                <a href={p.href} target="_blank" rel="noreferrer">
                  <span className="posts__date">{p.date}</span>
                  <span className="posts__t">{p.title}</span>
                  <i aria-hidden="true">↗</i>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
