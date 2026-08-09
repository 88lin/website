/**
 * 01 读数。
 *
 * 六个数字沿一条约 8° 的斜基线错落下落，字号各不相同——**大小本身就是数据**：
 * 权重 --w 取 log10(n+1)/log10(5000)，四千六百八十四和二十二不该长一样大。
 * 用对数不用线性，否则除了第一个数其余五个会全部塌成同一档小字。
 *
 * 每条都挂着它的取数接口。没有出处的数字在这一屏里不存在。
 */

import { metrics, metricsIntro } from '../content/site'
import { cssv } from '../lib/css'

/** 4,684 → 4684。字符串里的千分位逗号只是排版，不是数值。 */
const weightOf = (value: string) => {
  const n = parseFloat(value.replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(1, Math.log10(n + 1) / Math.log10(5000))
}

export function Metrics() {
  return (
    <section
      id="metrics"
      className="ch ch-metrics"
      data-tone="peach"
      data-edge="wedge"
      style={cssv({ '--bleed': 'var(--brand-deep)' })}
    >
      <div className="wrap">
        <div className="metrics__top">
          <p className="note">数字会过期，出处不会</p>
          <div>
            <h2 className="hd">{metricsIntro.headline}</h2>
            <p className="lede">{metricsIntro.body}</p>
          </div>
        </div>

        <ol className="metrics__list">
          {metrics.map((m, i) => (
            <li key={m.label} className="metric" style={cssv({ '--i': i, '--w': weightOf(m.value) })}>
              <span className="num metric__v">{m.value}</span>
              <span className="metric__meta">
                <b className="metric__label">{m.label}</b>
                <span className="metric__sub">{m.sub}</span>
                <span className="metric__src">{m.source}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
