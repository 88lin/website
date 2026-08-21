/**
 * 00 开场。
 *
 * 首屏要在三秒内同时交出三件事：这人前端水准（页面本身）、他真做出过能跑的
 * 东西（证据条上的四个数）、怎么联系（CTA 常驻）。
 *
 * 标题与图版是同一台仪器的两个显示面：右边那件实体正面读「交付」、侧面读
 * 「维护」，左边标题里的这两个词一个被荧光笔扫着、一个被朱笔圈着，
 * 亮度跟着实体的转角走（--read，由 Sculpt 每帧写入）。转到侧读位时，
 * 黄的退下去、朱的亮起来。这不是联动特效，是把「同一件东西看两次」这个
 * 论点在版面上再说一遍。
 *
 * 两种版式（Phase 0 定稿用，定稿后删掉没被选中的那个）：
 *  p1 版心留白 · 雕塑居右 —— 巨号三行阶梯标题在左，发丝线分栏，实体占右半。
 *  p2 满幅雕塑 · 标题压角 —— 实体横过整个版心，标题降一档落到下沿当标签。
 */

import { Circle } from '../components/Ink'
import { Sculpt } from '../components/Sculpt'
import { AS_OF, CONTACT_HREF, garden, hero, metrics, profile } from '../content/site'
import { useStagger } from '../lib/motion'

export type HeroVariant = 'p1' | 'p2'

/**
 * 证据条的四个数。全部从唯一数据源派生 —— 小站数量取 garden 数组长度，
 * 不写死（v8 在这里写死过一个错的「41」）。
 */
const PROOF = [
  { v: metrics[0].value, l: '累计 Star' },
  { v: metrics[2].value, l: '原创仓库' },
  { v: String(garden.length), l: '在线小站' },
  { v: profile.since, l: '年起持续在做' },
]

function Kicker() {
  return (
    <p className="hero__kicker" data-stagger>
      <i aria-hidden="true" />
      {hero.latin}
    </p>
  )
}

/** 三行阶梯标题。两个被标记的词永远排在同一行，才对得上实体的两读。 */
function Headline() {
  return (
    <h1 className="hero__h1" data-stagger>
      <span>{hero.line1}</span>
      <span>
        {hero.line2Pre}
        <span className="hl">{hero.line2Mark}</span>
        {hero.line2Mid}
        <Circle seed="hero-maintain">{hero.line2Circle}</Circle>
      </span>
      <span>{hero.line3}</span>
    </h1>
  )
}

function Sub() {
  return (
    <p className="hero__sub" data-stagger>
      {hero.sub}
    </p>
  )
}

function Acts() {
  return (
    <div className="hero__acts" data-stagger>
      <a className="btn btn--fill" href={CONTACT_HREF}>
        {hero.primaryCta}
        <i aria-hidden="true">→</i>
      </a>
      <a className="btn btn--line" href="#cases">
        {hero.secondaryCta}
      </a>
    </div>
  )
}

function Proof() {
  return (
    <div className="proof" data-stagger>
      {PROOF.map((p) => (
        <span className="proof__i" key={p.l}>
          <b className="proof__v">{p.v}</b>
          <span className="proof__l">{p.l}</span>
        </span>
      ))}
      <span className="proof__as">核实 {AS_OF}</span>
    </div>
  )
}

export function Hero({ variant = 'p1' }: { variant?: HeroVariant }) {
  const ref = useStagger<HTMLElement>(70)
  return (
    <section className={`hero hero--${variant}`} id="hero" data-tone="paper" ref={ref}>
      <div className="hero__in">
        {variant === 'p1' ? (
          <>
            <div className="hero__grid">
              <div className="hero__say">
                <Kicker />
                <Headline />
                <Sub />
                <Acts />
              </div>
              <div className="hero__art">
                <Sculpt />
              </div>
            </div>
          </>
        ) : (
          <>
            <Kicker />
            <div className="hero__art">
              <Sculpt />
            </div>
            <div className="hero__stack">
              <div className="hero__say">
                <Headline />
                <Sub />
              </div>
              <Acts />
            </div>
          </>
        )}
        <Proof />
      </div>
    </section>
  )
}
