/**
 * CH.06 装备。
 *
 * 不做徽章墙。四组端子卡在一条虚拟的 DIN 导轨上，逐列往下错开一档，
 * 每一项前面是一枚方形接点——它读起来像一张接线清单，而不是一面奖状墙。
 */

import { Bay, Lamp } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { channels, stack } from '../content/site'

const ch = channels[6]

export function Stack() {
  return (
    <Bay ch={ch}>
      <div className="bay__head">
        <h2 id="ch-06-t" className="bay-title">
          {stack.headline}
        </h2>
        <span className="silk-label num">{stack.clusters.reduce((n, c) => n + c.items.length, 0)} TERMINALS</span>
      </div>
      <p className="bay__lede">{stack.body}</p>

      <div className="stack__grid">
        {stack.clusters.map((c) => (
          <Reveal v="latch" as="section" className="term plate" key={c.id}>
            <h3 className="term__hd">
              <Lamp state="live" live />
              {c.title}
            </h3>
            <ul>
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Bay>
  )
}
