/**
 * 02 主线。两条线 + 一个交点，再把它们翻成三件可以直接开工的活。
 *
 * 版式：左右两栏各三条，中间一条虚线竖轴，轴中央钉一枚「交点」圆章。
 * 这个装置只在这一章出现 —— 章间不许撞型，撞了就回炉。
 *
 * 下半是三张服务卡，各自一个色相（珊瑚 / 蓝 / 柠檬），只染顶边与编号，
 * 卡面永远是白的。写清交付物与适合谁，不写「提供技术支持」这种话。
 */

import { Section } from '../components/Section'
import { services, servicesIntro, trackA, trackB, tracksIntro } from '../content/site'
import { useStagger } from '../lib/motion'

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

export function Craft() {
  const ref = useStagger<HTMLDivElement>(60)

  return (
    <Section id="craft" title={tracksIntro.headline} intro={tracksIntro.body}>
      <div className="tracks" ref={ref}>
        <Track track={trackA} side="a" />
        <div className="tracks__axis" aria-hidden="true">
          <span className="tracks__joint">交点</span>
        </div>
        <Track track={trackB} side="b" />
      </div>

      <div className="svc-head">
        <h3 className="svc-head__t">{servicesIntro.headline}</h3>
        <p className="svc-head__b">{servicesIntro.body}</p>
      </div>

      <div className="svcs">
        {services.map((s) => (
          <article className="svc" data-t={s.tint} key={s.id} data-stagger>
            <p className="svc__no">{s.no}</p>
            <h4 className="svc__t">{s.title}</h4>
            <p className="svc__b">{s.body}</p>
            <ul className="svc__del">
              {s.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="svc__fit">{s.fit}</p>
          </article>
        ))}
      </div>
    </Section>
  )
}
