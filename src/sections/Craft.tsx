/**
 * 04 手艺 · 交汇图。
 *
 * 这一章一张卡都不用做主角。前面两章连着两屏都是卡了，再堆一屏卡，
 * 六章就又变成一个模子。这里的主角是一张几何图：两条主线朝同一个点收。
 * 收敛这件事本身就是论点，所以它必须是画出来的，不是写出来的。
 *
 * 四个部分各回答一件事：
 *  1) 两条线为什么会交在一起（那张收敛图 + 一句手写旁批）。
 *  2) 每条线上具体在做什么（左右两栏，各三件）。
 *  3) 手上有什么（36 项跑马灯，不是徽章墙，也不是横滚章）。
 *  4) 前面所有数字的口径（一张表，值、名、限定、接口路径四列）。
 *
 * 零位图：两处实物用现画的矢量代替截图。左边是设计系统 A 组色板的八个主色，
 * 右边是导航站四类小站的节点图，节点数就是 garden 里的真实条目数。
 */

import { ArrowOut } from '../components/Icons'
import { Annot } from '../components/Ink'
import {
  craftEvidence,
  garden,
  metrics,
  stack,
  trackA,
  trackB,
  tracksIntro,
  type GardenGroup,
} from '../content/site'
import { useStagger } from '../lib/motion'

const ALL = stack.clusters.flatMap((c) => c.items)
/** 跑马灯靠 translate3d(-50%) 循环，所以内容必须是严格的两份。 */
const BELT = [...ALL, ...ALL]

const GROUPS: GardenGroup[] = ['特效', '工具', '内容', '组件']
const COUNT = GROUPS.map((g) => garden.filter((x) => x.group === g).length)

/** 设计系统 A 组 Classic 的八个主色，取自 palettes.css，不另配色值。 */
const SWATCH = [
  '--brand',
  '--brand-deep',
  '--highlight',
  '--warning',
  '--pop',
  '--pop-deep',
  '--ink',
  '--cream-dark',
]

/** 四个簇的锚点，顺序与 GROUPS 一致。 */
const ANCHOR = [
  [50, 26],
  [270, 26],
  [50, 94],
  [270, 94],
]

const FILL = ['var(--brand-deep)', 'var(--pop-deep)', 'var(--warning)', 'var(--ink)']

/** 把 n 个点摆成每行 5 个的小方阵，围着锚点居中。 */
function cluster(cx: number, cy: number, n: number) {
  const rows = Math.ceil(n / 5)
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < n; i += 1) {
    const r = Math.floor(i / 5)
    const inRow = Math.min(5, n - r * 5)
    const c = i % 5
    out.push({
      x: cx + (c - (inRow - 1) / 2) * 10,
      y: cy + (r - (rows - 1) / 2) * 10,
    })
  }
  return out
}

function Swatches() {
  return (
    <svg
      className="craft__sw"
      viewBox="0 0 320 56"
      role="img"
      aria-label="设计系统 A 组 Classic 的八个主色"
    >
      {SWATCH.map((v, i) => (
        <rect
          key={v}
          x={2 + i * 40}
          y={6}
          width={36}
          height={44}
          rx={6}
          fill={`var(${v})`}
          stroke="currentColor"
          strokeOpacity="0.16"
        />
      ))}
    </svg>
  )
}

function HubGraph() {
  const total = COUNT.reduce((a, b) => a + b, 0)
  const label = GROUPS.map((g, i) => `${g} ${COUNT[i]}`).join('，')
  return (
    <svg
      className="craft__sw"
      viewBox="0 0 320 120"
      role="img"
      aria-label={`导航站收录 ${total} 个小站，分四类：${label}`}
    >
      {ANCHOR.map(([x, y], i) => (
        <line
          key={`l${i}`}
          x1={160}
          y1={60}
          x2={x}
          y2={y}
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="2"
        />
      ))}
      {ANCHOR.map(([x, y], i) =>
        cluster(x, y, COUNT[i]).map((p, j) => (
          <circle key={`d${i}-${j}`} cx={p.x} cy={p.y} r="3.6" fill={FILL[i]} />
        )),
      )}
      <circle cx="160" cy="60" r="10" fill="var(--ink)" />
    </svg>
  )
}

export function Craft() {
  const rows = useStagger<HTMLDivElement>(55)

  return (
    <section id="craft" className="ch ch--craft" data-tone="yellow" aria-labelledby="craft-h">
      <div className="wrap">
        <div className="craft__head">
          <p className="eyebrow">TWO TRACKS</p>
          <h2 className="ch-title" id="craft-h">
            {tracksIntro.headline}
          </h2>
          <p className="ch-lede">{tracksIntro.body}</p>
        </div>

        <div className="craft__join">
          <div className="craft__joinlab">
            <span>{trackA.title}</span>
            <span>{trackB.title}</span>
          </div>
          <svg className="craft__joinsvg" viewBox="0 0 1200 170" aria-hidden="true">
            <path className="ln ln-b" d="M 60 16 C 240 60 420 110 588 148" />
            <path className="ln ln-c" d="M 1140 16 C 960 60 780 110 612 148" />
            <circle className="dot" cx="60" cy="16" r="7" />
            <circle className="dot" cx="238" cy="61" r="7" />
            <circle className="dot" cx="413" cy="106" r="7" />
            <circle className="dot" cx="1140" cy="16" r="7" />
            <circle className="dot" cx="962" cy="61" r="7" />
            <circle className="dot" cx="787" cy="106" r="7" />
            <circle className="hub" cx="600" cy="152" r="12" />
          </svg>
          <Annot seed="craft-join">
            交点只有一条：能力可以不确定，接口和退路必须确定
          </Annot>
        </div>

        <div className="craft__cross">
          {[trackA, trackB].map((t) => (
            <div className="craft__trk" key={t.id}>
              <h3>{t.title}</h3>
              <dl>
                {t.items.map((it) => (
                  <div key={it.id}>
                    <dt>{it.title}</dt>
                    <dd>{it.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="craft__kit">
          <ul className="craft__belt">
            {BELT.map((s, i) => (
              <li className="chip" key={`${s}-${i}`} aria-hidden={i >= ALL.length || undefined}>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="craft__evd">
          {craftEvidence.map((e) => (
            <div className="slab craft__card" data-card="" key={e.id}>
              <h3>{e.title}</h3>
              <p>{e.caption}</p>
              {e.id === 'ds' ? <Swatches /> : <HubGraph />}
              <a className="craft__more" href={e.href} target="_blank" rel="noreferrer noopener">
                {e.linkLabel} <ArrowOut />
              </a>
            </div>
          ))}
        </div>

        <div className="craft__cal">
          <h3>每个数从哪来</h3>
          <div className="craft__rows" ref={rows}>
            {metrics.map((m) => (
              <div className="craft__row rise" data-stagger="" key={m.label}>
                <b className="craft__rv">{m.value}</b>
                <span className="craft__rl">{m.label}</span>
                <span className="craft__rs">{m.sub}</span>
                <code className="craft__ro">{m.source}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
