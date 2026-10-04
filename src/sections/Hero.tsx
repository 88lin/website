/** 00 开场：逐字揭示的大标题 + 项目叠卡 + 一条读数带。 */

import { Deck } from '../components/Deck'
import { Count } from '../components/Count'
import { AS_OF, WECHAT_QR_HREF, hero, metric, profile } from '../content/site'
import { useMagnet, useReveal, useStagger } from '../lib/motion'

/* 四块读数卡。 */
const STATS = [
  { t: 'blue', m: 'stars' },
  { t: 'yellow', m: 'repos' },
  { t: 'coral', m: 'forks' },
  { t: 'plain', m: 'followers' },
] as const

/* 把一行字拆成逐字的 span，并把序号写进 --i 供 CSS 算延迟。 */
function chars(text: string, from: number) {
  return Array.from(text).map((c, i) =>
    c === ' ' ? (
      ' '
    ) : (
      <span className="ch" style={{ ['--i' as string]: from + i }} key={from + i}>
        {c}
      </span>
    ),
  )
}

export function Hero() {
  const ref = useStagger<HTMLElement>(70)
  const title = useReveal<HTMLHeadingElement>('-4% 0px')
  const cta = useMagnet<HTMLAnchorElement>(5)

  /* 三行首尾相接的字序，交给 chars() 算延迟 */
  const n1 = hero.line1.length
  const n2a = n1 + hero.line2Pre.length
  const n2b = n2a + hero.line2Mark.length
  const n2c = n2b + hero.line2Mid.length
  const n3 = n2c + hero.line2Circle.length

  return (
    <section className="hero wrap" id="hero" ref={ref}>
      <div className="hero__grid">
        <div>
          <p className="kicker" data-stagger>
            {hero.latin}
          </p>

          <h1 className="hero__h1" ref={title}>
            <span>{chars(hero.line1, 0)}</span>
            <span>
              {chars(hero.line2Pre, n1)}
              <span className="mark">{chars(hero.line2Mark, n2a)}</span>
              {chars(hero.line2Mid, n2b)}
              {chars(hero.line2Circle, n2c)}
            </span>
            <span>{chars(hero.line3, n3)}</span>
          </h1>

          <p data-stagger>
            <span className="lead">{profile.role}</span>
          </p>

          <p className="hero__body" data-stagger>
            {hero.sub}
          </p>

          <div className="hero__acts" data-stagger>
            <a
              className="btn btn--blue"
              href={WECHAT_QR_HREF}
              target="_blank"
              rel="noreferrer"
              ref={cta}
            >
              {hero.primaryCta}
              <i aria-hidden="true">→</i>
            </a>
            <a className="btn btn--ghost" href="#services">
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div data-stagger>
          <Deck />
        </div>
      </div>

      <div className="stats" data-stagger>
        {STATS.map((s) => {
          const m = metric(s.m)
          return (
            <div className="stat" data-t={s.t} key={m.id}>
              <b>
                <Count value={m.value} />
              </b>
              <s>{m.label}</s>
              <span className="stat__src">{m.sub}</span>
            </div>
          )
        })}
      </div>

      <p className="kicker" style={{ marginTop: '18px' }} data-stagger>
        GitHub / 博客更新于 {AS_OF} · 每个都写了接口出处
      </p>
    </section>
  )
}
