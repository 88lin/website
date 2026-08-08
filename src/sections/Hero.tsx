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
    { clusterX: 2.05, clusterY: -0.15, clusterScale: 0.85, spread: 1.0, spin: 0.13, tilt: 0.05, dispersion: 5.4, glow: 1.0, tint: 0.34, camZ: 6.2, exposure: 1.05 },
    // 窄屏视野只有宽屏的三分之一，晶簇沉到标题下方的空白里，缩到一半大小
    { clusterX: 0.14, clusterY: -1.94, clusterScale: 0.54, spread: 0.85, spin: 0.18 }
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
          className="mono block whitespace-nowrap text-[0.875rem] tracking-[0.06em] text-ink-70"
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
            className="hero-fade mt-9 max-w-[46ch] text-balance text-lead text-ink-70"
            style={{ animationDelay: '0.42s' }}
          >
            {hero.sub}
          </p>

          <div className="hero-fade mt-11 flex flex-wrap items-center gap-4" style={{ animationDelay: '0.54s' }}>
            <Cta size="lg">{hero.primaryCta}</Cta>
            <a
              href="#work"
              className="group inline-flex items-center gap-2 rounded-full border border-ink/25 px-6 py-4 text-[1.0625rem] font-semibold tracking-[-0.014em] transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              {hero.secondaryCta}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-1">
                &darr;
              </span>
            </a>
          </div>

          <p
            className="hero-fade mono mt-14 max-w-[54ch] text-[0.875rem] leading-[1.9] tracking-[0.06em] text-ink-70"
            style={{ animationDelay: '0.66s' }}
          >
            {profile.latinTagline}
          </p>
        </div>
      </div>
    </section>
  )
}
