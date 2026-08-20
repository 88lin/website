/**
 * EXP.00 开场 · 活字付印。
 *
 * v12：封面图版从星图换成铸字盘。首屏论点「把前沿 AI 变成可交付、可维护
 * 的工程结果」的 18 个字铸成活字，排在右侧 6×3 字盘里——荧光笔扫过的
 * 「交付」上黄面，朱笔圈住的「维护」上朱面，拉丁字母上墨面。字盘不是
 * 插图，是标题的排印底稿：左边那句话就是用右边这盘字排的。
 *
 * 构图不变：左刊头与论点（巨字、荧光笔、手绘圈），右图版（手绘虚线框 +
 * 核实章 + Caveat 旁批）。视线落点偏左，不做居中 Hero。
 *
 * 三条纪律沿用：star / fork 不进这一章；读数全部由数组长度派生；零位图
 * （字盘是矢量与实时渲染，不是截图）。
 */

import { useEffect, useRef, useState } from 'react'
import { TypeCase } from '../components/TypeCase'
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
            <span className="mast__sub">TYPECAST · 活字付印</span>
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
            <TypeCase />
          </Frame>
          <Annot seed="plate-hub" className="hero-plate__annot">
            荧光笔与朱圈标过的两个词，字面也换成了对应的颜色。字盘是标题的底稿
          </Annot>
          <Stamp seed="plate-stamp" date={AS_OF} label="活字付印 TYPECAST" className="hero-plate__stamp" />
        </div>
      </div>
    </section>
  )
}
