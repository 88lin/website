/**
 * EXP.03 作品 · 横推卡轨。
 *
 * 一条钉住的跑道，纵向滚动换算成横向推进。为什么值得为它花一个 pin：
 * 六个项目的分量差三个数量级，竖排会被读成清单，横排 + 卡宽按对数分配，
 * 第一眼就看得出主力。v10 的骨架保留，章头换成实验志的登记条。
 *
 * 零位图：截图位是数据面板（仓库路径 + 对数标度的 star / fork 条）。
 * 条长是算出来的。全站仓库统计数字只出现这一次。
 * 标本馆（小站们）拆去 EXP.05，这章只讲六个主力。
 */

import { useCallback, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { WIDE_MQ } from '../lib/bp'
import { chapters, projects, worksIntro, type Project } from '../content/site'
import { useLazyScene, useMediaQuery, worksPan, type SceneApi } from '../lib/motion'

const TOP = Math.log(1 + 4642)
/** 卡宽 = 24rem 起，按 star 的对数最多再加 12rem。差距看得见，又不至于失控。 */
const widthOf = (stars: number) => (24 + (12 * Math.log(1 + stars)) / TOP).toFixed(1)

/** 条长同样走对数：线性标度下除了第一条全是零宽，读不出任何东西。 */
const barOf = (n: number) => 4 + (196 * Math.log(1 + n)) / TOP

const STATE: Record<Project['state'], string> = {
  live: '在线运行',
  maintained: '持续维护',
  archived: '已归档',
}

const num = (n: number) => n.toLocaleString('en-US')
const repoOf = (url: string) => url.replace('https://github.com/', '')
const no2 = (i: number) => String(i + 1).padStart(2, '0')

/** 两条量级条。没有文字进 SVG：中文不进字体子集，数字交给 HTML 行。 */
function Bars({ stars, forks, name }: { stars: number; forks: number; name: string }) {
  return (
    <svg
      className="pcard__bars"
      viewBox="0 0 200 34"
      role="img"
      aria-label={`${name} 的量级：${num(stars)} star，${num(forks)} fork`}
    >
      <rect x="0" y="2" width="200" height="12" rx="6" fill="currentColor" opacity="0.12" />
      <rect x="0" y="20" width="200" height="12" rx="6" fill="currentColor" opacity="0.12" />
      <rect x="0" y="2" width={barOf(stars)} height="12" rx="6" fill="var(--tint-deep)" />
      <rect x="0" y="20" width={barOf(forks)} height="12" rx="6" fill="var(--tint)" />
    </svg>
  )
}

function Card({ p, i }: { p: Project; i: number }) {
  return (
    <article
      className="hscroll-card"
      data-card=""
      data-tint={p.tint}
      style={{ '--w': `${widthOf(p.stars)}rem` } as React.CSSProperties}
    >
      <span className="hscroll-card__n" aria-hidden="true">
        {no2(i)}
      </span>

      <p className="pcard__meta">
        <span>
          {p.kind} <span aria-hidden="true">/</span> {p.year}
        </span>
        <span className="pcard__state">
          <i className="dot" data-live={p.state} aria-hidden="true" />
          {STATE[p.state]}
        </span>
      </p>

      <h3 className="pcard__cn">{p.cn}</h3>
      <p className="pcard__name">{p.name}</p>
      <p className="pcard__blurb">{p.blurb}</p>

      <ul className="pcard__stack">
        {p.stack.slice(0, 3).map((s) => (
          <li className="pill pill--tint" key={s}>
            {s}
          </li>
        ))}
      </ul>

      <div className="pcard__act">
        {p.live ? (
          <a
            className="cta-btn cta-btn--sm"
            href={p.live}
            target="_blank"
            rel="noreferrer noopener"
          >
            打开站点 <ArrowOut />
          </a>
        ) : null}
        <a
          className="cta-btn cta-btn--ghost cta-btn--sm"
          href={p.repo}
          target="_blank"
          rel="noreferrer noopener"
        >
          源码 <ArrowOut />
        </a>
      </div>

      <div className="pcard__fig">
        <p className="pcard__repo">{repoOf(p.repo)}</p>
        <Bars stars={p.stars} forks={p.forks} name={p.name} />
        <p className="pcard__repo">
          STAR {num(p.stars)} <span aria-hidden="true">/</span> FORK {num(p.forks)}
        </p>
      </div>
    </article>
  )
}

export function Work() {
  const rail = useRef<HTMLDivElement | null>(null)
  const track = useRef<HTMLDivElement | null>(null)
  /**
   * 严格互补于 CSS 的 `max-width: 900px`。两边都写 900 会在正好 900px 时
   * 同时成立，pin 出来的 spacer 落在一个已经拆成竖排的容器里 —— 那就是
   * 移动端整屏空白的来源。区间只许有一个来源：lib/bp.ts。
   */
  const wide = useMediaQuery(WIDE_MQ)

  const build = useCallback(({ gsap }: SceneApi) => {
    if (!rail.current || !track.current) return
    const t = track.current
    t.classList.add('is-pan')
    // 返回值是卸载钩子：还原手写的内联高度与 is-pan，gsap.context 不管这些。
    return worksPan(gsap, rail.current, t)
  }, [])

  useLazyScene(rail, build, wide)

  const ch = chapters.find((c) => c.id === 'work')!

  return (
    <section id="work" className="ch ch--work" data-tone="alt" aria-labelledby="work-h">
      <div className="work-rail" ref={rail}>
        <div className="work-vp">
          <div className="wrap work-head">
            <header className="ch-head ch-head--inline">
              <s className="ch-no" aria-hidden="true">
                EXP.{ch.no}
              </s>
              <div className="ch-head__txt">
                <h2 id="work-h">{worksIntro.headline}</h2>
                <p>{worksIntro.body}</p>
              </div>
            </header>
          </div>

          <div className="work-track" ref={track}>
            {projects.map((p, i) => (
              <Card p={p} i={i} key={p.slug} />
            ))}
            <span className="work-end" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
