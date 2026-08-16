/**
 * EXP.02 主线 · 能做什么。
 *
 * 章内三段，构图各异：交汇图（把论点画出来——两条实体色带收进一枚墨色节点）、
 * 两条主线的清单（对角排布，不是均分卡片）、可承接的三件事（缺口标签卡）。
 * 交汇图桌面用 SVG，窄屏换两张叠放的色带卡（结构性替代，不是缩小）。
 * 器材清单压在章尾：等宽四行，回答「手上有什么」，不做徽章墙。
 * 这一章不出现 star / fork：那是作品章的事。
 */

import { chapters, services, servicesIntro, stack, trackA, trackB, tracksIntro } from '../content/site'
import { useReveal, useStagger } from '../lib/motion'
import { Annot } from '../components/Ink'

function Junction() {
  return (
    <figure className="junc" aria-label="两条主线向一枚节点收敛：把不确定的能力，接进确定的工程约束里">
      <svg className="junc__svg" viewBox="0 0 1000 400" role="img" aria-hidden="true">
        {/* 左带：AI Agent 工程 */}
        <path
          className="junc__band junc__band--a"
          d="M 0 46 C 260 46 320 120 452 158 L 452 242 C 320 280 260 354 0 354 Z"
        />
        {/* 右带：创意前端 */}
        <path
          className="junc__band junc__band--b"
          d="M 1000 46 C 740 46 680 120 548 158 L 548 242 C 680 280 740 354 1000 354 Z"
        />
        <line className="junc__dash" x1="452" y1="200" x2="548" y2="200" />

        <text className="junc__track" x="18" y="30">
          TRACK A — AI AGENT 工程
        </text>
        <text className="junc__track" x="982" y="30" textAnchor="end">
          TRACK B — 创意前端
        </text>

        {trackA.items.map((it, i) => (
          <text key={it.id} className="junc__cap junc__cap--a" x={40 + i * 14} y={130 + i * 74}>
            {it.title}
          </text>
        ))}
        {trackB.items.map((it, i) => (
          <text
            key={it.id}
            className="junc__cap junc__cap--b"
            x={960 - i * 14}
            y={130 + i * 74}
            textAnchor="end"
          >
            {it.title}
          </text>
        ))}
      </svg>

      {/* 节点单独用 HTML：它要投影、要 hover 微抬 */}
      <div className="junc__node">
        <b>可交付的产品</b>
        <s>THE JOIN</s>
      </div>

      <Annot seed="junc-note" className="junc__note">
        交点只有一件事：把不确定的能力，接进确定的工程约束
      </Annot>

      <figcaption className="junc__cap-row">
        <span>图 02 · 两条主线与交点</span>
        <span>左带管「真的能改到线上」，右带管「愿意看、看得懂」</span>
      </figcaption>

      {/* 窄屏的 structural 替代：SVG 藏掉，这里接住 */}
      <div className="junc__m" aria-hidden="true">
        <div className="junc__m-band junc__m-band--a">
          <s>TRACK A — AI AGENT 工程</s>
          {trackA.items.map((it) => (
            <b key={it.id}>{it.title}</b>
          ))}
        </div>
        <div className="junc__m-band junc__m-band--b">
          <s>TRACK B — 创意前端</s>
          {trackB.items.map((it) => (
            <b key={it.id}>{it.title}</b>
          ))}
        </div>
      </div>
    </figure>
  )
}

export function Craft() {
  const head = useReveal<HTMLDivElement>()
  const svcGrid = useStagger<HTMLDivElement>(90)
  const ch = chapters.find((c) => c.id === 'craft')!

  return (
    <section id="craft" className="ch ch--craft" data-tone="paper" aria-labelledby="craft-h">
      <div className="craft-grid wrap-craft">
        <aside className="ch-side" aria-hidden="true">
          <s className="ch-side__no">EXP.{ch.no}</s>
          <s className="ch-side__lab">{ch.label}</s>
        </aside>

        <div className="craft-main">
          <header className="ch-head ch-head--side" ref={head}>
            <div className="ch-head__txt">
              <h2 id="craft-h">{tracksIntro.headline}</h2>
              <p>{tracksIntro.body}</p>
            </div>
          </header>

          <Junction />

          <div className="tracks">
            {[trackA, trackB].map((t) => (
              <div className={`track track--${t.id.toLowerCase()}`} key={t.id}>
                <h3>
                  <i>{t.id}</i>
                  {t.title}
                </h3>
                {t.items.map((it) => (
                  <div className="track__item" key={it.id}>
                    <b>{it.title}</b>
                    <p>{it.body}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="svc-wrap">
            <header className="sub-head">
              <h3>{servicesIntro.headline}</h3>
              <p>{servicesIntro.body}</p>
            </header>
            <div className="svc-grid" ref={svcGrid}>
              {services.map((s) => (
                <article className="svc" data-tint={s.tint} key={s.id} data-stagger="">
                  <span className="notch" aria-hidden="true">
                    SVC.{s.no}
                  </span>
                  <h4>{s.title}</h4>
                  <p>{s.body}</p>
                  <ul className="svc__del">
                    {s.deliverables.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                  <p className="svc__fit">
                    <i aria-hidden="true" />
                    {s.fit}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="stack">
            <h3>{stack.headline}</h3>
            <p className="stack__body">{stack.body}</p>
            <dl className="stack__grid">
              {stack.clusters.map((c) => (
                <div className="stack__c" key={c.id}>
                  <dt>{c.title}</dt>
                  <dd>{c.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
