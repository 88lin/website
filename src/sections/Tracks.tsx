/**
 * CH.02 主线。
 *
 * 两条业务线不用左右并排的对称卡片讲——那是 PPT 的讲法。这里中间留一条
 * 96px 的总线槽，两侧各自把线接进去，接点是一枚实心圆端子。右侧整体下沉
 * 一档，让两栏错开：对称会让人以为两件事一样重，其实它们是先后关系。
 */

import { Bay, Lamp } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { channels, trackA, trackB, tracksIntro } from '../content/site'

const ch = channels[2]

export function Tracks() {
  return (
    <Bay ch={ch}>
      <div className="bay__head">
        <h2 id="ch-02-t" className="bay-title">
          {tracksIntro.headline}
        </h2>
        <span className="silk-label">A / B</span>
      </div>
      <p className="bay__lede">{tracksIntro.body}</p>

      <div className="tracks__grid">
        <Reveal v="wire-l" className="trk">
          <div className="trk__hd">
            <Lamp state="live" live />
            <span className="silk-label">TRACK A</span>
            <span className="sub-title">{trackA.title}</span>
          </div>
          {trackA.items.map((it) => (
            <div className="trk__item silk" key={it.id}>
              <h4>{it.title}</h4>
              <p>{it.body}</p>
            </div>
          ))}
        </Reveal>

        <Reveal v="wire-c" className="bus" aria-hidden>
          <svg viewBox="0 0 96 420" preserveAspectRatio="none">
            <path
              d="M0 76 C 40 76, 48 132, 48 210"
              stroke="var(--fg)"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
            <path
              d="M96 168 C 56 168, 48 176, 48 210"
              stroke="var(--fg)"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            />
            <path
              d="M48 210 L 48 420"
              stroke="var(--fg)"
              vectorEffect="non-scaling-stroke"
              opacity="0.32"
            />
          </svg>
          <span className="bus__cross">
            交点
            <br />
            CROSS
          </span>
        </Reveal>

        <Reveal v="wire-r" className="trk trk--b">
          <div className="trk__hd">
            <Lamp state="live" live />
            <span className="silk-label">TRACK B</span>
            <span className="sub-title">{trackB.title}</span>
          </div>
          {trackB.items.map((it) => (
            <div className="trk__item silk" key={it.id}>
              <h4>{it.title}</h4>
              <p>{it.body}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </Bay>
  )
}
