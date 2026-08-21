/**
 * 00 开场。
 *
 * 版式基准来自用户点名认可的四个自有页面（repair / book / components-preview /
 * demo-readme-tutorial），不是我的偏好：
 *  左栏 —— 灰色大写 kicker、得意黑超粗大标题（关键字压实心黄块）、
 *          蓝色一行小标题带虚线下划线、灰正文、蓝实心 + 白描边两枚胶囊
 *  右栏 —— 有颜色有内容的视觉主体：案例叠卡（book 页那个装置），
 *          周围挂白色悬浮胶囊标签（tutorial 页那两枚零件）
 *  底部 —— 四块彩色读数卡（repair 页首屏底下那三块）
 *
 * 3D 与滚动动效这一版先不上：底子的好看要先立住，再往上加。
 */

import { cases } from '../content/cases'
import { AS_OF, CONTACT_HREF, garden, hero, metrics, profile } from '../content/site'
import { useStagger } from '../lib/motion'

/** 叠卡最前面那张放 star 最多、故事最硬的一个。 */
const FRONT = cases.find((c) => c.slug === 'video-vip') ?? cases[0]

/** 四块读数卡。全部从唯一数据源派生；小站数量取 garden 长度，不写死。 */
const STATS = [
  { t: 'blue', v: metrics[0].value, l: metrics[0].label, src: metrics[0].sub },
  { t: 'yellow', v: metrics[2].value, l: metrics[2].label, src: metrics[2].sub },
  { t: 'coral', v: String(garden.length), l: '在线小站', src: '特效 / 工具 / 内容 / 组件四类' },
  { t: 'plain', v: metrics[4].value, l: metrics[4].label, src: metrics[4].sub },
] as const

export function Hero() {
  const ref = useStagger<HTMLElement>(70)

  return (
    <section className="hero wrap" id="hero" ref={ref}>
      <div className="hero__grid">
        <div>
          <p className="kicker" data-stagger>
            {hero.latin}
          </p>

          <h1 className="hero__h1" data-stagger>
            <span>{hero.line1}</span>
            <span>
              {hero.line2Pre}
              <span className="mark">{hero.line2Mark}</span>
              {hero.line2Mid}
              {hero.line2Circle}
            </span>
            <span>{hero.line3}</span>
          </h1>

          <p data-stagger>
            <span className="lead">{profile.role}</span>
          </p>

          <p className="hero__body" data-stagger>
            {hero.sub}
          </p>

          <div className="hero__acts" data-stagger>
            <a className="btn btn--blue" href={CONTACT_HREF}>
              {hero.primaryCta}
              <i aria-hidden="true">→</i>
            </a>
            <a className="btn btn--ghost" href="#cases">
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div className="deck" data-stagger>
          <div className="deck__stack">
            <i className="deck__back" data-t="teal" aria-hidden="true" />
            <i className="deck__back" data-t="yellow" aria-hidden="true" />
            <i className="deck__back" data-t="coral" aria-hidden="true" />

            <article className="deck__front">
              <p className="deck__no">CASE {FRONT.no} · {FRONT.year}</p>
              <p className="deck__name">{FRONT.name}</p>
              <p className="deck__claim">{FRONT.claim}</p>
              <div className="deck__rule" />
              <div className="deck__nums">
                {FRONT.results.slice(0, 3).map((r) => (
                  <span className="deck__num" key={r.label}>
                    <b>{r.value}</b>
                    <s>{r.label}</s>
                  </span>
                ))}
              </div>
            </article>
          </div>

          <span className="deck__pill deck__pill--a">
            <em>18</em> 路接口，挂一路换一路
          </span>
          <span className="deck__pill deck__pill--b">
            <em>{cases.length}</em> 个深度案例
          </span>
        </div>
      </div>

      <div className="stats" data-stagger>
        {STATS.map((s) => (
          <div className="stat" data-t={s.t} key={s.l}>
            <b>{s.v}</b>
            <s>{s.l}</s>
            <span className="stat__src">{s.src}</span>
          </div>
        ))}
      </div>

      <p className="kicker" style={{ marginTop: '18px' }} data-stagger>
        全部数字核实于 {AS_OF} · 每个都写了接口出处
      </p>
    </section>
  )
}
