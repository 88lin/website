/**
 * CH.01 读数。
 *
 * 每个读数窗下面都印着这个数是从哪个接口取的。这不是谦虚，是这一屏的
 * 全部论点：作品集里的数字如果不能被第三方重跑一遍，它就只是形容词。
 * 粒子层在这一格会把 4,684 真的解算成字形，读数与场景说的是同一个数。
 */

import { Bay } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { Annot } from '../components/Annot'
import { AS_OF, channels, metrics, metricsIntro } from '../content/site'

const ch = channels[1]

const SPAN = ['readout readout--xl', 'readout readout--wide', 'readout', 'readout', 'readout', 'readout readout--wide']

export function Metrics() {
  return (
    <Bay ch={ch} win={{ x: '62%', y: '3%', w: '34%', h: '18%', tag: 'PARTICLE READOUT', plate: 'ch-01' }}>
      <div className="bay__head">
        <h2 id="ch-01-t" className="bay-title">
          {metricsIntro.headline}
        </h2>
        <span className="silk-label num">CHECKED {AS_OF}</span>
      </div>
      <p className="bay__lede">{metricsIntro.body}</p>

      <div className="metrics__grid">
        {metrics.map((m, i) => (
          <Reveal key={m.label} v="digit" className={`${SPAN[i]} plate`}>
            <div>
              <div className="readout__v">
                {i === 0 ? (
                  <Annot k="metric-star" note="Σ 22 个原创仓库" place="right">
                    {m.value}
                  </Annot>
                ) : (
                  m.value
                )}
              </div>
              <div className="readout__l">{m.label}</div>
              <div className="readout__s">{m.sub}</div>
            </div>
            <div className="readout__src">{m.source}</div>
          </Reveal>
        ))}

        <Reveal v="digit" className="readout readout--wide well">
          <div>
            <div className="silk-label">自己重跑一遍</div>
            <p className="readout__s" style={{ color: 'inherit', opacity: 0.78 }}>
              上面六个数没有一个是手填的。想核实的话，这两条命令就够了。
            </p>
          </div>
          <pre className="readout__src" style={{ whiteSpace: 'pre-wrap', color: 'inherit', opacity: 0.86 }}>
            {'curl -s api.github.com/users/88lin\ncurl -s api.github.com/users/88lin/repos?per_page=100'}
          </pre>
        </Reveal>
      </div>
    </Bay>
  )
}
