/**
 * 00 开场。
 *
 * 结构照参考站的分工：满幅光学体承担全部画面，字压在左下的亮区。
 * 顶栏只有一枚标志和三个词 —— 满幅画面上任何一条横线都会把画面切断。
 *
 * 首屏要在三秒内交出三件事：这人前端水准（画面本身就是）、他真做出过能跑的
 * 东西（证据条上四个可核验的数）、怎么联系（CTA 常驻）。
 *
 * 论点里的「交付」「维护」只加字重，不加色也不加底。上一版给它们套了荧光笔
 * 和朱圈，压在灰白的体素上糊成一团 —— 满幅发光画面上，任何贴纸式的强调
 * 都会立刻变脏。
 */

import { AS_OF, CONTACT_HREF, garden, hero, metrics, profile } from '../content/site'
import { useStagger } from '../lib/motion'

/**
 * 证据条的四个数，全部从唯一数据源派生。
 * 小站数量取 garden 数组长度，不写死（v8 在这里写死过一个错的「41」）。
 */
const PROOF = [
  { v: metrics[0].value, l: '累计 Star' },
  { v: metrics[2].value, l: '原创仓库' },
  { v: String(garden.length), l: '在线小站' },
  { v: profile.since, l: '年起持续在做' },
]

export function Hero() {
  const ref = useStagger<HTMLElement>(80)

  return (
    <section className="hero" id="hero" ref={ref}>
      <div className="hero__in">
        <p className="hero__kicker" data-stagger>
          {hero.latin}
        </p>

        <h1 className="hero__h1" data-stagger>
          <span>{hero.line1}</span>
          <span>
            {hero.line2Pre}
            <em>{hero.line2Mark}</em>
            {hero.line2Mid}
            <em>{hero.line2Circle}</em>
          </span>
          <span>{hero.line3}</span>
        </h1>

        <p className="hero__sub" data-stagger>
          {hero.sub}
        </p>

        <div className="hero__acts" data-stagger>
          <a className="btn btn--fill" href={CONTACT_HREF}>
            {hero.primaryCta}
            <i aria-hidden="true">→</i>
          </a>
          <a className="btn btn--line" href="#cases">
            {hero.secondaryCta}
          </a>
        </div>

        <div className="proof" data-stagger>
          {PROOF.map((p) => (
            <span className="proof__i" key={p.l}>
              <b className="proof__v">{p.v}</b>
              <span className="proof__l">{p.l}</span>
            </span>
          ))}
          <span className="proof__as">核实 {AS_OF}</span>
        </div>
      </div>
    </section>
  )
}
