/**
 * 案例子页。
 *
 * 首页那三张卡是「一眼看懂」，这里是「愿意读完」——所以子页反过来做：
 * 米白纸底、单栏长文、没有横推、没有堆叠。读长文的人不需要被表演。
 *
 * 页面上出现的每个数字都能在 provenance 里找到它是从哪个接口、哪个文件、
 * 哪一行数出来的。顶部一张真实截图，读者先知道这东西长什么样再读它怎么做的。
 */

import { ArrowBack, ArrowOut } from '../components/Icons'
import { Shot } from '../components/Shot'
import { caseBySlug } from '../content/cases'
import { footer } from '../content/site'
import { Link } from '../router'

const COVER: Record<string, string> = {
  lofi: 'lofi',
  repair: 'repair',
  'video-vip': 'video-vip',
}

export function CasePage({ slug }: { slug: string }) {
  const c = caseBySlug(slug)

  if (!c) {
    return (
      <main id="main" className="cp" data-tone="paper">
        <div className="wrap cp__hero">
          <h1 className="ch-title">没有这一页</h1>
          <Link className="cp__back" to="/">
            <ArrowBack />
            回首页
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="cp" data-tone="paper" data-tint={c.tint}>
      <div className="wrap cp__hero">
        <Link className="cp__back" to="/">
          <ArrowBack />
          回首页
        </Link>
        <p className="eyebrow">
          CASE {c.no} <span aria-hidden="true">/</span> {c.year}
        </p>
        <h1 className="ch-title">{c.name}</h1>
        <p className="cp__claim">{c.claim}</p>
        <ul className="cp__meta">
          <li className="chip">{c.role}</li>
          {c.stackLine.split(' · ').map((s) => (
            <li className="chip chip--tint" key={s}>
              {s}
            </li>
          ))}
        </ul>
        <Shot
          cover={COVER[c.slug]}
          alt={`${c.name} 界面截图`}
          ratio="21 / 9"
          eager
          sizes="(max-width: 900px) 92vw, 76rem"
          className="cp__shot"
        />
      </div>

      <div className="wrap cp__grid">
        <div className="cp__main">
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

        <aside className="cp__aside">
          <dl className="case__res">
            {c.results.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>

          <div className="cp__prov">
            <h2>数字出处</h2>
            {c.provenance.map((p) => (
              <div key={p.value}>
                <b>{p.value}</b>
                <span>{p.from}</span>
              </div>
            ))}
          </div>

          <div className="case__go">
            {c.link ? (
              <a className="btn btn--solid" href={c.link} target="_blank" rel="noreferrer noopener">
                {c.linkLabel || '在线'} <ArrowOut />
              </a>
            ) : null}
            <a className="btn btn--ghost" href={c.repo} target="_blank" rel="noreferrer noopener">
              仓库 <ArrowOut />
            </a>
          </div>
        </aside>
      </div>

      <div className="wrap">
        <footer className="foot">
          <p className="foot__c">{footer.copyright}</p>
          <p className="foot__m">
            <Link to="/">回首页</Link>
            <span>数据核实于 {footer.asOf}</span>
          </p>
        </footer>
      </div>
    </main>
  )
}
