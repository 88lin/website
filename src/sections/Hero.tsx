/**
 * EXP.00 开场 · 实验志的封面。
 *
 * 构图：左侧是志的刊头与论点（巨字、荧光笔、手绘圈），右侧钉着图版 01
 * 「作品星座」—— 一幅可以拖的 3D 星图，降级时是同一布局的静态 SVG。
 * 视线落点是偏的：先撞左上三行字，再被右边的星座带走。不做居中 Hero。
 *
 * 三条纪律沿用 v10：star / fork 不进这一章；读数全部由数组长度派生；
 * 零位图（星图是矢量与实时渲染，不是截图）。
 */

import { useEffect, useRef, useState } from 'react'
import { Atlas } from '../components/Atlas'
import { Circle, Frame, Stamp } from '../components/Ink'
import { Annot } from '../components/Ink'
import { AS_OF, CONTACT_EMAIL, CONTACT_HREF, garden, hero, profile, projects, writing } from '../content/site'

const num = (n: number) => n.toLocaleString('en-US')

const PILLS = [
  { v: String(garden.length), k: 'SITES ONLINE' },
  { v: String(projects.length), k: 'MAINTAINED' },
  { v: num(writing.days), k: 'DAYS RUNNING' },
]

export function Hero() {
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
    } catch {
      return // 不支持或没授权就静默失败：邮箱本来就明文摆在那儿，手选也能复制
    }
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 1600)
  }

  return (
    <section id="hero" className="ch ch--hero" data-tone="paper" aria-labelledby="hero-h">
      <div className="hero-in">
        <div className="hero-copy">
          <p className="mast">
            <span className="mast__name">茉灵智库</span>
            <span className="mast__sub">FIELD NOTES · 实验志</span>
            <span className="mast__lat">{hero.latin}</span>
          </p>

          <h1 className="hero-h1" id="hero-h">
            <i>{hero.line1}</i>
            <i>
              {hero.line2Pre}
              <span className="hl-yellow">{hero.line2Mark}</span>
              {hero.line2Mid}
              <Circle seed="hero-keep">{hero.line2Circle}</Circle>
            </i>
            <i>{hero.line3}</i>
          </h1>

          <p className="hero-lead">{profile.latinTagline}</p>
          <p className="hero-sub">{hero.sub}</p>

          {/* 整页唯一真正想让人带走的字符串，给它一键复制比再放一个按钮实用 */}
          <div className="hero-cmd">
            <span className="hero-cmd__p" aria-hidden="true">
              mail:
            </span>
            <code>{CONTACT_EMAIL}</code>
            <button
              className="hero-cmd__copy"
              type="button"
              onClick={copy}
              data-done={done ? '1' : undefined}
            >
              {done ? 'COPIED' : 'COPY'}
            </button>
          </div>

          <div className="hero-act">
            <a className="cta-btn" href={CONTACT_HREF}>
              {hero.primaryCta}
            </a>
            <a className="cta-btn cta-btn--ghost" href="#cases">
              {hero.secondaryCta}
            </a>
          </div>

          <div className="hero-pills">
            {PILLS.map((p) => (
              <div className="hero-pill" key={p.k}>
                <b>{p.v}</b>
                <s>{p.k}</s>
              </div>
            ))}
          </div>

          <p className="hero-src">数据取自 GITHUB 公开接口与博客统计条，截至 {AS_OF}</p>
        </div>

        <div className="hero-plate">
          <Frame seed="plate-01" className="hero-plate__frame">
            <Atlas />
          </Frame>
          <Annot seed="plate-hub" className="hero-plate__annot">
            核心那颗是 video_vip——4,642 颗星，靠「接口一定会挂」活过三年
          </Annot>
          <Stamp seed="plate-stamp" date={AS_OF} label="数据可核 VERIFIED" className="hero-plate__stamp" />
        </div>
      </div>
    </section>
  )
}
