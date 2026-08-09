/**
 * 案例子页。
 *
 * 版式跟首页刻意不同：首页是机架，子页是一份工程记录——顶部一块彩色抬头，
 * 正文落在米白面板上，右侧粘一列可核验的数与它们的出处。三段（背景 /
 * 卡在哪 / 怎么解）之外只加两块「关键取舍」，写清楚放弃了什么。
 * 一个案例如果只有得到没有放弃，那它多半没做过取舍。
 */

import { useEffect } from 'react'
import { Foot } from '../components/Foot'
import { IconBack, IconOut, IconSignal } from '../components/Icons'
import { Link } from '../router'
import { caseBySlug, cases } from '../content/cases'
import { CONTACT_HREF, CTA_LABEL } from '../content/site'
import { useAsset } from '../lib/asset'

export function CasePage({ slug }: { slug: string }) {
  const asset = useAsset()
  const c = caseBySlug(slug)
  const next = c ? cases[(cases.findIndex((x) => x.slug === c.slug) + 1) % cases.length] : cases[0]

  useEffect(() => {
    if (!c) return
    document.title = `${c.name} · ${c.cn} ｜ 茉灵智库`
  }, [c])

  if (!c) {
    return (
      <>
        <main className="cs" id="main">
          <header className="cs__hero" data-ground="chassis">
            <Link className="cs__back" to="/">
              <IconBack />
              回机架
            </Link>
            <h1 className="cs__title">没有这一路信号</h1>
            <p className="bay__lede">地址对不上任何一个案例通道，回首页从 04 通道进。</p>
          </header>
        </main>
        <Foot />
      </>
    )
  }

  return (
    <>
      <main className="cs" id="main">
        <header className="cs__hero" data-ground={c.tone}>
          <Link className="cs__back" to="/">
            <IconBack />
            回机架 · CH.04
          </Link>
          <p className="silk-label num" style={{ marginBottom: '0.9rem', opacity: 0.8 }}>
            CASE {c.no} · {c.name}
          </p>
          <h1 className="cs__title">{c.claim}</h1>
          <dl className="cs__meta">
            <div>
              <dt>项目</dt>
              <dd>{c.cn}</dd>
            </div>
            <div>
              <dt>年份</dt>
              <dd className="num">{c.year}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>{c.role}</dd>
            </div>
            <div>
              <dt>技术</dt>
              <dd>{c.stackLine}</dd>
            </div>
          </dl>
        </header>

        <div className="cs__body">
          <div className="cs__wrap">
            <aside className="cs__aside">
              <img className="cs__cover" src={asset(c.cover)} alt={`${c.name} 封面图`} loading="lazy" decoding="async" />
              <div className="cs__res">
                {c.results.map((r) => (
                  <div className="res well" key={r.label}>
                    <div className="res__v">{r.value}</div>
                    <div className="res__l" style={{ color: 'inherit', opacity: 0.72 }}>
                      {r.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="cs__prov silk">
                <h4>数字出处</h4>
                <ul>
                  {c.provenance.map((p) => (
                    <li key={p.value}>
                      <b>{p.value}</b>
                      <span>{p.from}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {c.link ? (
                  <a className="btn btn--ghost" href={c.link} target="_blank" rel="noreferrer noopener">
                    {c.linkLabel}
                    <IconOut />
                  </a>
                ) : null}
                <a className="btn btn--ghost" href={c.repo} target="_blank" rel="noreferrer noopener">
                  源码
                  <IconOut />
                </a>
              </div>
            </aside>

            <div>
              {c.sections.map((s) => (
                <section className="cs__sec" key={s.label}>
                  <h3>{s.label}</h3>
                  <p>{s.body}</p>
                </section>
              ))}

              <div className="cs__trade">
                {c.tradeoffs.map((t) => (
                  <div key={t.title}>
                    <h4>{t.title}</h4>
                    <p>{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="cs__next" data-ground={next.tone}>
          <p className="silk-label num" style={{ marginBottom: '0.8rem', opacity: 0.8 }}>
            NEXT · CASE {next.no}
          </p>
          <Link className="cs__title" to={`/case/${next.slug}/`} style={{ display: 'block' }}>
            {next.claim}
          </Link>
          <p style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
            <a className="btn" href={CONTACT_HREF}>
              <IconSignal />
              {CTA_LABEL}
            </a>
            <Link className="btn btn--ghost" to="/">
              <IconBack />
              回机架
            </Link>
          </p>
        </section>
      </main>
      <Foot />
    </>
  )
}
