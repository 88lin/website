/**
 * 01 开场 · 立体色块建构。
 *
 * 五块有厚度的板子在一个共同的透视坐标系里搭成一条左上到右下的对角构图。
 * 厚度不是模糊阴影，是 1px 步进的实心 box-shadow 链（见 index.css 的 --ex-*），
 * 所以块体读起来是「挤出来的」而不是「浮起来的」。
 *
 * 三条不让步的规则：
 *  1) 零位图。视觉重量由色块体积、巨字与真实配置片段扛，不靠截图。
 *  2) 整章锁在一屏内（audit G19），顶栏算在里面，不做常驻悬浮导航。
 *  3) 每块自带 perspective()，不共享 transform-style: preserve-3d。
 *     共享 3D 上下文会让子元素被父块的面切开，v8 原型阶段实测过。
 */

import { useEffect, useRef } from 'react'
import { Circle } from '../components/Ink'
import { AS_OF, CONTACT_HREF, garden, hero, metrics, profile, projects } from '../content/site'
import { onSignal } from '../lib/bus'
import { prefersReducedMotion } from '../lib/caps'

/** 顺序跟 site.ts 的 chapters 一致。v9 把「能做什么」提到了作品前面，
    顶栏也得跟着换，否则点导航是往回跳。 */
const NAV = [
  { id: 'craft', label: '能做什么' },
  { id: 'work', label: '做过什么' },
  { id: 'cases', label: '怎么做的' },
  { id: 'notes', label: '在写在跑' },
]

/** 纸板上那三行是 video_vip 里真实在用的降级策略，不是示意图。 */
const YAML = [
  { k: 'providers:', v: 'primary → secondary → local', c: '# 一家挂了换下一家' },
  { k: 'on_error:', v: 'retry x2 → degrade → next', c: '# 断网也能出结果' },
  { k: 'contract:', v: '输出格式与 provider 解耦', c: '# 换上游不改业务代码' },
]

/** 底条只给口径，不复述上面已经放大过的数字。 */
const RAIL = [metrics[2], metrics[3], metrics[4]]

export function Hero() {
  const world = useRef<HTMLDivElement | null>(null)

  // 指针视差：只写两个自定义属性，位移交给合成器，主线程不参与排版。
  // bus 的 y 轴向上为正，这里的块体要跟着指针走，所以取负。
  useEffect(() => {
    const el = world.current
    if (!el || prefersReducedMotion()) return
    return onSignal((s) => {
      el.style.setProperty('--px', s.pointerIn ? s.px.toFixed(3) : '0')
      el.style.setProperty('--py', s.pointerIn ? (-s.py).toFixed(3) : '0')
    })
  }, [])

  return (
    <section id="hero" className="ch ch--hero" data-tone="paper" aria-labelledby="hero-h">
      <header className="topbar">
        <a className="topbar__mark" href="#hero">
          <span className="topbar__cn">{profile.name}</span>
          <span className="topbar__la">@88LIN</span>
        </a>
        <nav className="topbar__nav" aria-label="章节">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="hero__stage">
        <div className="hero__world" ref={world}>
          <section className="slab s-main">
            <a
              className="eyebrow hero__eb"
              href="https://github.com/88lin"
              target="_blank"
              rel="noreferrer noopener"
            >
              {hero.latin}
            </a>
            <div>
              <h1 className="hero__h" id="hero-h">
                <i className="hero__l wipe is-in">{hero.line1}</i>
                <i className="hero__l wipe is-in">
                  {hero.line2Pre}
                  <mark className="mark">{hero.line2Mark}</mark>
                  {hero.line2Mid}
                  <Circle seed="hero-keep">{hero.line2Circle}</Circle>
                </i>
                <i className="hero__l wipe is-in">{hero.line3}</i>
              </h1>
              <p className="hero__sub">{hero.sub}</p>
            </div>
          </section>

          <aside className="slab s-yel">
            <b>可切换</b>
            <s>SWITCHABLE BY DESIGN</s>
          </aside>

          <aside className="slab s-pop">
            <span className="s-pop__big">1,784</span>
            <span className="s-pop__cap">天 · 从第一次提交到今天，一直在跑</span>
            <hr className="s-pop__hr" />
            <div className="s-pop__two">
              <div>
                <b>{garden.length}</b>
                <s>SITES ONLINE</s>
              </div>
              <div>
                <b>{projects.length}</b>
                <s>MAINTAINED</s>
              </div>
            </div>
          </aside>

          <aside className="slab s-pap">
            <div className="s-pap__l">
              <b>降级配置</b>
              <s>
                resilience.yml
                <br />
                88lin/video_vip
              </s>
            </div>
            <div>
              {YAML.map((l) => (
                <code key={l.k}>
                  <b>{l.k}</b> {l.v} <em>{l.c}</em>
                </code>
              ))}
            </div>
          </aside>

          <div className="slab s-cta hero__cta">
            <a className="btn btn--solid" href={CONTACT_HREF}>
              {hero.primaryCta}
            </a>
            <a className="btn btn--yellow" href="#cases">
              {hero.secondaryCta}
            </a>
          </div>

          <div className="hero__rail">
            {RAIL.map((m) => (
              <span key={m.label}>
                <b>{m.value}</b>
                {m.label}
              </span>
            ))}
            <span className="hero__src">数据取自 GITHUB 公开接口，截至 {AS_OF}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
