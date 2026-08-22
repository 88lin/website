/**
 * 00 开场。
 *
 * 版式基准来自用户点名认可的四个自有页面（repair / book / components-preview /
 * demo-readme-tutorial）：灰色大写 kicker、得意黑超粗大标题（关键字压实心黄块）、
 * 蓝色一行小标题带虚线下划线、灰正文、蓝实心 + 白描边两枚胶囊，底部四块彩色读数。
 *
 * 这一版把首屏的「手感」补上，三件都不靠图也不靠 3D：
 *  1) 大标题**逐字**揭示（不是整块淡入）：每个字自己从下方浮起并回正，28ms 一个
 *  2) 四个读数从 0 滚到真值（components/Count.tsx）
 *  3) 叠卡跟指针微倾，松手回正（components/Deck.tsx）
 * 上一版这三处都是静态的，判词是「没有特效，没有手感」——判得对。
 */

import { Deck } from '../components/Deck'
import { Count } from '../components/Count'
import { AS_OF, CONTACT_HREF, garden, hero, metrics, profile } from '../content/site'
import { useMagnet, useReveal, useStagger } from '../lib/motion'

/** 四块读数卡。全部从唯一数据源派生；小站数量取 garden 长度，不写死。 */
const STATS = [
  { t: 'blue', v: metrics[0].value, l: metrics[0].label, src: metrics[0].sub },
  { t: 'yellow', v: metrics[2].value, l: metrics[2].label, src: metrics[2].sub },
  { t: 'coral', v: String(garden.length), l: '在线小站', src: '特效 / 工具 / 内容 / 组件四类' },
  { t: 'plain', v: metrics[4].value, l: metrics[4].label, src: metrics[4].sub },
] as const

/**
 * 把一行字拆成逐字的 span，并把序号写进 --i 供 CSS 算延迟。
 * `from` 是这一行在整句里的起始序号，三行连着排，读起来才是一句话被逐字印上去，
 * 而不是三行各自从头再来。空格不包 span：包了会被 inline-block 折掉。
 */
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
            <a className="btn btn--blue" href={CONTACT_HREF} ref={cta}>
              {hero.primaryCta}
              <i aria-hidden="true">→</i>
            </a>
            <a className="btn btn--ghost" href="#cases">
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div data-stagger>
          <Deck />
        </div>
      </div>

      <div className="stats" data-stagger>
        {STATS.map((s) => (
          <div className="stat" data-t={s.t} key={s.l}>
            <b>
              <Count value={s.v} />
            </b>
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
