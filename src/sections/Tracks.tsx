import { useEffect, useRef } from 'react'
import { tracksIntro, trackA, trackB, type Track } from '../content/site'
import { gsap, revealLines, fadeUp, ScrollTrigger } from '../lib/motion'
import { useScene, CLUSTER_FOV } from '../webgl/StageContext'

/* 圆窗中心固定在视口宽度的这个比例上。版面把右侧五列整个让出来当通道，
   圆窗从上往下穿过时不会压到任何文字。晶簇的世界坐标由这个比例反解出来，
   所以任何宽高比下窗口和窗口里的东西都不会分家。 */
const PORT_FRAC = 0.795
const PORT_CAM_Z = 5.4

function portWorldX(vw: number, vh: number) {
  const halfH = PORT_CAM_Z * Math.tan(((CLUSTER_FOV / 2) * Math.PI) / 180)
  return (PORT_FRAC - 0.5) * 2 * halfH * (vw / vh)
}

function Group({ kicker, items }: { kicker: string; items: Track[] }) {
  return (
    <div className="track-group">
      <h3 className="eyebrow border-b border-paper/30 pb-3 text-paper/88">{kicker}</h3>
      <ul className="mt-8 space-y-8">
        {items.map((t) => (
          <li key={t.id} className="track-item grid grid-cols-1 gap-x-6 gap-y-2 opacity-0 sm:grid-cols-12">
            <h4 className="display text-[clamp(1.25rem,1.6vw,1.5rem)] leading-[1.3] tracking-[-0.018em] text-paper sm:col-span-5">
              {t.title}
            </h4>
            <p className="text-[1rem] leading-[1.75] text-paper/88 sm:col-span-7">{t.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Tracks() {
  const ref = useRef<HTMLElement>(null)

  // 这一屏是整片钴蓝，只有圆窗透出画布，所以晶簇缩小到刚好填满窗口，
  // aura 调大让辉光撑满整个窗口，否则窗口里就是一片米色。
  useScene(
    ref,
    (vw, vh) => ({
      clusterX: portWorldX(vw, vh),
      clusterY: 0,
      clusterScale: 0.34,
      spread: 0.85,
      spin: 0.26,
      tilt: 0,
      dispersion: 7.0,
      glow: 1.55,
      tint: 0.12,
      aura: 1.7,
      camZ: PORT_CAM_Z,
      exposure: 1.25,
    }),
    { clusterX: 0, clusterY: 0.1, clusterScale: 0.55, spread: 0.8, dispersion: 5.5, aura: 1 }
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      revealLines(el)
      fadeUp('.track-item', el, 0.08, 24)
      fadeUp('.track-intro', el, 0, 18)
    }, el)

    // 画布是 position:fixed 的，晶簇跟着视口走。所以圆窗也必须钉在视口上，
    // 不能钉在版面上——否则一滚动，窗口和窗口里的东西就分家了。
    const punch = el.querySelector<HTMLElement>('.punch')
    let st: ScrollTrigger | undefined
    let onResize: (() => void) | undefined
    if (punch) {
      const sync = () => {
        const top = el.getBoundingClientRect().top
        punch.style.setProperty('--px', `${(PORT_FRAC * window.innerWidth).toFixed(1)}px`)
        punch.style.setProperty('--py', `${(window.innerHeight / 2 - top).toFixed(1)}px`)
      }
      st = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: sync,
        onRefresh: sync,
      })
      sync()
      onResize = sync
      window.addEventListener('resize', onResize)
    }

    return () => {
      ctx.revert()
      st?.kill()
      if (onResize) window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <section ref={ref} className="relative isolate overflow-hidden">
      <div className="punch absolute inset-0 -z-10" aria-hidden />
      <div className="shell py-[clamp(5rem,12vw,9rem)]">
        {/* 右侧五列整段留空，是圆窗的通道 */}
        <div className="lg:w-[58%]">
          <h2 className="display text-d2 text-paper">
            <span className="reveal-line">
              <span>{tracksIntro.headline}</span>
            </span>
          </h2>
          <p className="track-intro mt-7 max-w-[48ch] text-lead text-paper/88 opacity-0">
            {tracksIntro.body}
          </p>

          <div className="mt-[clamp(3.5rem,7vw,5.5rem)] space-y-[clamp(3rem,6vw,4.5rem)]">
            <Group kicker={trackA.kicker} items={trackA.items} />
            <Group kicker={trackB.kicker} items={trackB.items} />
          </div>
        </div>
      </div>
    </section>
  )
}
