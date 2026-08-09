/**
 * 05 花园。
 *
 * 全站唯一的高密度区：四十枚大小不等的胶囊紧排换行，四类各有自己的字号、
 * 内距与配色。密度本身就是内容——「顺手做的小东西」这件事，列表说不出来，
 * 一屏挤满四十个才说得出来。
 *
 * 组名只在每组第一枚上出现一次。四十枚各挂一个标签就成了噪声，出现四次
 * 刚好能把马赛克读成四段。
 */

import { garden, gardenIntro } from '../content/site'
import { cssv } from '../lib/css'
import { ArrowOut } from '../components/Icons'

export function Garden() {
  return (
    <section
      id="garden"
      className="ch ch-garden"
      data-tone="peach"
      data-edge="wedge"
      style={cssv({ '--bleed': 'var(--brand-deep)' })}
    >
      <div className="wrap">
        <div className="garden__head">
          <h2 className="hd">{gardenIntro.headline}</h2>
          <p className="lede">{gardenIntro.body}</p>
        </div>

        <div className="garden__grid">
          {garden.map((g, i) => (
            <a
              key={g.href}
              className="seed"
              data-group={g.group}
              href={g.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {g.name}
              {i === 0 || garden[i - 1].group !== g.group ? <em>{g.group}</em> : null}
            </a>
          ))}
        </div>

        <div className="garden__foot">
          <a className="btn" href={gardenIntro.hub} target="_blank" rel="noreferrer noopener">
            {gardenIntro.hubLabel}
            <ArrowOut />
          </a>
          <span className="tag">共 {garden.length} 个，全部在线</span>
        </div>
      </div>
    </section>
  )
}
