/**
 * 05 在写 + 在跑。
 *
 * v8 这一章铺了 40 块彩色底卡。数量本身当过论据，但四十块挤在一屏谁也看不清，
 * 而且用户本来就有一个导航站在做同一件事，等于把导航站抄了一遍还抄丑了。
 * v9 每类挑一个，附一句「为什么是它」，剩下的交给导航站。
 *
 * 另一处是实打实的缺陷：v8 的博客六篇只有标题和日期，点不开。数据源里当时
 * 根本没存链接。v9 每篇都带永久链接，整块条目是 <a>，不是标题旁边挂个小箭头。
 */

import { ArrowOut } from '../components/Icons'
import { gardenFeatured, gardenIntro, writing, type GardenGroup } from '../content/site'
import { useStagger } from '../lib/motion'

/** 组名的等宽字缩写：JetBrains Mono 没有汉字，角标只能走拉丁。 */
const TAG: Record<GardenGroup, string> = {
  特效: 'FX',
  工具: 'TOOL',
  内容: 'MEDIA',
  组件: 'WIDGET',
}

export function Notes() {
  const wall = useStagger<HTMLDivElement>(60)
  const list = useStagger<HTMLUListElement>(50)

  return (
    <section id="notes" className="ch ch--notes" data-tone="paper" aria-labelledby="notes-h">
      <div className="wrap">
        <div className="notes__head">
          <p className="eyebrow">GARDEN &amp; BLOG</p>
          <h2 className="ch-title" id="notes-h">
            {gardenIntro.headline}
          </h2>
          <p className="ch-lede">{gardenIntro.body}</p>
        </div>

        <div className="garden" ref={wall}>
          {gardenFeatured.map((it, i) => (
            <a
              className="slab gcell rise"
              data-stagger=""
              data-c={i % 6}
              key={it.name}
              href={it.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <s className="gcell__tag">{TAG[it.group]}</s>
              <b className="gcell__name">{it.name}</b>
              <span className="gcell__why">{it.why}</span>
              <span className="gcell__go" aria-hidden="true">
                <ArrowOut />
              </span>
            </a>
          ))}

          <a
            className="slab gcell gcell--hub"
            href={gardenIntro.hub}
            target="_blank"
            rel="noreferrer noopener"
          >
            <s className="gcell__tag">ALL {gardenIntro.total}</s>
            <b className="gcell__name">其余 {gardenIntro.rest} 个在导航站</b>
            <span className="gcell__why">
              {gardenIntro.hubLabel} {gardenIntro.hub.replace('https://', '')}
            </span>
            <span className="gcell__go" aria-hidden="true">
              <ArrowOut />
            </span>
          </a>
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
                <li className="pill pill--tag" data-k={t.count % 3} key={t.name}>
                  {t.name}
                  <b>{t.count}</b>
                </li>
              ))}
            </ul>
            <a className="pill pill--go" href={writing.href} target="_blank" rel="noreferrer noopener">
              {writing.hrefLabel} <ArrowOut />
            </a>
          </div>

          {/* 整条是链接。v8 这里是六个 <li><b>标题</b><s>日期</s></li>，点不开。 */}
          <ul className="notes__list" ref={list}>
            {writing.latest.map((p) => (
              <li className="rise" data-stagger="" key={p.title}>
                <a href={p.href} target="_blank" rel="noreferrer noopener">
                  <s>{p.date}</s>
                  <b>{p.title}</b>
                  <span className="notes__go" aria-hidden="true">
                    <ArrowOut />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
