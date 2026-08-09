/**
 * 06 写作。
 *
 * 全站唯一的多栏文字流：真 columns 排版，报纸感，粗横线开栏。前面五章都是
 * 「一块一块」的，这一章必须是「一片」——否则八章看下来是同一个骨架换八种颜色。
 *
 * 标签条形图直接嵌在栏子中间。这是全站最后一处数字，也是唯一一处
 * 用长度而不是字号表示大小的地方。
 */

import { writing } from '../content/site'
import { cssv } from '../lib/css'
import { ArrowOut } from '../components/Icons'

const MAX_TAG = Math.max(...writing.tags.map((t) => t.count))

export function Writing() {
  return (
    <section
      id="writing"
      className="ch ch-writing"
      data-tone="paper"
      data-edge="fade"
      style={cssv({ '--bleed': 'var(--highlight)' })}
    >
      <div className="wrap">
        <div className="writing__head">
          <h2 className="hd">{writing.headline}</h2>
          <p className="lede">{writing.body}</p>
        </div>

        <div className="writing__cols">
          <div className="writing__blk">
            <h3>最近六篇</h3>
            {writing.latest.map((p) => (
              <a
                className="post"
                key={p.title}
                href={writing.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                <b>{p.title}</b>
                <span>{p.date}</span>
              </a>
            ))}
          </div>

          <div className="writing__blk">
            <h3>标签分布</h3>
            <div className="bars">
              {writing.tags.map((t) => (
                <div className="bar" key={t.name}>
                  <span>{t.name}</span>
                  <i style={cssv({ '--f': t.count / MAX_TAG })} />
                  <u>{t.count}</u>
                </div>
              ))}
            </div>
          </div>

          <div className="writing__blk">
            <h3>更新频率</h3>
            <p>
              {writing.days} 天里 {writing.posts} 篇，平均一个月多一篇。不定期，写完才发。追热点的那种
              更新频率我做不到，也不打算做——写下来的东西得在半年后还能用。
            </p>
          </div>

          <div className="writing__blk">
            <h3>去哪读</h3>
            <p>
              全文都在博客，没有付费墙，没有关注可见。{writing.tagTotal} 个标签里最厚的是工具与教程，
              基本上是「我自己踩过的坑，写下来省得下次再踩」。
            </p>
            <a className="btn" href={writing.href} target="_blank" rel="noreferrer noopener">
              {writing.hrefLabel}
              <ArrowOut />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
