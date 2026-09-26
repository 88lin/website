/** 章级零件：章头（编号 ─── 章名 ─── 说明）与虚线数据面板。 */

import type { ReactNode } from 'react'
import { chapters, type ChapterId } from '../content/site'
import { useReveal } from '../lib/motion'

const byId = (id: ChapterId) => chapters.find((c) => c.id === id)!

/* 一整章。 */
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
          <span className="chap__label" data-t={c.tint}>
            <span>{c.label}</span>
          </span>
          <h2 className="chap__title">{title}</h2>
          {intro && <p className="chap__intro">{intro}</p>}
        </header>
        {children}
      </div>
    </section>
  )
}

/* 数据面板。 */
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
