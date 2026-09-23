/** 顶栏：站名 + 章节锚点 + GitHub + 下单入口。当前章那项常亮。 */

import { CONTACT_HREF, CTA_LABEL, profile } from '../content/site'
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
      <i className="nav__prog" aria-hidden="true" />
    </header>
  )
}
