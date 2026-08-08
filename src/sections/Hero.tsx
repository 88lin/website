import { useRef } from 'react'
import { hero, profile } from '../content/site'
import { Cta } from '../components/ui'
import { useScene } from '../webgl/StageContext'

// 首屏动效全部交给 CSS 关键帧（见 styles/index.css 的 heroRise / heroFade）。
// 预渲染的 HTML 一到就能开始动，不必等 react + gsap 下载执行——LCP 因此从 4.6s 掉到 1s 级。
export function Hero() {
  const ref = useRef<HTMLElement>(null)

  useScene(
    ref,
    { formX: 2.62, formY: -0.42, formScale: 1.55, amp: 0.26, freq: 1.0, twist: 0.35, spin: 0.16, camZ: 6.2, particles: 0.55, exposure: 1.05 },
    undefined,
    // 窄屏：把主形体沉到右下角空白区，作为一整块光滑的铬合金肩部收住版面
    { formX: 0.78, formY: -2.2, formScale: 0.9, amp: 0.2, freq: 1.0, twist: 0.4, spin: 0.2 }
  )

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center pt-[104px] pb-[12vh]"
    >
      {/* 左侧栏的竖排定位标签，桌面端才出现 */}
      <div className="pointer-events-none absolute left-[1.15rem] top-1/2 hidden -translate-y-1/2 2xl:block">
        <span
          className="mono block whitespace-nowrap text-[0.66rem] tracking-[0.34em] text-ink-60"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          AI ENGINEERING &times; CREATIVE FRONTEND
        </span>
      </div>

      <div className="shell grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-9 xl:col-span-8">
          <h1 className="display text-d1 text-balance">
            <span className="reveal-line hero-rise" style={{ animationDelay: '0.06s' }}>
              <span>{hero.line1}</span>
            </span>
            <span className="reveal-line hero-rise" style={{ animationDelay: '0.2s' }}>
              <span>
                {hero.line2Pre}
                <em className="not-italic text-vermilion-deep">{hero.line2Mark}</em>
                {hero.line2Post}
              </span>
            </span>
          </h1>

          <p
            className="hero-fade mt-9 max-w-[46ch] text-balance text-lead text-ink-60"
            style={{ animationDelay: '0.42s' }}
          >
            {hero.sub}
          </p>

          <div className="hero-fade mt-11 flex flex-wrap items-center gap-4" style={{ animationDelay: '0.54s' }}>
            <Cta size="lg">{hero.primaryCta}</Cta>
            <a
              href="#work"
              className="mono group inline-flex items-center gap-2 border-b-2 border-ink px-1 py-4 text-[0.86rem] tracking-[0.08em] transition-colors hover:border-vermilion-deep hover:text-vermilion-deep"
            >
              {hero.secondaryCta}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-1">
                &darr;
              </span>
            </a>
          </div>

          <p
            className="hero-fade mono mt-14 max-w-[54ch] text-[0.74rem] leading-[1.9] tracking-[0.06em] text-ink-60"
            style={{ animationDelay: '0.66s' }}
          >
            {profile.latinTagline}
          </p>
        </div>
      </div>
    </section>
  )
}
