/**
 * CH.03 作品。
 *
 * 六路插件横着排在一条轨道上，用拖的。竖着堆成网格是最省事的做法，
 * 但机架上的插件本来就是横向并排卡进去的，而且横向轨道会逼着人做一个
 * 动作——它比一屏就能扫完的网格更容易被记住。
 *
 * 卡片的颜色不是左边一道彩色竖条（那是模板做法），是整块底色。
 */

import { useCallback, useRef } from 'react'
import { Bay, State } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { IconOut } from '../components/Icons'
import { channels, projects, worksIntro } from '../content/site'

const ch = channels[3]

/** 鼠标拖动轨道。触摸与触控板本来就能滑，这里只补鼠标。 */
function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const st = useRef<{ x: number; l: number } | null>(null)

  const down = useCallback((e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType === 'touch') return
    st.current = { x: e.clientX, l: el.scrollLeft }
    el.setPointerCapture(e.pointerId)
  }, [])

  const move = useCallback((e: React.PointerEvent) => {
    const el = ref.current
    const s = st.current
    if (!el || !s) return
    el.scrollLeft = s.l - (e.clientX - s.x)
  }, [])

  const up = useCallback((e: React.PointerEvent) => {
    const el = ref.current
    if (!el || !st.current) return
    st.current = null
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  }, [])

  return { ref, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up }
}

export function Works() {
  const drag = useDragScroll<HTMLDivElement>()

  return (
    <Bay ch={ch} win={{ x: '64%', y: '11%', w: '32%', h: '27%', tag: 'RACK BUS', plate: 'ch-03' }}>
      <div className="bay__head">
        <h2 id="ch-03-t" className="bay-title">
          {worksIntro.headline}
        </h2>
        <span className="silk-label num">6 SLOTS</span>
      </div>
      <p className="bay__lede">{worksIntro.body}</p>

      <Reveal v="slide" className="works__rail">
        <div className="track" {...drag} tabIndex={0} role="group" aria-label="作品，可横向拖动">
          <div className="track__inner">
            {projects.map((p) => (
              <article className="track__item card plate" data-ground={p.tone} key={p.slug}>
                <div className="card__top">
                  <div>
                    <div className="card__name">{p.name}</div>
                    <div className="card__cn">{p.cn}</div>
                  </div>
                  <State value={p.state} />
                </div>
                <p className="card__blurb">{p.blurb}</p>
                <div className="card__nums num">
                  <span>
                    {p.stars.toLocaleString('en-US')} <small>Star</small>
                  </span>
                  <span>
                    {p.forks.toLocaleString('en-US')} <small>Fork</small>
                  </span>
                  <span>
                    {p.year} <small>{p.kind}</small>
                  </span>
                </div>
                <div className="card__tags">
                  {p.stack.map((s) => (
                    <span className="chip" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="card__acts">
                  {p.live ? (
                    <a href={p.live} target="_blank" rel="noreferrer noopener">
                      在线 <IconOut />
                    </a>
                  ) : null}
                  <a href={p.repo} target="_blank" rel="noreferrer noopener">
                    源码 <IconOut />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Reveal>
    </Bay>
  )
}
