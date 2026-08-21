/**
 * 案例子页 /case/:slug/。
 *
 * 首页那一章只放论点与实测；这里才铺全文：背景 / 卡在哪 / 怎么解 三段，
 * 加「关键取舍」与「数字出处」。
 *
 * 取舍单独成块是有意的：写清楚**放弃了什么**比罗列做了什么更能说明判断力，
 * 挑剔的读者只看这一块。数字出处也单独成块，一行一条，可以自己去核。
 *
 * 版式沿用全站语言：彩色读数卡、编号竖轴的分段、虚线数据面板、胶囊按钮。
 * 不为子页新造形状。
 */

import { caseBySlug, cases } from '../content/cases'
import { CONTACT_HREF, AS_OF, footer, profile } from '../content/site'
import { Panel, Row } from '../components/Section'
import { Link } from '../router'
import { useStagger } from '../lib/motion'

/** 子页顶栏：站名回首页 + 一枚联系入口。锚点导航在子页上没有意义，所以不放。 */
function CaseNav() {
  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="nav-mark" to="/">
          <b>{profile.name}</b>
          <s>@88LIN</s>
        </Link>
        <nav className="nav-links" aria-label="导航">
          <a className="gh" href={CONTACT_HREF}>
            聊聊合作
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

/** 读数卡的配色按顺序轮，和首页那四块同一个零件。 */
const STAT_TINTS = ['blue', 'yellow', 'coral', 'plain'] as const

export function CasePage({ slug }: { slug: string }) {
  const c = caseBySlug(slug)
  const ref = useStagger<HTMLElement>(60)

  if (!c) {
    return (
      <>
        <CaseNav />
        <main className="wrap cpage" id="main">
          <p className="cpage__miss">
            没有这个案例。回<Link to="/">首页</Link>看四个案例。
          </p>
        </main>
      </>
    )
  }

  const tint = TINT_CLASS[c.tint] ?? 'blue'

  return (
    <>
      <CaseNav />
      <main className="cpage" id="main" ref={ref}>
      <div className="wrap">
        <p className="cpage__back">
          <Link to="/">← 回首页</Link>
        </p>

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
        </header>

        <div className="stats cpage__stats" data-stagger>
          {c.results.map((r, i) => (
            <div className="stat" data-t={STAT_TINTS[i % STAT_TINTS.length]} key={r.label}>
              <b>{r.value}</b>
              <s>{r.label}</s>
            </div>
          ))}
        </div>

        <div className="cpage__flow">
          {c.sections.map((s, i) => (
            <section className="step" key={s.label} data-stagger>
              <p className="step__k">
                <b>{String(i + 1).padStart(2, '0')}</b>
                <span>{s.label}</span>
              </p>
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
            聊聊合作
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
            <a href={footer.source} target="_blank" rel="noreferrer">
              本站源码 ↗
            </a>
            <span>数字核实于 {AS_OF}</span>
          </p>
        </footer>
      </div>
      </main>
    </>
  )
}
