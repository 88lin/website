import { useEffect, useRef } from 'react'
import { hero, profile, META_AS_OF } from '../content/site'
import { Btn, Mark, Note } from '../components/ui'
import { fadeUp } from '../lib/motion'

/** layouts.md #1 Hero 双栏不对称：左侧压满标题，右侧一张略微倾斜的档案卡。 */
export function Hero() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.hero-card', root.current, 0.1, 30)
  }, [])

  return (
    <section id="top" ref={root} className="relative pt-[136px] pb-[clamp(70px,10vh,120px)]">
      <div className="shell grid gap-[clamp(44px,6vw,80px)] lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="hero-fade flex items-center gap-3 text-sm text-ink-light">
            <Note className="text-[1.35rem] text-brand-deep">Hi,</Note>
            <span>
              {profile.role} · {profile.location}
            </span>
          </p>

          <h1 className="serif mt-5 text-d1">
            <span className="hero-fade block" style={{ animationDelay: '0.05s' }}>
              {hero.line1}
            </span>
            <span className="hero-fade block" style={{ animationDelay: '0.14s' }}>
              <Mark>{hero.line2Mark}</Mark>
              {hero.line2Post}
            </span>
          </h1>

          <p
            className="hero-fade mt-7 max-w-[46ch] text-lead text-ink-light"
            style={{ animationDelay: '0.24s' }}
          >
            {hero.sub}
          </p>

          <div
            className="hero-fade mt-9 flex flex-wrap items-center gap-3.5"
            style={{ animationDelay: '0.32s' }}
          >
            <Btn>{hero.primaryCta}</Btn>
            <Btn href="#work" variant="outline">
              {hero.secondaryCta}
            </Btn>
          </div>
        </div>

        {/* 档案卡：底下垫一块偏移的浅黄色，像压在桌面上的两张纸 */}
        <div className="hero-card js-fade relative lg:col-span-5">
          <div
            aria-hidden
            className="absolute inset-x-3 -top-3 bottom-6 -rotate-[1.8deg] rounded-2xl bg-highlight-soft"
          />
          <div className="card relative rotate-[0.7deg] rounded-2xl p-[clamp(24px,3vw,40px)]">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow text-brand-text">Profile</p>
              <p className="eyebrow text-ink-faint">{META_AS_OF}</p>
            </div>

            <p className="serif mt-4 text-[clamp(1.7rem,2.6vw,2.2rem)] leading-[1.15]">
              {profile.name}
              <span className="ml-2.5 align-middle text-[0.62em] text-brand-text">
                @{profile.handle}
              </span>
            </p>

            <p className="serif mt-3 text-lg text-ink-light italic">{profile.latinTagline}</p>

            <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-1.5 border-t border-line pt-6">
              <dt className="eyebrow text-ink-faint">坐标</dt>
              <dt className="eyebrow text-ink-faint">起点</dt>
              <dd className="text-[0.9375rem] font-medium">{profile.location}</dd>
              <dd className="text-[0.9375rem] font-medium">{profile.since} 年至今</dd>
            </dl>
          </div>

          <Note className="absolute -bottom-1 right-2 hidden text-ink-faint lg:block">
            <span aria-hidden>↑ </span>就是我
          </Note>
        </div>
      </div>
    </section>
  )
}
