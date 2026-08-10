/**
 * 03 作品 · 横向图廊。
 *
 * 一条钉住的跑道，纵向滚动被换算成横向推进。为什么值得为它花一个 pin：
 * 六个项目的分量差三个数量级，竖着排会被读成一张清单，横着排 + 卡宽按对数分配，
 * 第一眼就看得出谁是主力。
 *
 * v9 改了三处：
 *  1) 「打开站点 / 源码」从卡片外沿的那一行挪进卡片内部，做成两枚胶囊按钮
 *     （一实心一描边，颜色跟卡片色相走）。原来的写法贴在卡的裁切边上，滑起来看不见。
 *  2) 技术栈标签与状态灯一并胶囊化，按卡片色相分色，不再是灰底方角。
 *  3) 窄屏彻底不建横向跑道，改竖排堆叠 —— 见 lib/bp.ts 与 index.css 里的说明。
 *     这类失效不是补丁能补干净的，只能从结构上让它无处发生。
 *
 * 零位图：原来放截图的那一格是数据面板，仓库路径 + 两条对数标度的 star / fork 条。
 * 条长是算出来的，不是画上去的。全站的仓库统计数字只在这里出现这一次。
 */

import { useCallback, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { WIDE_MQ } from '../lib/bp'
import { projects, worksIntro, type Project } from '../content/site'
import { useLazyScene, useMediaQuery, worksPan, type SceneApi } from '../lib/motion'

const TOP = Math.log(1 + 4581)
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

/** 两条量级条。没有文字进 SVG：中文字形不进子集，等宽数字交给 HTML 那一行。 */
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

function Card({ p }: { p: Project }) {
  return (
    <article
      className="slab pcard tilt"
      data-card=""
      data-tint={p.tint}
      style={{ '--w': `${widthOf(p.stars)}rem` } as React.CSSProperties}
    >
      <div className="pcard__top">
        <p className="pcard__kind">
          {p.kind} <span aria-hidden="true">/</span> {p.year}
        </p>
        <span className="pill pill--state" data-live={p.state}>
          <i aria-hidden="true" />
          {STATE[p.state]}
        </span>
      </div>

      <h3 className="pcard__cn">{p.cn}</h3>
      <p className="pcard__name">{p.name}</p>
      <p className="pcard__blurb">{p.blurb}</p>

      <ul className="pcard__stack">
        {p.stack.slice(0, 3).map((s, i) => (
          <li className="pill pill--tag" data-k={i} key={s}>
            {s}
          </li>
        ))}
      </ul>

      {/* 按钮在卡片内部。v8 把它们放在 .pcard__foot 里贴着卡的下沿，
          横滑时正好压在裁切边上，用户反馈「看不到」是准确的。 */}
      <div className="pcard__act">
        {p.live ? (
          <a className="pill pill--go" href={p.live} target="_blank" rel="noreferrer noopener">
            打开站点 <ArrowOut />
          </a>
        ) : null}
        <a className="pill pill--src" href={p.repo} target="_blank" rel="noreferrer noopener">
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
   * 用户在移动端看到的整屏空白。区间只许有一个来源：lib/bp.ts。
   */
  const wide = useMediaQuery(WIDE_MQ)

  const build = useCallback(({ gsap }: SceneApi) => {
    if (!rail.current || !track.current) return
    const t = track.current
    t.classList.add('is-pan')
    // 返回值是卸载钩子，交给 gsap.context 在 revert 时调用：
    // 它负责把手写的内联高度和 is-pan 还原，context 自己不管这些。
    return worksPan(gsap, rail.current, t)
  }, [])

  useLazyScene(rail, build, wide)

  return (
    <section id="work" className="ch ch--work" data-tone="blue" aria-labelledby="work-h">
      <div className="work__rail" ref={rail}>
        <div className="work__vp">
          <div className="wrap work__head">
            <p className="eyebrow">SHIPPED &amp; RUNNING</p>
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
