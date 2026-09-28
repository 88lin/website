/** 顶栏：站名 + 章节锚点 + GitHub + 下单入口。当前章那项常亮。 */

import { useEffect, useRef } from 'react'
import { CONTACT_HREF, CTA_LABEL, chapters, profile } from '../content/site'
import { prefersReducedMotion } from '../lib/caps'
import { useActiveSection } from '../lib/motion'

const LINKS = [
  { id: 'services', label: '服务' },
  { id: 'cases', label: '案例' },
  { id: 'work', label: '作品' },
  { id: 'contact', label: '联系' },
]

/** 观察全部七章，但只有四章在顶栏里有对应项；其余章滚过去时四项都不亮。 */
const WATCH = ['hero', 'services', 'cases', 'work', 'craft', 'notes', 'contact']

export function Nav() {
  const active = useActiveSection(WATCH)
  const chips = useRef<HTMLElement | null>(null)

  /*
    让高亮那一项自己滑进视野。七章只露得出五个，不跟的话滚到 05／06 时
    高亮项停在屏外，这条的「你在哪」就白做了。

    自己算 scrollLeft 而不是 scrollIntoView：后者会连带把祖先一起滚，
    而这条挂在吸顶栏里，一不小心就把整页拽走。
  */
  useEffect(() => {
    const el = chips.current
    if (!el || !active) return
    const chip = el.querySelector<HTMLElement>(`a[href="#${active}"]`)
    if (!chip) return
    const pad = 24 // 留一点，让人看得见旁边还有
    const left = chip.offsetLeft - pad
    const right = chip.offsetLeft + chip.offsetWidth + pad - el.clientWidth
    const to = el.scrollLeft < right ? right : el.scrollLeft > left ? left : null
    if (to === null) return
    el.scrollTo({ left: to, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [active])

  return (
    <header className="nav">
      <div className="nav-in">
        <a className="nav-mark" href="#hero">
          <b>{profile.name}</b>
          <s>@88LIN</s>
        </a>
        <nav className="nav-links" aria-label="导航">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              data-on={active === l.id ? '1' : undefined}
              aria-current={active === l.id ? 'true' : undefined}
            >
              {l.label}
            </a>
          ))}
          <a className="gh" href="https://github.com/88lin" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          {/* 顶栏常驻的下单入口。接单站，读者滚到任何一章都该够得着出口，不必先滚回顶部或一路滚到底。
              窄屏优先保它，先让章节锚点、再让 GitHub 让位。 */}
          <a className="nav-cta" href={CONTACT_HREF}>
            {CTA_LABEL}
          </a>
        </nav>
      </div>

      {/*
        窄屏章节条。≤860px 时上面那排锚点整体让位给下单入口，于是手机上
        一页 21 屏却一个章节入口都没有 —— 章序轨又只在 ≥1240px 出现，
        两头都够不着。这条补的是那个空档：七章全放，横滑着看。

        用 chapters 而不是上面那四项 LINKS：横滑没有宽度预算，索性给全；
        00 顺带当「回顶部」用。
      */}
      <nav className="nav-chips" aria-label="章节" ref={chips}>
        {chapters.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            data-on={active === c.id ? '1' : undefined}
            aria-current={active === c.id ? 'true' : undefined}
          >
            <b aria-hidden="true">{c.no}</b>
            {c.label}
          </a>
        ))}
      </nav>

      <i className="nav__prog" aria-hidden="true" />
    </header>
  )
}
