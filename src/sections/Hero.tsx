/**
 * 01 开场 · 非对称分屏海报。
 *
 * 左边说话，右边给证据。没有居中大标题，没有「向下滚动」，没有装饰性数据条。
 *
 * 三件事是刻意的：
 *  1) 标题占满左栏宽度，三行逐行揭幕（clip-path，一次性）。得意黑只出现在这一档。
 *  2) 右边那叠是**真实产品截图**，不是抽象图形，也不是 div 假窗口。
 *     首屏第一眼就得看见做过什么，这是 v6 最大的单点失败。
 *  3) 整章锁在一屏内（audit G19）。顶栏也算在里面，所以它是流内的细条，
 *     不是常驻悬浮导航——悬浮导航会压住下面每一章的正文。
 */

import { useEffect, useRef } from 'react'
import { Circle } from '../components/Ink'
import { Shot } from '../components/Shot'
import { CONTACT_HREF, hero, heroShots, profile } from '../content/site'
import { onSignal } from '../lib/bus'
import { prefersReducedMotion } from '../lib/caps'
import { useStagger } from '../lib/motion'

const NAV = [
  { id: 'work', label: '作品' },
  { id: 'cases', label: '怎么做的' },
  { id: 'craft', label: '手艺' },
  { id: 'notes', label: '在写' },
]

export function Hero() {
  const say = useStagger<HTMLDivElement>(120)
  const deck = useRef<HTMLDivElement | null>(null)

  // 指针视差。只写两个自定义属性，位移交给合成器，主线程不参与排版。
  useEffect(() => {
    const el = deck.current
    if (!el || prefersReducedMotion()) return
    return onSignal((s) => {
      el.style.setProperty('--px', s.pointerIn ? s.px.toFixed(3) : '0')
      el.style.setProperty('--py', s.pointerIn ? s.py.toFixed(3) : '0')
    })
  }, [])

  return (
    <section id="hero" className="ch ch--hero" data-tone="paper" aria-labelledby="hero-h">
      <div className="wrap hero__wrap">
        <header className="topbar">
          <a className="topbar__mark" href="#hero">
            <span className="topbar__cn">{profile.name}</span>
            <span className="topbar__la">{profile.handle}</span>
          </a>
          <nav className="topbar__nav" aria-label="章节">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`}>
                {n.label}
              </a>
            ))}
          </nav>
          <a className="btn btn--solid btn--sm" href={CONTACT_HREF}>
            {hero.primaryCta}
          </a>
        </header>

        <div className="hero__grid">
          <div className="hero__say" ref={say}>
            <p className="eyebrow hero__eb">{hero.latin}</p>
            <h1 className="hero__h" id="hero-h">
              <span className="hero__l wipe" data-stagger="">
                {hero.line1}
              </span>
              <span className="hero__l wipe" data-stagger="">
                {hero.line2Pre}
                <mark className="mark">{hero.line2Mark}</mark>
                {hero.line2Mid}
                <Circle seed="hero-circle">{hero.line2Circle}</Circle>
              </span>
              <span className="hero__l wipe" data-stagger="">
                {hero.line3}
              </span>
            </h1>
            <p className="hero__sub rise" data-stagger="">
              {hero.sub}
            </p>
            <div className="hero__cta rise" data-stagger="">
              <a className="btn btn--solid" href={CONTACT_HREF}>
                {hero.primaryCta}
              </a>
              <a className="btn btn--ghost" href="#cases">
                {hero.secondaryCta}
              </a>
            </div>
          </div>

          <div className="hero__deck" ref={deck}>
            <div className="deck">
              {heroShots.map((s, i) => (
                <div className="deck__pane" data-i={i} key={s.cover}>
                  <Shot
                    cover={s.cover}
                    alt={s.alt}
                    ratio="16 / 10"
                    eager={i === 0}
                    sizes="(max-width: 900px) 88vw, 40vw"
                  />
                  <span className="deck__tag">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
