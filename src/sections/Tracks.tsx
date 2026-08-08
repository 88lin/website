import { useEffect, useRef } from 'react'
import { tracksIntro, trackA, trackB, type Track } from '../content/site'
import { gsap, revealLines, fadeUp, ScrollTrigger } from '../lib/motion'
import { useScene, useAnchorEl } from '../webgl/StageContext'
import { asset } from '../lib/asset'

function Column({ kicker, items, side }: { kicker: string; items: Track[]; side: 'a' | 'b' }) {
  return (
    <div className={side === 'a' ? 'col-span-12 lg:col-span-6' : 'col-span-12 lg:col-span-5 lg:col-start-8'}>
      <h3 className="mono border-b border-paper/30 pb-3 text-[0.78rem] tracking-[0.2em] text-paper/80">
        {kicker}
      </h3>
      <ul className="mt-7 space-y-7">
        {items.map((t) => (
          <li key={t.id} className="track-item opacity-0">
            <h4 className="display text-[clamp(1.3rem,2vw,1.75rem)] leading-tight tracking-tight text-paper">
              {t.title}
            </h4>
            <p className="mt-2 max-w-[44ch] text-[0.95rem] leading-[1.75] text-paper/75">{t.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Tracks() {
  const ref = useRef<HTMLElement>(null)
  const portRef = useRef<HTMLDivElement>(null)

  // 铬合金体挪到画面左外侧：这一屏只有圆窗透光，主形体让位给写实素材
  useScene(
    ref,
    { formX: -3.2, formY: -0.5, formScale: 1.1, amp: 0.24, freq: 1.6, twist: 0.9, spin: 0.3, camZ: 5.4, particles: 0.15, exposure: 1.15 },
    { robot: 1 }
  )
  useAnchorEl(portRef, 'robot', 0.96)

  useEffect(() => {
    const el = ref.current
    const port = portRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      revealLines(el)
      fadeUp('.track-item', el, 0.08, 24)
      fadeUp('.track-intro', el, 0, 18)
    }, el)

    // 开孔的位置直接读版面里的占位框，版面变了洞口自己跟着变
    const punch = el.querySelector<HTMLElement>('.punch')
    let st: ScrollTrigger | undefined
    let onResize: (() => void) | undefined
    if (punch && port) {
      const sync = () => {
        const s = el.getBoundingClientRect()
        const r = port.getBoundingClientRect()
        if (r.width < 1) return
        punch.style.setProperty('--px', `${(r.left + r.width / 2 - s.left).toFixed(1)}px`)
        punch.style.setProperty('--py', `${(r.top + r.height / 2 - s.top).toFixed(1)}px`)
        punch.style.setProperty('--pr', `${(r.width / 2).toFixed(1)}px`)
      }
      st = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onRefresh: sync })
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
        <div className="grid grid-cols-12 items-center gap-x-6">
          <div className="col-span-12 lg:col-span-7">
            <h2 className="display text-d2 text-paper">
              <span className="reveal-line">
                <span>{tracksIntro.headline}</span>
              </span>
            </h2>
            <p className="track-intro mt-7 max-w-[48ch] text-lead text-paper/80 opacity-0">
              {tracksIntro.body}
            </p>
            {/* 窄屏补位：宽屏这张图由 WebGL 素材层渲染在圆窗里 */}
            <img
              src={asset('subjects/robot.webp')}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="subject-porthole mt-10 aspect-square w-[min(64vw,300px)] object-cover lg:hidden"
            />
          </div>
          {/* 圆窗占位框：本身不可见，只用来定位遮罩开孔与写实素材 */}
          <div className="relative col-span-5 hidden lg:block">
            <div
              ref={portRef}
              aria-hidden
              className="pointer-events-none absolute right-0 top-1/2 aspect-square w-[min(24vw,336px)] -translate-y-1/2"
            />
          </div>
        </div>

        <div className="mt-[clamp(3.5rem,8vw,6.5rem)] grid grid-cols-12 gap-x-6 gap-y-14">
          <Column kicker={trackA.kicker} items={trackA.items} side="a" />
          <Column kicker={trackB.kicker} items={trackB.items} side="b" />
        </div>
      </div>
    </section>
  )
}
