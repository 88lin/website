/**
 * 03 作品。
 *
 * 全站唯一的横向章节：跑道（.works__rail）的高度就是横移的行程，sticky 把内容
 * 钉在视口，scrub 把轨道从 0 拉到 -distance。**不用 ScrollTrigger 的 pin**——
 * pin 会插一个 pin-spacer，和 lenis 与 body 的 overflow-x:clip 打架。
 *
 * 卡片宽度是数据：--span 取 log10(star+1)/log10(4582)。4581 star 那张最宽，
 * 0 star 那张最窄。这比在卡上印一行「热门」诚实得多。
 *
 * JS 没接管时（手机、减弱动效、脚本挂了）跑道高度是 auto，轨道退回原生横滑
 * 加吸附——功能一样，只是不跟着滚动走。
 */

import { useCallback, useRef } from 'react'
import { projects, worksIntro } from '../content/site'
import { cssv } from '../lib/css'
import { useLazyScene, useMediaQuery, worksPan, type SceneApi } from '../lib/motion'

/** 只有宽屏 + 精确指针才把横滑换成 scrub 横推。触屏上原生横滑永远更跟手，
 *  窄屏上把一屏高的 sticky 跑道塞进去只会让人以为页面卡住了。 */
const PAN_MQ = '(min-width: 900px) and (pointer: fine)'

const SPAN_MAX = Math.log10(4582)
const spanOf = (stars: number) => (stars <= 0 ? 0 : Math.min(1, Math.log10(stars + 1) / SPAN_MAX))

/** 千分位。不用 toLocaleString：预渲染在 Node、水合在浏览器，两边的 ICU 未必一致。 */
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export function Works() {
  const railRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const build = useCallback(({ gsap }: SceneApi) => {
    const rail = railRef.current
    const track = trackRef.current
    if (!rail || !track) return
    // 接管成功才关掉原生横滑，失败就什么都不做，用户照样能拖
    rail.classList.add('js-pan')
    worksPan(gsap, rail, track)
    return () => {
      rail.classList.remove('js-pan')
      rail.style.height = ''
    }
  }, [])

  useLazyScene(railRef, build, useMediaQuery(PAN_MQ))

  return (
    <section
      id="works"
      className="ch ch-works ch--open"
      data-tone="berry"
      data-edge="fade"
      style={cssv({ '--bleed': 'var(--pop)' })}
    >
      <div className="works__rail" ref={railRef}>
        <div className="works__pin">
          <div className="wrap works__head">
            <h2 className="hd">{worksIntro.headline}</h2>
            <p className="lede">{worksIntro.body}</p>
            <p className="tag works__hint">六路按 star 排 · 卡片链到仓库</p>
          </div>

          <div className="works__scroller">
            <div className="works__track" ref={trackRef}>
              {projects.map((p) => (
                <a
                  key={p.slug}
                  className="work"
                  data-tint={p.tone}
                  style={cssv({ '--span': spanOf(p.stars) })}
                  href={p.repo}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <div className="work__top">
                    <span className="work__stars">
                      {group(p.stars)}
                      <small>star</small>
                    </span>
                    <span className="tag">{p.year}</span>
                  </div>
                  <div>
                    <h3 className="work__name">{p.name}</h3>
                    <span className="work__cn">{p.cn}</span>
                  </div>
                  <p className="work__blurb">{p.blurb}</p>
                  <div className="work__foot">
                    {p.stack.map((s) => (
                      <span className="chip" key={s}>
                        {s}
                      </span>
                    ))}
                    <span className="lamp" data-state={p.state}>
                      <i />
                      {p.state === 'live' ? '在线' : '维护中'}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
