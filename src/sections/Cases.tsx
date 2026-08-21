/**
 * 01 案例。四个深度案例，每个一整行，左右交替。
 *
 * 首页只放论点 + 摘要 + 实测面板；背景 / 卡在哪 / 怎么解 / 取舍留在案例子页。
 * v12 就是这个分工，理由没变：首页要能被扫读，四段全文铺在首页没人看得完。
 *
 * 右侧那张「实测」面板是全站唯一的数据形状（见 components/Section.tsx），
 * 里面每个数字都跟着出处 —— 这一章要证的不是「我做过」，是「数字你能自己核」。
 */

import { Panel, Row, Section } from '../components/Section'
import { cases, casesIntro } from '../content/cases'
import { Link } from '../router'
import { useStagger } from '../lib/motion'

export function Cases() {
  const ref = useStagger<HTMLDivElement>(60)

  return (
    <Section id="cases" title={casesIntro.headline} intro={casesIntro.body}>
      <div className="cases" ref={ref}>
        {cases.map((c, i) => (
          <article className="case" data-t={c.tint} data-flip={i % 2 === 1 ? '1' : undefined} key={c.slug}>
            <div className="case__say">
              <p className="case__meta">
                <b className="case__no">{c.no}</b>
                <span className="case__name">{c.name}</span>
                <span className="case__cn">{c.cn}</span>
              </p>

              <h3 className="case__claim">{c.claim}</h3>

              <p className="case__sum">{c.summary}</p>

              <p className="case__stack">{c.stackLine}</p>

              <div className="case__acts">
                <Link className="btn btn--blue" to={`/case/${c.slug}/`}>
                  看完整案例
                  <i aria-hidden="true">→</i>
                </Link>
                {c.link && (
                  <a className="btn btn--ghost" href={c.link} target="_blank" rel="noreferrer">
                    {c.linkLabel ?? '在线体验'} ↗
                  </a>
                )}
                <a className="btn btn--ghost" href={c.repo} target="_blank" rel="noreferrer">
                  源码 ↗
                </a>
              </div>
            </div>

            <div className="case__panel" data-stagger>
              <Panel title={`${c.name} · 实测`} tint={c.tint === 'yellow' ? 'yellow' : c.tint === 'coral' ? 'coral' : 'blue'}>
                <div className="pnums">
                  {c.results.map((r) => (
                    <span className="pnum" key={r.label}>
                      <b>{r.value}</b>
                      <s>{r.label}</s>
                    </span>
                  ))}
                </div>
                <div className="panel__rule" />
                {c.provenance.map((p) => (
                  <Row k={p.value} key={p.value}>
                    {p.from}
                  </Row>
                ))}
              </Panel>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}
