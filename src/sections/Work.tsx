/**
 * 03 作品。七个还在线上跑着的东西，横向滑。
 *
 * 用原生 overflow-x + scroll-snap，不用 gsap 把整章钉住做横推：
 * 钉住式横推在移动端与触控板上手感难控（v8 就在这里留下过一屏死白），
 * 而原生滚动天生支持触摸、滚轮横滑、键盘与滚动条，且零 JS。
 * 桌面端额外给一对翻页按钮，因为鼠标用户没有横向滑动手势。
 */

import { useCallback, useRef } from 'react'
import { Section } from '../components/Section'
import { projects, worksIntro } from '../content/site'

const STATE: Record<string, string> = {
  live: '在线',
  maintained: '长期维护',
  archived: '已归档',
}

export function Work() {
  const rail = useRef<HTMLDivElement | null>(null)

  const page = useCallback((dir: 1 | -1) => {
    const el = rail.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('.wcard')
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8
    el.scrollBy({ left: step * dir, behavior: 'smooth' })
  }, [])

  return (
    <Section id="work" title={worksIntro.headline} intro={worksIntro.body}>
      <div className="rail-top">
        <p className="rail-hint">横向滑动 · {projects.length} 个</p>
        <div className="rail-nav">
          <button type="button" onClick={() => page(-1)} aria-label="上一张">
            ←
          </button>
          <button type="button" onClick={() => page(1)} aria-label="下一张">
            →
          </button>
        </div>
      </div>

      <div className="rail" ref={rail}>
        {projects.map((p) => (
          <article className="wcard" data-t={p.tint} key={p.slug}>
            <div className="wcard__top">
              <span className="wcard__year">{p.year}</span>
              <span className="wcard__state" data-s={p.state}>
                {STATE[p.state]}
              </span>
            </div>

            <h3 className="wcard__name">{p.name}</h3>
            <p className="wcard__cn">{p.cn}</p>
            <p className="wcard__blurb">{p.blurb}</p>

            <ul className="wcard__stack">
              {p.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>

            <div className="wcard__foot">
              <p className="wcard__nums">
                {p.stars > 0 && (
                  <span>
                    <b>{p.stars.toLocaleString('en-US')}</b> Star
                  </span>
                )}
                {p.forks > 0 && (
                  <span>
                    <b>{p.forks}</b> Fork
                  </span>
                )}
              </p>
              <p className="wcard__links">
                {p.live && (
                  <a href={p.live} target="_blank" rel="noreferrer">
                    打开 ↗
                  </a>
                )}
                <a href={p.repo} target="_blank" rel="noreferrer">
                  源码 ↗
                </a>
              </p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}
