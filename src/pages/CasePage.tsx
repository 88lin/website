/** 案例子页 `/case/:slug/`：三段全文 + 关键取舍 + 数字出处。 */

import { caseBySlug, cases } from '../content/cases'
import { CONTACT_HREF, CTA_LABEL, AS_OF, footer, profile, profileLabel } from '../content/site'
import { Panel, Row } from '../components/Section'
import { Link } from '../router'
import { useStagger } from '../lib/motion'

/** 子页顶栏：站名回首页 + 下单入口。锚点导航在子页上没意义。 */
function CaseNav() {
  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="nav-mark" to="/">
          <b>{profile.name}</b>
          <s>@88LIN</s>
        </Link>
        <nav className="nav-links" aria-label="导航">
          <a className="nav-cta" href={CONTACT_HREF}>
            {CTA_LABEL}
          </a>
        </nav>
      </div>
    </header>
  )
}

const TINT_CLASS: Record<string, 'blue' | 'yellow' | 'coral'> = {
  blue: 'blue',
  yellow: 'yellow',
  coral: 'coral',
}

const STAT_TINTS = ['blue', 'yellow', 'coral', 'plain'] as const

export function MissingPage() {
  return (
    <>
      <CaseNav />
      <main className="wrap cpage" id="main">
        <div className="cpage__miss">
          <h1>页面不存在</h1>
          <p>这个地址没有对应的页面。回<Link to="/">首页</Link>看全部案例。</p>
        </div>
      </main>
    </>
  )
}

export function CasePage({ slug }: { slug: string }) {
  const c = caseBySlug(slug)
  const ref = useStagger<HTMLElement>(60)

  if (!c) return <MissingPage />

  const tint = TINT_CLASS[c.tint] ?? 'blue'

  return (
    <>
      <CaseNav />
      <main className="cpage" id="main" ref={ref}>
      <div className="wrap">
        <nav className="cpage__back" aria-label="面包屑">
          <Link to="/">← 茉灵智库首页</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{c.name}</span>
        </nav>

        <header className="cpage__hd" data-t={tint}>
          <p className="cpage__meta">
            <b className="cpage__no">{c.no}</b>
            <span className="cpage__name">{c.name}</span>
            <span className="cpage__cn">{c.cn}</span>
          </p>
          <h1 className="cpage__claim" data-stagger>
            {c.claim}
          </h1>
          <p className="cpage__spec" data-stagger>
            {c.year} · {c.role} · {c.stackLine}
          </p>
          <p className="cpage__summary" data-stagger>{c.summary}</p>
          <p className="cpage__byline" data-stagger>
            作者：{profileLabel} · <a href={c.repo} target="_blank" rel="noreferrer">查看 {c.name} 源码 ↗</a>
          </p>
        </header>

        <div className="stats cpage__stats" data-stagger>
          {c.results.map((r, i) => (
            <div className="stat" data-t={STAT_TINTS[i % STAT_TINTS.length]} key={r.label}>
              <b>{r.value}</b>
              <s>{r.label}</s>
            </div>
          ))}
        </div>

        <div className="cpage__flow" data-t={tint}>
          {c.sections.map((s, i) => (
            <section className="step" key={s.label} data-stagger>
              <h2 className="step__k">
                <b aria-hidden="true">{String(i + 1).padStart(2, '0')}</b>
                <span>{s.label}</span>
              </h2>
              <p className="step__b">{s.body}</p>
            </section>
          ))}
        </div>

        <section className="offs" data-stagger>
          <h2 className="offs__h">关键取舍</h2>
          <p className="offs__lead">写清楚放弃了什么，比罗列做了什么更说明判断。</p>
          <div className="offs__grid">
            {c.tradeoffs.map((t) => (
              <article className="off" key={t.title}>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cpage__prov" data-stagger>
          <Panel title={`${c.name} · 数字出处`} tint={tint}>
            {c.provenance.map((p) => (
              <Row k={p.value} key={p.value}>
                {p.from}
              </Row>
            ))}
          </Panel>
        </section>

        <div className="cpage__acts" data-stagger>
          {c.link && (
            <a className="btn btn--blue" href={c.link} target="_blank" rel="noreferrer">
              {c.linkLabel ?? '在线体验'} ↗
            </a>
          )}
          <a className="btn btn--ghost" href={c.repo} target="_blank" rel="noreferrer">
            源码 ↗
          </a>
          <a className="btn btn--ghost" href={CONTACT_HREF}>
            {CTA_LABEL}
          </a>
        </div>

        <nav className="cpage__more" aria-label="其它案例">
          <p className="notes__label">其它案例</p>
          <ul>
            {cases
              .filter((o) => o.slug !== c.slug)
              .map((o) => (
                <li key={o.slug}>
                  <Link to={`/case/${o.slug}/`}>
                    <b>{o.name}</b>
                    <span>{o.claim}</span>
                    <i aria-hidden="true">→</i>
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <footer className="foot">
          <p>{footer.copyright}</p>
          <p className="foot__meta">
            <span>GitHub / 博客更新于 {AS_OF}</span>
          </p>
        </footer>
      </div>
      </main>
    </>
  )
}
