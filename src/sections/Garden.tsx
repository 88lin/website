/**
 * CH.05 花园。
 *
 * 41 个小页面。做成卡片墙会占掉三屏还什么都记不住，所以压成排版密集的
 * 分栏名录——它的信息密度本身就是内容：这个人一直在做东西。
 * 一组接一组亮起来，不是整块淡入。
 */

import { Bay } from '../components/Bay'
import { channels, garden, gardenIntro, type GardenGroup } from '../content/site'
import { IconOut } from '../components/Icons'
import { useStagger } from '../lib/motion'

const ch = channels[5]
const GROUPS: GardenGroup[] = ['特效', '工具', '内容', '组件']

export function Garden() {
  const flow = useStagger<HTMLDivElement>(90)

  return (
    <Bay ch={ch} win={{ x: '4%', y: '58%', w: '24%', h: '30%', tag: 'GARDEN FEED', plate: 'ch-05' }}>
      <div className="garden__grid">
        <div>
          <div className="bay__head">
            <h2 id="ch-05-t" className="bay-title">
              {gardenIntro.headline}
            </h2>
          </div>
          <p className="bay__lede">{gardenIntro.body}</p>
          <p style={{ marginTop: 'calc(var(--unit) * 3)' }}>
            <a className="btn btn--panel" href={gardenIntro.hub} target="_blank" rel="noreferrer noopener">
              {gardenIntro.hubLabel}
              <IconOut />
            </a>
          </p>
        </div>

        <div className="garden__flow" data-reveal="cascade" ref={flow}>
          {GROUPS.map((g) => {
            const items = garden.filter((it) => it.group === g)
            return (
              <div className="garden__set" data-stagger key={g}>
                <h4>
                  {g}
                  <span className="num" style={{ opacity: 0.6 }}>
                    {items.length}
                  </span>
                </h4>
                {items.map((it) => (
                  <a href={it.href} target="_blank" rel="noreferrer noopener" key={it.href}>
                    {it.name}
                  </a>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </Bay>
  )
}
