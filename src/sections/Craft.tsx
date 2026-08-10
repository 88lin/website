/**
 * 02 能做什么 · 交汇图 + 服务。
 *
 * v8 这一章塞了六个子模块：收敛图、两栏 dl、跑马灯、两张证据卡、六行数字口径表。
 * 谁都不突出，整章读起来像一个杂物抽屉。v9 砍到三段，并且换了它在全站的位置 ——
 * 从第四章提到第二章，因为它是唯一一段能回答「你能替我做什么」的内容。
 *
 *  ① 交汇图：两条主线做成两块实体色块，各自带三枚能力胶囊，朝中间的菱形交点收。
 *     收敛这件事本身就是论点，所以它必须是画出来的，不是写出来的。
 *  ② 我能接什么活：三张服务卡，每张写清交付物和适合谁。这是「不拿仓库说事」的正面替代。
 *  ③ 手上有什么：36 项跑马灯，压成单行。
 *
 * 砍掉的两块各有理由：六行数字口径表和 notes 章的统计条重复；导航站证据卡和
 * notes 章的小站精选重复。同一件事在一页里说两遍，两遍都会变弱。
 *
 * 零位图：设计系统那处实物用现画的色板矢量代替截图，八格取自 palettes.css 的当前组。
 */

import { ArrowOut } from '../components/Icons'
import { Annot } from '../components/Ink'
import { craftEvidence, services, servicesIntro, stack, trackA, trackB, tracksIntro } from '../content/site'
import { useStagger } from '../lib/motion'

const ALL = stack.clusters.flatMap((c) => c.items)
/** 跑马灯靠 translate3d(-50%) 循环，所以内容必须是严格的两份。 */
const BELT = [...ALL, ...ALL]

/** 当前色板的八个主色，取自 palettes.css，组件不另配色值。 */
const SWATCH = [
  '--brand',
  '--brand-deep',
  '--highlight',
  '--warning',
  '--pop',
  '--pop-deep',
  '--ink',
  '--cream-dark',
]

const DS = craftEvidence.find((e) => e.id === 'ds')!

function Swatches() {
  return (
    <svg className="craft__sw" viewBox="0 0 320 44" role="img" aria-label="设计系统当前色板的八个主色">
      {SWATCH.map((v, i) => (
        <rect
          key={v}
          x={2 + i * 40}
          y={4}
          width={36}
          height={36}
          rx={10}
          fill={`var(${v})`}
          stroke="currentColor"
          strokeOpacity="0.16"
        />
      ))}
    </svg>
  )
}

/**
 * 交汇图。两条轨是实体色块（不是描边线），朝中间的菱形节点收。
 * 轨上的六个能力点由 trackA / trackB 派生，不在这里另写一份。
 */
function Junction() {
  return (
    <div className="jx">
      <svg className="jx__svg" viewBox="0 0 1200 200" aria-hidden="true" preserveAspectRatio="none">
        <path className="jx__band jx__band--a" d="M 0 24 C 300 24 380 88 596 96 L 596 128 C 360 120 280 56 0 56 Z" />
        <path className="jx__band jx__band--b" d="M 1200 24 C 900 24 820 88 604 96 L 604 128 C 840 120 920 56 1200 56 Z" />
      </svg>

      <div className="jx__grid">
        {[trackA, trackB].map((t, side) => (
          <div className="slab jx__trk" key={t.id} data-side={side === 0 ? 'a' : 'b'}>
            <p className="jx__no">{side === 0 ? 'TRACK A' : 'TRACK B'}</p>
            <h3 className="jx__title">{t.title}</h3>
            <ul className="jx__caps">
              {t.items.map((it, i) => (
                <li key={it.id}>
                  <span className="pill pill--cap" data-k={i}>
                    {it.title}
                  </span>
                  <span className="jx__body">{it.body}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="slab jx__node">
        <b>可交付的产品</b>
        <s>THE JOIN</s>
      </div>
    </div>
  )
}

export function Craft() {
  const rows = useStagger<HTMLDivElement>(70)

  return (
    <section id="craft" className="ch ch--craft" data-tone="yellow" aria-labelledby="craft-h">
      <div className="wrap">
        <div className="craft__head">
          <p className="eyebrow">TWO TRACKS · ONE JOIN</p>
          <h2 className="ch-title" id="craft-h">
            {tracksIntro.headline}
          </h2>
          <p className="ch-lede">{tracksIntro.body}</p>
        </div>

        <Junction />

        <Annot seed="craft-join">交点只有一条：能力可以不确定，接口和退路必须确定</Annot>

        <div className="craft__svc">
          <div className="craft__svchead">
            <h3 className="craft__h3">{servicesIntro.headline}</h3>
            <p className="craft__lede2">{servicesIntro.body}</p>
          </div>
          <div className="svc" ref={rows}>
            {services.map((s) => (
              <article className="slab svc__card rise" data-card="" data-stagger="" data-tint={s.tint} key={s.id}>
                <p className="svc__no">{s.no}</p>
                <h4 className="svc__title">{s.title}</h4>
                <p className="svc__body">{s.body}</p>
                <ul className="svc__del">
                  {s.deliverables.map((d, i) => (
                    <li className="pill pill--tag" data-k={i} key={d}>
                      {d}
                    </li>
                  ))}
                </ul>
                <p className="svc__fit">{s.fit}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="craft__kit">
          <ul className="craft__belt">
            {BELT.map((s, i) => (
              <li className="chip" key={`${s}-${i}`} aria-hidden={i >= ALL.length || undefined}>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="craft__ds">
          <Swatches />
          <p className="craft__dstxt">
            <b>{DS.title}</b>
            {DS.caption}
          </p>
          <a className="pill pill--src" href={DS.href} target="_blank" rel="noreferrer noopener">
            {DS.linkLabel} <ArrowOut />
          </a>
        </div>
      </div>
    </section>
  )
}
