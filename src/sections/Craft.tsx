/**
 * 02 主线。两条线 + 一个交点，再把它们翻成三件可以直接开工的活。
 *
 * 版式：左右两栏各三条，中间一条虚线竖轴，轴中央钉一枚「交点」圆章。
 * 这个装置只在这一章出现 —— 章间不许撞型，撞了就回炉。
 *
 * 下半的三件活换掉了卡片网格。上一版是三张白卡 + 顶边染色，被判「千篇一律卡片网格」，
 * 判得对：三张一样的盒子并排，信息只在第一张里，后两张只剩形状。
 *
 * 这一版排成一张规格表：**按行渲染，不按列渲染**。于是编号、标题、说明、交付物、
 * 适合谁五条横线贯穿三列，三件活可以逐行对着读——这才是「三件事并列」该有的读法。
 * 没有卡，只有对齐。
 */

import { Section } from '../components/Section'
import { services, servicesIntro, trackA, trackB, tracksIntro } from '../content/site'
import { useReveal, useStagger } from '../lib/motion'

function Track({ track, side }: { track: typeof trackA; side: 'a' | 'b' }) {
  return (
    <div className="track" data-side={side}>
      <p className="track__head">
        <b>{track.id}</b>
        <span>{track.title}</span>
      </p>
      <ul className="track__list">
        {track.items.map((it) => (
          <li key={it.id} data-stagger>
            <h4>{it.title}</h4>
            <p>{it.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 规格表的五行。逐行取值，所以三列天然对齐。 */
const SPEC_ROWS = [
  { key: 'head', label: '' },
  { key: 'body', label: '做什么' },
  { key: 'del', label: '交付物' },
  { key: 'fit', label: '适合谁' },
] as const

export function Craft() {
  const ref = useStagger<HTMLDivElement>(60)
  /* 黄底论点自己一个揭示器：它在章中段，不该跟着章顶的级联一起提前放出来。 */
  const thesis = useReveal<HTMLParagraphElement>()

  return (
    <Section id="craft" title={tracksIntro.headline} intro={tracksIntro.body}>
      <div className="tracks" ref={ref}>
        <Track track={trackA} side="a" />
        <div className="tracks__axis" aria-hidden="true">
          <span className="tracks__joint">交点</span>
        </div>
        <Track track={trackB} side="b" />
      </div>

      <p className="thesis" data-stagger="mask" ref={thesis}>
        {tracksIntro.thesis}
      </p>

      <div className="svc-head">
        <h3 className="svc-head__t">{servicesIntro.headline}</h3>
        <p className="svc-head__b">{servicesIntro.body}</p>
      </div>

      <div className="spec">
        {SPEC_ROWS.map((row) => (
          <div className="spec__row" data-r={row.key} key={row.key}>
            <p className="spec__k">{row.label}</p>
            {services.map((s) => (
              <div className="spec__c" data-t={s.tint} key={s.id}>
                {row.key === 'head' && (
                  <>
                    <b className="spec__no">{s.no}</b>
                    <h4 className="spec__t">{s.title}</h4>
                  </>
                )}
                {row.key === 'body' && <p className="spec__b">{s.body}</p>}
                {row.key === 'del' && (
                  <ul className="spec__del">
                    {s.deliverables.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
                {row.key === 'fit' && <p className="spec__fit">{s.fit}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}
