/**
 * 04 标本馆。四十个还在线上的小站。
 *
 * 版式：六个精选各带一句「为什么挑它」，其余按四类压成一片密集的小胶囊索引。
 * v9 的判断继续有效 —— 四十块彩色底卡铺成一堵墙既看不清也不好看，
 * 而且导航站本来就在做同一件事，剩下的交给它。
 * 这一章的形状是「索引」，不是卡片网格，和作品章的横推轨刻意不撞型。
 */

import { Section } from '../components/Section'
import { garden, gardenFeatured, gardenIntro } from '../content/site'
import { useStagger } from '../lib/motion'

const GROUPS = ['特效', '工具', '内容', '组件'] as const

const TINT: Record<string, string> = {
  特效: 'coral',
  工具: 'blue',
  内容: 'yellow',
  组件: 'teal',
}

export function Garden() {
  const ref = useStagger<HTMLDivElement>(45)
  const picked = new Set(gardenFeatured.map((g) => g.name))

  return (
    <Section id="garden" title={gardenIntro.headline} intro={gardenIntro.body}>
      <div className="picks" ref={ref}>
        {gardenFeatured.map((g) => (
          <a
            className="pick"
            data-t={TINT[g.group]}
            href={g.href}
            target="_blank"
            rel="noreferrer"
            key={g.name}
            data-stagger
          >
            <span className="pick__group">{g.group}</span>
            <span className="pick__name">
              {g.name} <i aria-hidden="true">↗</i>
            </span>
            <span className="pick__why">{g.why}</span>
          </a>
        ))}
      </div>

      <div className="index">
        {GROUPS.map((grp) => {
          const items = garden.filter((g) => g.group === grp && !picked.has(g.name))
          if (!items.length) return null
          return (
            <div className="index__grp" key={grp}>
              <p className="index__label" data-t={TINT[grp]}>
                {grp}
                <s>{garden.filter((g) => g.group === grp).length}</s>
              </p>
              <ul className="index__list">
                {items.map((g) => (
                  <li key={g.name}>
                    <a href={g.href} target="_blank" rel="noreferrer">
                      {g.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="index__more">
        共 {gardenIntro.total} 个，全部入口在
        <a href={gardenIntro.hub} target="_blank" rel="noreferrer">
          {gardenIntro.hubLabel} ↗
        </a>
      </p>
    </Section>
  )
}
