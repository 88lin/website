/**
 * 03 怎么做的 · 粘性堆叠。
 *
 * 三张卡依次钉在同一个位置，后一张推上来时前一张缩小并沉回底色里。
 * 这是顺序叙事：你不能同时读三个案例，所以版面也不让你同时看见三个。
 *
 * 写法沿用「背景 / 卡在哪 / 怎么解」三段，这是这套内容里最值钱的部分。
 * 「怎么解」单独套一个手绘虚线框——一整章只圈这一处，圈多了就成花边。
 *
 * v6 在这一章翻的两个车都在这里改掉：
 *  - 卡片 border-radius 是 0，而同章的小方块有圆角，一页两套形状语言。
 *    现在所有 [data-card] 统一 14px，audit G15 逐个量。
 *  - 手绘框里的文字冲出框线。现在框是 .frame 的 padding 画出来的，
 *    内容永远在框内至少 18px。
 */

import { useCallback, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { Frame } from '../components/Ink'
import { Shot } from '../components/Shot'
import { cases, casesIntro, type CaseStudy } from '../content/cases'
import { caseStack, useLazyScene, useMediaQuery, type SceneApi } from '../lib/motion'
import { Link } from '../router'

/** 案例 slug 与截图同名，三张都是真实站点抓的。 */
const COVER: Record<string, string> = {
  lofi: 'lofi',
  repair: 'repair',
  'video-vip': 'video-vip',
}

function Case({ c }: { c: CaseStudy }) {
  const [bg, stuck, fix] = c.sections
  return (
    <article className="case" data-card="" data-tint={c.tint}>
      <div className="case__hd">
        <span className="case__no" aria-hidden="true">
          {c.no}
        </span>
        <div className="case__id">
          <h3 className="case__name">{c.name}</h3>
          <p className="case__cn">{c.cn}</p>
        </div>
        <p className="case__claim">{c.claim}</p>
      </div>

      <div className="case__grid">
        <div className="case__text">
          <section className="case__blk">
            <h4>{bg.label}</h4>
            <p>{bg.body}</p>
          </section>
          <section className="case__blk">
            <h4>{stuck.label}</h4>
            <p>{stuck.body}</p>
          </section>
          <Frame seed={`case-${c.slug}`} className="case__fix">
            <h4>{fix.label}</h4>
            <p>{fix.body}</p>
          </Frame>
        </div>

        <div className="case__side">
          <Shot
            cover={COVER[c.slug]}
            alt={`${c.name} 界面截图`}
            ratio="16 / 10"
            sizes="(max-width: 1000px) 88vw, 34vw"
          />
          <dl className="case__res">
            {c.results.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
          <div className="case__go">
            <Link className="btn btn--solid" to={`/case/${c.slug}/`}>
              读完整案例
            </Link>
            {c.link ? (
              <a className="btn btn--ghost" href={c.link} target="_blank" rel="noreferrer noopener">
                {c.linkLabel || '在线'} <ArrowOut />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export function Cases() {
  const root = useRef<HTMLDivElement | null>(null)
  const wide = useMediaQuery('(min-width: 900px)')

  const build = useCallback(({ ScrollTrigger, root: el }: SceneApi) => {
    caseStack(ScrollTrigger, el, Array.from(el.querySelectorAll<HTMLElement>('.case')))
  }, [])

  useLazyScene(root, build, wide)

  return (
    <section id="cases" className="ch ch--cases" data-tone="sand" aria-labelledby="cases-h">
      <div className="wrap cases__head">
        <p className="eyebrow">THREE CASE STUDIES</p>
        <h2 className="ch-title" id="cases-h">
          {casesIntro.headline}
        </h2>
        <p className="ch-lede">{casesIntro.body}</p>
      </div>
      <div className="wrap cases__stack" ref={root}>
        {cases.map((c) => (
          <Case c={c} key={c.slug} />
        ))}
      </div>
    </section>
  )
}
