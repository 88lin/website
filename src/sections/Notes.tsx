/**
 * 05 写作。博客那一摊。
 *
 * 版式：左边标签计数做成横条量表（名字 + 数量 + 按比例的条），
 * 右边最近六篇带永久链接。左边那组条是这一章独有的形状。
 *
 * 文案里必须写「标签」不是「分类」—— 首页那 27 个词是标签，
 * 一篇文章可以挂多个，所以合计比文章数大，这一点在正文里说清楚。
 * v9 的教训：每篇必须带链接，只有标题和日期就是六行点不开的死字。
 *
 * 三个数字排到 3.25rem 并从 0 滚起（components/Count.tsx）：这一章原来通篇是
 * 小字与细条，没有一处图形重量，扫过去等于没看见。
 */

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
                <Count value={writing.days.toLocaleString('en-US')} />
              </b>
              <s>天没断过</s>
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
          {/* 「最近六篇」与博客入口同一行左右分列。上一版入口是列表下面一枚孤零零的胶囊，
              四周全是空白，读起来像掉在那儿的。 */}
          <p className="notes__hd">
            <span className="notes__label">最近六篇</span>
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
