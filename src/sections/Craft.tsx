/** 04 主线：两条线 + 交点圆章 + 黄底论点，章尾接技术栈词表。 */

import { Section } from '../components/Section'
import { stack, trackA, trackB, tracksIntro } from '../content/site'
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
        <h3 className="svc-head__t">{stack.headline}</h3>
        <p className="svc-head__b">{stack.body}</p>
      </div>

      <dl className="kit">
        {stack.clusters.map((c) => (
          <div className="kit__row" key={c.id}>
            <dt>{c.title}</dt>
            <dd>
              <ul>
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
