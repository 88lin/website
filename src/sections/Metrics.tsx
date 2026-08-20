/**
 * EXP.01 读数 · 测量记录。
 *
 * 这章的论点只有一个：这里的每个数都写得出来源。版式借测量记录表的形——
 * 大数字（Fraunces）+ 单位行 + 出处行（等宽、虚线引出线），六张记录
 * 宽度刻意不等（5/4/3 与 3/4/5 对称收口），避免又落回均分卡片网格。
 * 印章只盖一枚，盖在章头：章章都盖就不值钱了。
 */

import { useStagger } from '../lib/motion'
import { metrics, metricsIntro, chapters } from '../content/site'
import { Stamp } from '../components/Ink'
import { AS_OF } from '../content/site'

const SPANS = [5, 4, 3, 3, 4, 5]

export function Metrics() {
  const grid = useStagger<HTMLDivElement>(70)
  const ch = chapters.find((c) => c.id === 'metrics')!

  return (
    <section id="metrics" className="ch ch--metrics" data-tone="alt" aria-labelledby="metrics-h">
      {/* v12：章头与卡片收进 .wrap。v11 这里直接挂在章上，EXP.01 与印章
          被顶到视口两缘裁掉（评审截图里两边的半截就是这么来的） */}
      <div className="wrap">
        <header className="ch-head">
          <s className="ch-no" aria-hidden="true">
            EXP.{ch.no}
          </s>
          <div className="ch-head__txt">
            <h2 id="metrics-h">{metricsIntro.headline}</h2>
            <p>{metricsIntro.body}</p>
          </div>
          <Stamp seed="metrics-stamp" date={AS_OF} className="ch-head__stamp" />
        </header>

        <div className="ruler" aria-hidden="true">
          {Array.from({ length: 41 }, (_, i) => (
            <i key={i} data-major={i % 5 === 0 ? '1' : undefined} />
          ))}
        </div>

        <div className="met-grid" ref={grid}>
          {metrics.map((m, i) => (
            <div className="met" data-stagger="" style={{ '--span': SPANS[i] } as React.CSSProperties} key={m.label}>
              <b className="met__v">{m.value}</b>
              <s className="met__label">{m.label}</s>
              <p className="met__sub">{m.sub}</p>
              <p className="met__src">
                <i aria-hidden="true" />
                {m.source}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
