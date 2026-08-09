/**
 * 02 主线。
 *
 * 两条带子一升一降形成对角流，交点被一枚手绘圈圈住——这是整页唯一一处
 * 「两件事其实是一件事」的图解，也是整站唯一使用旋转变换的版式。
 *
 * 底下的装备不做徽章墙。徽章墙的问题是：三十六个格子一样大，等于没有信息。
 * 这里是一段密排的等宽文字流，**真正出现在下面六个仓库技术栈里的那些划底线**，
 * 其余的就是背景。命中与否由数据算，不手写。
 */

import { Fragment } from 'react'
import { Hand } from '../components/Hand'
import { cssv } from '../lib/css'
import { projects, stack, trackA, trackB, tracksIntro } from '../content/site'

/** 六个仓库真实用到的技术栈，摊平成一张表。 */
const USED = projects.flatMap((p) => p.stack).map((s) => s.toLowerCase())

/**
 * 命中判定：装备名与技术栈条目互为子串即算数（'Next.js' ⊂ 'Next.js 16'、
 * 'Agent Skills' ⊃ 'Agent Skill'）。两字以下不做子串匹配，'Go' 会到处误伤。
 */
const isUsed = (item: string) => {
  const a = item.toLowerCase()
  if (a.length < 3) return USED.includes(a)
  return USED.some((b) => b.includes(a) || a.includes(b))
}

const Band = ({ band, title, items }: { band: 'A' | 'B'; title: string; items: typeof trackA.items }) => (
  <div className="tracks__band" data-band={band}>
    <h3>{title}</h3>
    {items.map((t) => (
      <div className="track" key={t.id}>
        <span className="track__t">{t.title}</span>
        <p className="track__b">{t.body}</p>
      </div>
    ))}
  </div>
)

export function Tracks() {
  return (
    <section
      id="tracks"
      className="ch ch-tracks"
      data-tone="pine"
      data-edge="fade"
      style={cssv({ '--bleed': 'var(--highlight)' })}
    >
      <div className="wrap">
        <div className="tracks__head">
          <h2 className="hd">{tracksIntro.headline}</h2>
          <p className="lede">{tracksIntro.body}</p>
        </div>

        <div className="tracks__grid">
          <Band band="A" title={trackA.title} items={trackA.items} />
          <div className="tracks__cross">
            <Hand shape="circle" tone="pine" seed="cross">
              <span>把不确定的能力，接进确定的工程约束</span>
            </Hand>
          </div>
          <Band band="B" title={trackB.title} items={trackB.items} />
        </div>

        <div className="kit">
          <div className="kit__head">
            <h3>{stack.headline}</h3>
            <p>{stack.body}</p>
          </div>
          {stack.clusters.map((c) => (
            <p className="kit__flow" key={c.id}>
              <span className="tag">{c.title}</span>
              <span className="kit__sep">/</span>
              {c.items.map((it, i) => (
                <Fragment key={it}>
                  {i > 0 ? <span className="kit__sep">·</span> : null}
                  {isUsed(it) ? <b>{it}</b> : <span>{it}</span>}
                </Fragment>
              ))}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
