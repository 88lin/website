/**
 * CH.07 写作。
 *
 * 左边是标签计数的横条图，右边是最近六篇。标签合计比文章数大——一篇文章
 * 挂多个标签，所以这里写「标签」不写「分类」，也把这句话直接印在页面上。
 * 作品集里最容易注水的就是这种统计，注了水就不该在这个站出现。
 */

import { Bay } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { IconOut } from '../components/Icons'
import { channels, writing } from '../content/site'

const ch = channels[7]
const max = Math.max(...writing.tags.map((t) => t.count))

export function Writing() {
  return (
    <Bay ch={ch}>
      <div className="bay__head">
        <h2 id="ch-07-t" className="bay-title">
          {writing.headline}
        </h2>
        <span className="silk-label num">
          {writing.posts} POSTS · {writing.days} DAYS
        </span>
      </div>
      <p className="bay__lede">{writing.body}</p>

      <div className="writing__grid">
        <Reveal v="sweep" className="bars">
          {writing.tags.map((t) => (
            <div className="bar" key={t.name}>
              <span className="bar__n">{t.name}</span>
              <span className="bar__t">
                <span className="bar__f" style={{ ['--pct' as string]: (t.count / max) * 100 }} />
              </span>
              <span className="bar__v num">{t.count}</span>
            </div>
          ))}
          <p className="readout__s" style={{ marginTop: '0.6rem' }}>
            共 {writing.tagTotal} 个标签，这里只列前 {writing.tags.length} 个。
          </p>
        </Reveal>

        <div>
          <div className="posts">
            {writing.latest.map((p) => (
              <a href={writing.href} target="_blank" rel="noreferrer noopener" key={p.title}>
                <span className="posts__t">{p.title}</span>
                <span className="posts__d">{p.date}</span>
              </a>
            ))}
          </div>
          <p style={{ marginTop: 'calc(var(--unit) * 3)' }}>
            <a className="btn btn--ghost" href={writing.href} target="_blank" rel="noreferrer noopener">
              {writing.hrefLabel}
              <IconOut />
            </a>
          </p>
        </div>
      </div>
    </Bay>
  )
}
