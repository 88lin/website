/**
 * CH.04 案例。
 *
 * 三张卡粘在视口上依次叠上来，后一张推上来时前一张缩一点、暗一点，
 * 像把三块板依次插进同一个槽位。左侧 88px 是一条脊线，卡片就挂在上面。
 * 每张卡只给论点与四个可核验的数，展开写在子页里——首页不负责讲完。
 */

import { useEffect, useRef } from 'react'
import { Bay } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { IconSignal } from '../components/Icons'
import { Link } from '../router'
import { cases, casesIntro } from '../content/cases'
import { channels } from '../content/site'
import { bootCaseStack } from '../lib/motion'

const ch = channels[4]

export function Cases() {
  const stack = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = stack.current
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.case-card'))
    let off: (() => void) | undefined
    bootCaseStack(cards).then((fn) => {
      off = fn
    })
    return () => off?.()
  }, [])

  return (
    <Bay ch={ch}>
      <div className="bay__head">
        <h2 id="ch-04-t" className="bay-title">
          {casesIntro.headline}
        </h2>
        <span className="silk-label num">CASE ×3</span>
      </div>
      <p className="bay__lede">{casesIntro.body}</p>

      <div className="cases__grid">
        <div className="cases__spine" aria-hidden />
        <div className="cases__stack" ref={stack}>
          {cases.map((c) => (
            <Reveal v="seat" as="article" className="case-card plate" data-ground={c.tone} key={c.slug}>
              <div>
                <div className="case-card__no num">{c.no}</div>
                <h3 className="case-card__claim">{c.claim}</h3>
                <p className="case-card__sum">{c.summary}</p>
                <Link className="case-card__go" to={`/case/${c.slug}/`}>
                  <IconSignal />
                  看完整案例：{c.name}
                </Link>
              </div>
              <div className="case-card__res">
                {c.results.map((r) => (
                  <div className="res well" key={r.label}>
                    <div className="res__v">{r.value}</div>
                    <div className="res__l" style={{ color: 'inherit', opacity: 0.72 }}>
                      {r.label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Bay>
  )
}
