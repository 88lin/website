/**
 * EXP.04 案例 · 粘性堆叠。
 *
 * 三张卡依次钉在同一个位置，后一张推上来时前一张缩小并沉回底色里。
 * 顺序叙事：你不能同时读三个案例，版面也不让你同时看见三个。
 * 「背景 / 卡在哪 / 怎么解」三段是最值钱的内容，编号步骤器保留。
 * 侧栏三块图形面板画的是项目里真实存在的结构，刻意不共用模子。
 */

import { useCallback, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { cases, casesIntro, vipInterfaces, type CaseStudy } from '../content/cases'
import { chapters } from '../content/site'
import { WIDE_MQ } from '../lib/bp'
import { caseStack, useLazyScene, useMediaQuery, type SceneApi } from '../lib/motion'
import { Link } from '../router'

type Line = { k: string; t: string; c: string }

/** 02 的面板画的是它那两条硬规则与路由结构，文字全部出自案例正文。 */
const REPAIR: Line[] = [
  { k: 'rule 1', t: '证据优先', c: '# 先读状态、日志与硬件事实' },
  { k: 'rule 2', t: '只读优先', c: '# 写操作先给回滚与验证' },
  { k: 'route', t: '62 个 Playbook 按需加载', c: '# 无关内容不进上下文' },
  { k: 'ci', t: '路由表结构校验', c: '# 62 个文件永远对得上' },
]

function Panel({ c }: { c: CaseStudy }) {
  if (c.slug === 'lofi') {
    return (
      <div className="case__panel">
        <p className="case__ptop">
          <span>STATIONS</span>
          <b>21 / 0 SIGN-UP</b>
        </p>
        <p className="case__line">
          21 路精选电台 <em># 一路不通就静默换下一路</em>
        </p>
        <div className="case__tiles" aria-hidden="true">
          {Array.from({ length: 21 }, (_, i) => (
            <span className="case__tile" key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (c.slug === 'repair') {
    return (
      <div className="case__panel">
        <p className="case__ptop">
          <span>PLAYBOOK ROUTER</span>
          <b>3 OS / 62 FILES</b>
        </p>
        {REPAIR.map((l) => (
          <p className="case__line" key={l.k}>
            <b>{l.k}</b> {l.t} <em>{l.c}</em>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="case__panel">
      <p className="case__ptop">
        <span>FALLBACK LIST</span>
        <b>18 / 22 HOSTS</b>
      </p>
      <p className="case__line">
        <b>strategy</b> ordered fallback <em># 判断权交给此刻能播的那一路</em>
      </p>
      <div className="case__ifs">
        {vipInterfaces.map((n) => (
          <span className="case__if" key={n}>
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

function Case({ c }: { c: CaseStudy }) {
  return (
    <article className="case" data-card="" data-tint={c.tint}>
      <div className="case__hd">
        <span className="case__no" aria-hidden="true">
          {c.no}
        </span>
        <h3 className="case__name">{c.name}</h3>
        <p className="case__cn">{c.cn}</p>
        <p className="case__claim">{c.claim}</p>
      </div>

      <div className="case__grid">
        {/* 三步一条链。最后一步是「怎么解」，用虚线框与珊瑚红圆徽单独拎出来。 */}
        <div className="logic-flow">
          {c.sections.map((s, i) => (
            <section
              className={i === 2 ? 'logic-step logic-step--fix' : 'logic-step'}
              key={s.label}
            >
              <span className="logic-step__dot" aria-hidden="true">
                {`0${i + 1}`}
              </span>
              <h4>{s.label}</h4>
              <p>{s.body}</p>
            </section>
          ))}
        </div>

        <div className="case__side">
          <Panel c={c} />
          <dl className="case__res">
            {c.results.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
          <div className="case__go">
            <Link className="cta-btn cta-btn--sm" to={`/case/${c.slug}/`}>
              读完整案例
            </Link>
            {c.link ? (
              <a
                className="cta-btn cta-btn--ghost cta-btn--sm"
                href={c.link}
                target="_blank"
                rel="noreferrer noopener"
              >
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
  const wide = useMediaQuery(WIDE_MQ)
  const ch = chapters.find((c) => c.id === 'cases')!

  const build = useCallback(({ ScrollTrigger, root: el }: SceneApi) => {
    caseStack(ScrollTrigger, el, Array.from(el.querySelectorAll<HTMLElement>('.case')))
  }, [])

  useLazyScene(root, build, wide)

  return (
    <section id="cases" className="ch ch--cases" data-tone="paper" aria-labelledby="cases-h">
      <div className="wrap ch-head">
        <s className="ch-no" aria-hidden="true">
          EXP.{ch.no}
        </s>
        <div className="ch-head__txt">
          <h2 className="ch-title" id="cases-h">
            {casesIntro.headline}
          </h2>
          <p className="ch-lede">{casesIntro.body}</p>
        </div>
      </div>

      <div className="wrap cases-stack" ref={root}>
        {cases.map((c) => (
          <Case c={c} key={c.slug} />
        ))}
      </div>
    </section>
  )
}
