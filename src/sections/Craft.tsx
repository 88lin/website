/**
 * 04 手艺 · 无卡片。
 *
 * 这一章一张卡都不用。前面三章已经连着三屏都是卡了，再堆一屏卡，
 * 六章就又变成一个模子。这里只有三种东西：超大的数字、两列文字、两条描线。
 * 分组靠留白和发丝线，不靠盒子。
 *
 * 三个部分各自回答一件事：
 *  1) 数字带出处。每个数下面写着它从哪个接口取的，你可以自己拉一遍。
 *  2) 两条主线朝一个点收。收敛这件事本身就是论点，所以画成两条描线。
 *  3) 技术栈是跑马灯，不是徽章墙。36 项摊平了铺满一屏没人会读。
 *
 * 用户点名说 v6 这一章「文字被遮挡，颜色也不好看」：遮挡来自浮在卡上的
 * 手写胶囊（这里没有浮层，两条描线在自己的行里），颜色来自一整章同色松绿
 * （这里是黄底 + 深蓝描线 + 墨字）。
 */

import { ArrowOut } from '../components/Icons'
import { Circle } from '../components/Ink'
import { Shot } from '../components/Shot'
import { craftEvidence, metrics, stack, trackA, trackB, tracksIntro } from '../content/site'
import { useReveal, useStagger } from '../lib/motion'

/** 12 栏里的跨度。刻意不等宽：等宽六格就是一张表格。 */
const SPAN = [5, 4, 3, 3, 4, 5]

const ROW_A = [...stack.clusters[0].items, ...stack.clusters[1].items]
const ROW_B = [...stack.clusters[2].items, ...stack.clusters[3].items]

function Marquee({ items, dir }: { items: string[]; dir: 'l' | 'r' }) {
  return (
    <div className="mq">
      <div className="mq__row" data-dir={dir}>
        {items.map((s) => (
          <span className="chip" key={s}>
            {s}
          </span>
        ))}
        <span className="mq__dup" aria-hidden="true">
          {items.map((s) => (
            <span className="chip" key={s}>
              {s}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

export function Craft() {
  const nums = useStagger<HTMLUListElement>(80)
  const join = useReveal<SVGSVGElement>('-18% 0px -18% 0px')

  return (
    <section id="craft" className="ch ch--craft" data-tone="yellow" aria-labelledby="craft-h">
      <div className="wrap">
        <p className="eyebrow">CRAFT</p>
        <h2 className="ch-title" id="craft-h">
          {tracksIntro.headline}
        </h2>
        <p className="ch-lede">{tracksIntro.body}</p>

        <ul className="nums" ref={nums}>
          {metrics.map((m, i) => (
            <li className="num rise" data-stagger="" key={m.label} style={{ gridColumn: `span ${SPAN[i]}` }}>
              <b className="num__v">{m.value}</b>
              <span className="num__l">{m.label}</span>
              <span className="num__s">{m.sub}</span>
              <code className="num__src">{m.source}</code>
            </li>
          ))}
        </ul>

        <div className="cross">
          {[trackA, trackB].map((t) => (
            <div className="cross__col" key={t.id}>
              <h3 className="cross__t">{t.title}</h3>
              <ul>
                {t.items.map((it) => (
                  <li key={it.id}>
                    <h4>{it.title}</h4>
                    <p>{it.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* pathLength=1 让 CSS 能用 stroke-dasharray:1 描线，不必知道真实弧长 */}
        <svg
          className="join"
          viewBox="0 0 1200 150"
          preserveAspectRatio="none"
          aria-hidden="true"
          data-annot=""
          ref={join}
        >
          <path className="join__p" pathLength={1} d="M 70 2 C 300 40 470 96 596 140" />
          <path className="join__p" pathLength={1} d="M 1130 2 C 900 40 730 96 604 140" />
          <circle className="join__d" cx="600" cy="143" r="7" />
        </svg>

        <p className="join__say">
          交点是同一件事：把不确定的能力，接进确定的
          <Circle seed="craft-cross">工程约束</Circle>里。
        </p>

        <div className="kit">
          <p className="kit__legend">
            {stack.clusters.map((c) => c.title).join(' / ')}
          </p>
          <Marquee items={ROW_A} dir="l" />
          <Marquee items={ROW_B} dir="r" />
        </div>

        <div className="ev">
          {craftEvidence.map((e) => (
            <a className="ev__i" href={e.href} target="_blank" rel="noreferrer noopener" key={e.cover}>
              <Shot cover={e.cover} alt={e.alt} ratio="21 / 8" sizes="(max-width: 900px) 92vw, 44vw" />
              <span className="ev__c">
                {e.caption} <ArrowOut />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
