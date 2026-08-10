/**
 * 02 作品 · 横向图廊。
 *
 * 一条钉住的跑道，纵向滚动被换算成横向推进。为什么值得为它花一个 pin：
 * 六个项目的分量差三个数量级（4581 star 对 0 star），竖着排会被读成一张清单，
 * 横着排 + **卡宽按 star 对数分配**，第一眼就看得出谁是主力。
 *
 * 每张卡都带真实截图（6/6，audit G13 会数）。两个只有仓库没有站点的项目
 * 用 GitHub 官方社交预览卡，也是真实的，不画假窗口。
 *
 * 没有 JS 或窄屏时，跑道退成一条可横向滚动的 flex，内容一条不少。
 */

import { useCallback, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { Shot } from '../components/Shot'
import { projects, worksIntro, type Project } from '../content/site'
import { useLazyScene, useMediaQuery, worksPan, type SceneApi } from '../lib/motion'

const TOP = Math.log(1 + 4581)
/** 卡宽 = 24rem 起，按 star 的对数最多再加 12rem。差距看得见，又不至于失控。 */
const widthOf = (stars: number) => (24 + (12 * Math.log(1 + stars)) / TOP).toFixed(1)

const STATE: Record<Project['state'], string> = {
  live: '在线运行',
  maintained: '持续维护',
  archived: '已归档',
}

const num = (n: number) => n.toLocaleString('en-US')

function Card({ p }: { p: Project }) {
  return (
    <article
      className="pcard tilt"
      data-card=""
      data-tint={p.tint}
      style={{ '--w': `${widthOf(p.stars)}rem` } as React.CSSProperties}
    >
      <Shot
        cover={p.cover}
        kind={p.coverKind}
        alt={`${p.name} 页面截图`}
        ratio="16 / 10"
        sizes="(max-width: 900px) 84vw, 30rem"
      />
      <div className="pcard__body">
        <p className="pcard__kind">
          {p.kind} <span aria-hidden="true">/</span> {p.year}
        </p>
        <h3 className="pcard__name">{p.name}</h3>
        <p className="pcard__cn">{p.cn}</p>
        <p className="pcard__blurb">{p.blurb}</p>
        <ul className="pcard__stack">
          {p.stack.slice(0, 3).map((s) => (
            <li className="chip chip--tint" key={s}>
              {s}
            </li>
          ))}
        </ul>
        <dl className="pcard__nums">
          <div>
            <dt>Star</dt>
            <dd data-zero={p.stars === 0 ? '' : undefined}>{num(p.stars)}</dd>
          </div>
          <div>
            <dt>Fork</dt>
            <dd data-zero={p.forks === 0 ? '' : undefined}>{num(p.forks)}</dd>
          </div>
        </dl>
        <div className="pcard__foot">
          <span className="state" data-live={p.state}>
            {STATE[p.state]}
          </span>
          <span className="pcard__links">
            {p.live ? (
              <a href={p.live} target="_blank" rel="noreferrer noopener">
                打开站点 <ArrowOut />
              </a>
            ) : null}
            <a href={p.repo} target="_blank" rel="noreferrer noopener">
              源码 <ArrowOut />
            </a>
          </span>
        </div>
      </div>
    </article>
  )
}

export function Work() {
  const rail = useRef<HTMLDivElement | null>(null)
  const track = useRef<HTMLDivElement | null>(null)
  const wide = useMediaQuery('(min-width: 900px)')

  const build = useCallback(({ gsap }: SceneApi) => {
    if (!rail.current || !track.current) return
    track.current.classList.add('is-pan')
    worksPan(gsap, rail.current, track.current)
  }, [])

  useLazyScene(rail, build, wide)

  return (
    <section id="work" className="ch ch--work" data-tone="blue" aria-labelledby="work-h">
      <div className="work__rail" ref={rail}>
        <div className="work__vp">
          <div className="wrap work__head">
            <p className="eyebrow">SIX SHIPPED</p>
            <h2 className="ch-title" id="work-h">
              {worksIntro.headline}
            </h2>
            <p className="ch-lede">{worksIntro.body}</p>
          </div>
          <div className="work__track" ref={track}>
            {projects.map((p) => (
              <Card p={p} key={p.slug} />
            ))}
            <span className="work__end" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
