/**
 * 03 做过什么 · 横推卡轨 + 虚线场景卡。
 *
 * 一条钉住的跑道，纵向滚动被换算成横向推进。为什么值得为它花一个 pin：
 * 六个项目的分量差三个数量级，竖着排会被读成一张清单，横着排 + 卡宽按对数分配，
 * 第一眼就看得出谁是主力。
 *
 * v10 只换外壳不换骨架：卡片改成参考站 #26 的 .hscroll-card（白纸 + 细投影 +
 * 手写体角标），色相只染角标、状态灯、标签与量级条，卡面永远是白的。
 * 「打开站点 / 源码」两枚按钮留在卡片内部 —— v8 把它们贴在卡的裁切边上，
 * 横滑时正好被切掉，用户反馈「看不到」是准确的。
 *
 * 零位图：原来放截图的那一格是数据面板，仓库路径 + 两条对数标度的 star / fork 条。
 * 条长是算出来的，不是画上去的。全站的仓库统计数字只在这里出现这一次。
 *
 * 章尾接导航站六张虚线场景卡（dst 的 .scene-card），标签用与地面同色的底
 * 抠在边框缺口上 —— 那是设计系统里最好认的一个零件。
 */

import { useCallback, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { Reveal } from '../components/Reveal'
import { WIDE_MQ } from '../lib/bp'
import {
  gardenFeatured,
  gardenIntro,
  projects,
  worksIntro,
  type GardenGroup,
  type Project,
  type Tint,
} from '../content/site'
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

/**
 * 场景卡的色相按「类」定，不按下标轮换 —— 下标轮换会让两张都写着「工具」的卡
 * 一黄一红，看起来像随机上色。绑到类上，颜色就成了可读的信息。
 */
const GROUP_TINT: Record<GardenGroup, Tint> = {
  特效: 'coral',
  工具: 'blue',
  内容: 'yellow',
  组件: 'coral',
}

const num = (n: number) => n.toLocaleString('en-US')
const repoOf = (url: string) => url.replace('https://github.com/', '')
const no2 = (i: number) => String(i + 1).padStart(2, '0')

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
    <section id="work" className="ch" data-tone="paper" aria-labelledby="work-h">
      <div className="work-rail" ref={rail}>
        <div className="work-vp">
          <div className="wrap work-head">
            <span className="section-number" aria-hidden="true">
              03
            </span>
            <p className="label-caps">SHIPPED &amp; RUNNING</p>
            <h2 className="ch-title" id="work-h">
              {worksIntro.headline}
            </h2>
            <p className="ch-lede">{worksIntro.body}</p>
          </div>

          <div className="work-track" ref={track}>
            {projects.map((p, i) => (
              <Card p={p} i={i} key={p.slug} />
            ))}
            <span className="work-end" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* 导航站。每类挑一个，附一句「为什么是它」，剩下 34 个交给导航站本身 —— */}
      {/* v8 在这里铺过 40 块彩色底卡，等于把用户自己的导航站抄了一遍还抄丑了。 */}
      <div className="wrap work-garden">
        <div className="ch-head">
          <p className="label-caps">SIDE GARDEN</p>
          <h3 className="ch-title">{gardenIntro.headline}</h3>
          <p className="ch-lede">{gardenIntro.body}</p>
          <div className="act-row">
            <a
              className="cta-btn cta-btn--ghost cta-btn--sm"
              href={gardenIntro.hub}
              target="_blank"
              rel="noreferrer noopener"
            >
              {gardenIntro.hubLabel} · 全部 {gardenIntro.total} 个 <ArrowOut />
            </a>
            <span className="pill pill--mono">另有 {gardenIntro.rest} 个未在此列出</span>
          </div>
        </div>

        <Reveal className="scene-grid">
          {gardenFeatured.map((it) => (
            <a
              className="scene-card"
              data-card=""
              data-tint={GROUP_TINT[it.group]}
              key={it.name}
              href={it.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="scene-card__label">{it.group}</span>
              <h4>{it.name}</h4>
              <p>{it.why}</p>
              <span className="scene-card__go">
                打开 <ArrowOut />
              </span>
            </a>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
