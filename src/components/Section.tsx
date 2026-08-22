/**
 * 章级零件：章头与「数据面板」。
 *
 * 两件都是从用户认可的自有页面里量出来的：
 *  - 章头：编号（展示字、大号、彩色）+ 章名 + 一行说明，坐在一条细线上
 *  - 数据面板：虚线框 + macOS 三色圆点 + 等宽正文，就是 repair.88lin.eu.org
 *    首屏右侧那张「一次典型排障对话」。它承担「真东西」的证据感，
 *    页面上凡是要摆实测数据的地方都用它，不另造新形状。
 */

import type { ReactNode } from 'react'
import { chapters, type ChapterId } from '../content/site'
import { useReveal } from '../lib/motion'

const byId = (id: ChapterId) => chapters.find((c) => c.id === id)!

/**
 * 一整章。tone 决定地面色，两档纸色严格交替。
 *
 * 章头挂 useReveal：进视口时编号浮起、那条细线从左画到右、章名遮片上移、说明淡入。
 * 四步的时序全在 CSS 里（.chap.is-in 的一组 transition-delay），JS 只负责加一个类。
 * 六章共用同一段开幕动作，所以往下滚每章都有明确的入场，而不是整页一路平推。
 */
export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: ChapterId
  title: string
  intro?: string
  children: ReactNode
}) {
  const c = byId(id)
  const head = useReveal<HTMLElement>()
  return (
    <section className="sec" id={id} data-tone={c.tone}>
      <div className="wrap">
        <header className="chap" ref={head}>
          <b className="chap__no" data-t={c.tint}>
            {c.no}
          </b>
          <span className="chap__label">{c.label}</span>
          <h2 className="chap__title">{title}</h2>
          {intro && <p className="chap__intro">{intro}</p>}
        </header>
        {children}
      </div>
    </section>
  )
}

/**
 * 数据面板。title 走标题栏，children 是等宽正文。
 * `tint` 只染标题栏那条细线与圆点旁的标签，面永远是白的。
 */
export function Panel({
  title,
  tint = 'blue',
  children,
}: {
  title: string
  tint?: 'blue' | 'yellow' | 'coral' | 'teal'
  children: ReactNode
}) {
  return (
    <div className="panel" data-t={tint}>
      <div className="panel__bar">
        <i className="panel__dots" aria-hidden="true">
          <s />
          <s />
          <s />
        </i>
        <span className="panel__title">{title}</span>
      </div>
      <div className="panel__body">{children}</div>
    </div>
  )
}

/** 面板里的一行：左边编号/键，右边值。 */
export function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <p className="prow">
      <b>{k}</b>
      <span>{children}</span>
    </p>
  )
}
