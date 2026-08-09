/**
 * 案例子页。
 *
 * 首页那三张卡是「一眼看懂」，这里是「愿意读完」——所以子页反过来做：
 * 米白纸底、单栏长文、没有 3D、没有动效。读长文的人不需要被表演。
 *
 * 右栏钉着四个数字与逐条出处。页面上出现的每个数字都能在 provenance 里
 * 找到它是从哪个接口、哪个文件、哪一行数出来的。
 */

import { ArrowBack, ArrowOut } from '../components/Icons'
import { caseBySlug } from '../content/cases'
import { footer } from '../content/site'
import { Link } from '../router'

export function CasePage({ slug }: { slug: string }) {
  const c = caseBySlug(slug)

  if (!c) {
    return (
      <main id="main" className="cp">
        <div className="wrap cp__hero">
          <h1 className="cp__title">没有这一页</h1>
          <Link className="cp__back" to="/">
            <ArrowBack />
            回首页
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="cp">
      <div className="wrap cp__hero">
        <Link className="cp__back" to="/">
          <ArrowBack />
          回首页
        </Link>
        <h1 className="cp__title">{c.name}</h1>
        <p className="lede">{c.claim}</p>
        <p className="tag">
          {c.year} · {c.role} · {c.stackLine}
        </p>
      </div>

      <div className="wrap cp__grid">
        <div>
          <div className="cp__sec">
            <h2>{c.cn}</h2>
            <p>{c.summary}</p>
          </div>
          {c.sections.map((s) => (
            <div className="cp__sec" key={s.label}>
              <h2>{s.label}</h2>
              <p>{s.body}</p>
            </div>
          ))}
          {c.tradeoffs.map((t) => (
            <div className="cp__sec" key={t.title}>
              <h2>{t.title}</h2>
              <p>{t.body}</p>
            </div>
          ))}
        </div>

        <aside className="case__side">
          <div className="case__figures">
            {c.results.map((r) => (
              <div className="figure" key={r.label}>
                <b>{r.value}</b>
                <span>{r.label}</span>
              </div>
            ))}
          </div>

          <div className="cp__prov">
            {c.provenance.map((p) => (
              <div key={p.value}>
                <b>{p.value}</b>
                <span>{p.from}</span>
              </div>
            ))}
          </div>

          <div className="case__links">
            {c.link ? (
              <a className="btn" href={c.link} target="_blank" rel="noreferrer noopener">
                {c.linkLabel || '在线'}
                <ArrowOut />
              </a>
            ) : null}
            <a className="btn btn--ghost" href={c.repo} target="_blank" rel="noreferrer noopener">
              仓库
              <ArrowOut />
            </a>
          </div>
        </aside>
      </div>

      <footer className="wrap foot">
        <span>{footer.copyright}</span>
        <span>{footer.note}</span>
        <span className="tag">数据核实于 {footer.asOf}</span>
      </footer>
    </main>
  )
}
