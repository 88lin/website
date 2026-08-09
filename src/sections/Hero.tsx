/**
 * 00 主张。
 *
 * 敞开章：不铺自己的底色，看到的是舞台上的 107° 双色斜切场加织带。
 * 版式上唯一一屏文字压边出血、唯一没有栅格、唯一右上留大片空——那片空不是
 * 「没排满」，是留给织带的画面。巨字沉在左下角，像一张被裁掉一角的海报。
 */

import { CONTACT_HREF, hero, profile } from '../content/site'
import { scrollToId } from '../lib/motion'

export function Hero() {
  return (
    <section id="hero" className="ch ch-hero ch--open" data-tone="deep">
      <div className="wrap hero__mark">
        <span className="hero__name">{profile.name}</span>
        <span className="tag">{hero.latin}</span>
      </div>

      <div className="wrap hero__stack">
        <div className="hero__body">
          <h1 className="hero__title">
            <span className="hero__ln">{hero.line1}</span>
            <span className="hero__ln hero__ln--in">
              {hero.line2Pre}
              <em>{hero.line2Mark}</em>
              {hero.line2Mid}
              <em>{hero.line2Circle}</em>
              {hero.line2Post}
            </span>
            <span className="hero__ln">{hero.line3}</span>
          </h1>
          {/* 全站唯一一句解释整体结构的旁批。刻意不写「向下滚动」：
              那是把界面的失败写成文案。 */}
          <p className="note hero__note">一条线，中间打个结，最后解开</p>
        </div>

        <div className="hero__foot">
          <p className="hero__sub">{hero.sub}</p>
          <div className="hero__cta">
            <a className="btn" href={CONTACT_HREF}>
              {hero.primaryCta}
            </a>
            <button type="button" className="btn btn--ghost" onClick={() => scrollToId('cases')}>
              {hero.secondaryCta}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
