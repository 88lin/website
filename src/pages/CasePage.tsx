/**
 * 案例子页。
 *
 * 首页那三张卡是「一眼看懂」，这里是「愿意读完」——所以子页反过来做：
 * 米白纸底、单栏长文、没有横推、没有堆叠。读长文的人不需要被表演。
 *
 * v8 起这一页也零位图。顶部原本那张界面截图换成一块深色控制台：
 * 写的是这个项目真实的结构约定（收拢的播放器 / 两条硬规则 / 18 路接口与
 * 22 个适配器），比一张糊掉的缩略图更能说明它到底是个什么东西。
 * 页面上出现的每个数字都能在「数字出处」里找到它是从哪个接口、哪个文件数出来的。
 */

import { ArrowBack, ArrowOut } from '../components/Icons'
import { caseBySlug, vipHosts, vipInterfaces } from '../content/cases'
import { footer } from '../content/site'
import { Link } from '../router'

type Line = { k: string; v: string; note?: string }

/** 每个案例的结构约定，逐条对应正文「怎么解」里写明的做法。 */
const SPEC: Record<string, Line[]> = {
  lofi: [
    { k: 'player', v: 'collapsed', note: '默认收拢成一枚窄条' },
    { k: 'feedback', v: 'waveform', note: '状态靠波形，不弹提示' },
    { k: 'stations', v: '21', note: '精选电台，可用性由我负责' },
    { k: 'fallback', v: 'retry → switch', note: '静默重试与换源' },
    { k: 'account', v: 'none', note: '没有登录，也就没有第一个理由' },
  ],
  repair: [
    { k: 'rule 1', v: 'evidence first', note: '先读状态、日志与硬件事实' },
    { k: 'rule 2', v: 'read only first', note: '写操作先给影响面与回滚' },
    { k: 'playbooks', v: '62 on demand', note: '一张路由索引，按问题加载' },
    { k: 'os', v: 'windows / macos / linux', note: '三条独立排查路径' },
    { k: 'ci', v: 'route table check', note: '校验 62 个文件的路由表' },
  ],
  'video-vip': [
    { k: 'parsers', v: '18 switchable', note: '悬浮面板一秒换一路' },
    { k: 'adapters', v: '22 per host', note: '改一个站不牵动其余 21 个' },
    { k: 'include', v: '35 rules', note: '同时覆盖 PC 与移动端入口' },
    { k: 'button', v: 'draggable', note: '位置记住，不挡任何站的控制条' },
  ],
}

function Console({ slug }: { slug: string }) {
  const lines = SPEC[slug] || []
  return (
    <div className="slab cpage__slab">
      {lines.map((l) => (
        <div key={l.k}>
          <b>{l.k}</b> {l.v} {l.note ? <em># {l.note}</em> : null}
        </div>
      ))}
      {slug === 'video-vip' ? (
        <>
          <ul className="cpage__tokens">
            {vipInterfaces.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <ul className="cpage__tokens">
            {vipHosts.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}

export function CasePage({ slug }: { slug: string }) {
  const c = caseBySlug(slug)

  if (!c) {
    return (
      <main id="main" className="cpage" data-tone="paper">
        <div className="wrap">
          <Link className="cpage__back" to="/">
            <ArrowBack />
            回首页
          </Link>
          <h1 className="cpage__h">没有这一页</h1>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="cpage" data-tone="paper" data-tint={c.tint}>
      <div className="wrap">
        <Link className="cpage__back" to="/">
          <ArrowBack />
          回首页
        </Link>

        <div className="cpage__hd">
          <p className="cpage__no">
            CASE {c.no} <span aria-hidden="true">/</span> {c.year}
          </p>
          <h1 className="cpage__h">{c.name}</h1>
          <p className="cpage__claim">{c.claim}</p>
          <div className="cpage__meta">
            <span>{c.role}</span>
            <span>{c.stackLine}</span>
          </div>
        </div>

        <Console slug={c.slug} />

        <div className="cpage__body">
          <section>
            <h2>{c.cn}</h2>
            <p>{c.summary}</p>
          </section>
          {c.sections.map((s) => (
            <section key={s.label}>
              <h2>{s.label}</h2>
              <p>{s.body}</p>
            </section>
          ))}
          {c.tradeoffs.map((t) => (
            <section key={t.title}>
              <h2>{t.title}</h2>
              <p>{t.body}</p>
            </section>
          ))}
        </div>

        <dl className="cpage__res">
          {c.results.map((r) => (
            <div className="slab" key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>

        <div className="cpage__prov">
          <h2>数字出处</h2>
          {c.provenance.map((p) => (
            <p key={p.value}>
              <b>{p.value}</b> {p.from}
            </p>
          ))}
        </div>

        <div className="cpage__go">
          {c.link ? (
            <a className="cta-btn" href={c.link} target="_blank" rel="noreferrer noopener">
              {c.linkLabel || '在线'} <ArrowOut />
            </a>
          ) : null}
          <a
            className="cta-btn cta-btn--ghost"
            href={c.repo}
            target="_blank"
            rel="noreferrer noopener"
          >
            仓库 <ArrowOut />
          </a>
        </div>

        <footer className="foot">
          <span>{footer.copyright}</span>
          <Link to="/">回首页</Link>
          <span>数据核实于 {footer.asOf}</span>
        </footer>
      </div>
    </main>
  )
}
