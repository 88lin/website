/**
 * 05 在写 · 花园与博客。
 *
 * v7 这一章靠六张缩略图撑场面，图一删就塌。v8 换成一堵 41 块的彩色底卡墙：
 * 每块是一个真实在线的小站，跨度按 4/3/3/2 轮换，同一行不出现两块等宽——
 * 既避开「一行三张等宽卡」的模板感，也让这堵墙自己就是数量的证据。
 *
 * 底卡颜色按七组 AA 达标的面色/字色组合轮换，不是随机上色：
 * 每一格的字色是跟着面色定死的，不存在浅字压浅底。
 */

import { ArrowOut } from '../components/Icons'
import { garden, gardenIntro, writing, type GardenGroup } from '../content/site'
import { useStagger } from '../lib/motion'

/** 12 栏里的跨度。四种行型轮换：每行都收口成 12，但宽块的位置逐行挪，
 *  一行内最多两块等宽——避免整堵墙退化成「第一列宽、其余等分」的表格。 */
const ROWS = [
  [4, 3, 3, 2],
  [3, 4, 2, 3],
  [2, 3, 4, 3],
  [3, 2, 3, 4],
]
const spanOf = (i: number) => ROWS[Math.floor(i / 4) % ROWS.length][i % 4]

/** 组名的等宽字缩写：JetBrains Mono 没有汉字，角标只能走拉丁。 */
const TAG: Record<GardenGroup, string> = {
  特效: 'FX',
  工具: 'TOOL',
  内容: 'MEDIA',
  组件: 'WIDGET',
}

export function Notes() {
  const wall = useStagger<HTMLDivElement>(28)

  return (
    <section id="notes" className="ch ch--notes" data-tone="paper" aria-labelledby="notes-h">
      <div className="wrap">
        <div className="notes__head">
          <p className="eyebrow">GARDEN &amp; BLOG</p>
          <h2 className="ch-title" id="notes-h">
            {gardenIntro.headline}
          </h2>
          <p className="ch-lede">{gardenIntro.body}</p>
          <a className="notes__hub" href={gardenIntro.hub} target="_blank" rel="noreferrer noopener">
            {gardenIntro.hubLabel} {gardenIntro.hub.replace('https://', '')}
            <ArrowOut />
          </a>
        </div>

        <div className="garden" ref={wall}>
          {garden.map((it, i) => (
            <a
              className="slab gcell rise"
              data-stagger=""
              data-c={i % 7}
              key={it.name}
              href={it.href}
              target="_blank"
              rel="noreferrer noopener"
              style={{ '--sp': spanOf(i) } as React.CSSProperties}
            >
              <b>{it.name}</b>
              <s>
                {String(i + 1).padStart(2, '0')} {TAG[it.group]}
              </s>
            </a>
          ))}
        </div>

        <div className="notes__blog">
          <div className="slab notes__panel">
            <h3>{writing.headline}</h3>
            <p className="notes__meta">
              {writing.posts} POSTS / {writing.days.toLocaleString('en-US')} DAYS /{' '}
              {writing.tagTotal} TAGS
            </p>
            <p>{writing.body}</p>
            <ul className="notes__tags">
              {writing.tags.map((t) => (
                <li className="chip" key={t.name}>
                  {t.name}
                  <b>{t.count}</b>
                </li>
              ))}
            </ul>
            <a
              className="btn btn--ink btn--sm"
              href={writing.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {writing.hrefLabel} <ArrowOut />
            </a>
          </div>

          <ul className="notes__list">
            {writing.latest.map((p) => (
              <li key={p.title}>
                <b>{p.title}</b>
                <s>{p.date}</s>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
