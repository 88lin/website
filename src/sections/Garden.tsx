/**
 * 04 标本馆。四十个还在线上的小站。
 *
 * 上一版是「六张精选卡 + 一片小胶囊索引」，六张卡就是标准的 3×2 卡片网格
 * ——被点名的「千篇一律卡片网格」正是这一块。
 *
 * 这一版整章改成馆藏目录：
 *  左侧是四类的**排字目录**，四十条全在里面，一行一行流下来，
 *  被挑中的那六条字号大一档并带一枚序号标记；
 *  右侧是这六条的旁注，序号一一对应，写清为什么挑它。
 *
 * 目录 + 旁注是纸本书的排法，一个盒子都不需要，也和别的章不撞型
 * （案例是三列账目、主线是规格表、作品是横推轨）。四十条链接一条没少。
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

/** 圈号。六个精选与右侧旁注靠它对应，不用「*」也不用上标数字。 */
const MARKS = ['①', '②', '③', '④', '⑤', '⑥']

export function Garden() {
  const ref = useStagger<HTMLDivElement>(45)
  const markOf = new Map(gardenFeatured.map((g, i) => [g.name, MARKS[i] ?? '·']))

  return (
    <Section id="garden" title={gardenIntro.headline} intro={gardenIntro.body}>
      <div className="cat" ref={ref}>
        <div className="cat__index">
          {GROUPS.map((grp) => {
            const items = garden.filter((g) => g.group === grp)
            return (
              <section className="cat__grp" key={grp} data-stagger>
                <h3 className="cat__label" data-t={TINT[grp]}>
                  {grp}
                  <s>{String(items.length).padStart(2, '0')}</s>
                </h3>
                <ul className="cat__list">
                  {items.map((g) => {
                    const mark = markOf.get(g.name)
                    return (
                      <li key={g.name} data-pick={mark ? '1' : undefined}>
                        <a href={g.href} target="_blank" rel="noreferrer">
                          {g.name}
                          {mark && <sup aria-hidden="true">{mark}</sup>}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>

        <aside className="cat__notes" data-stagger>
          <p className="cat__nh">挑六个说说为什么</p>
          <ol className="cat__ol">
            {gardenFeatured.map((g, i) => (
              <li key={g.name}>
                <b aria-hidden="true">{MARKS[i]}</b>
                <span>
                  <a href={g.href} target="_blank" rel="noreferrer">
                    {g.name} ↗
                  </a>
                  <s>{g.why}</s>
                </span>
              </li>
            ))}
          </ol>

          <p className="cat__more">
            共 {gardenIntro.total} 个，全部入口在
            <a href={gardenIntro.hub} target="_blank" rel="noreferrer">
              {gardenIntro.hubLabel} ↗
            </a>
          </p>
        </aside>
      </div>
    </Section>
  )
}
