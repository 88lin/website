/**
 * 顶栏。站名 + 三个锚点 + GitHub。
 * 形态照 repair.88lin.eu.org —— 那是用户点名能看上的页面之一，品牌上也该同源。
 *
 * 当前章那一项的黄色下划线**常亮**（useActiveSection 量的是谁跨过了视口中线）。
 * 上一版这条线只在 hover 时出现，于是顶栏一路滚下来毫无变化，读者不知道自己在哪。
 * 底边那条进度条由 CSS 的 scroll-timeline 驱动（见 index.css 的 .nav__prog），
 * 没有 JS、不占主线程；浏览器不支持就整个不显示，所以它只是提示，不承载导航。
 */

import { profile } from '../content/site'
import { useActiveSection } from '../lib/motion'

const LINKS = [
  { id: 'cases', label: '案例' },
  { id: 'work', label: '作品' },
  { id: 'contact', label: '联系' },
]

/** 观察全部七章，但只有三章在顶栏里有对应项；其余章滚过去时三项都不亮。 */
const WATCH = ['hero', 'cases', 'craft', 'work', 'garden', 'notes', 'contact']

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
        </nav>
      </div>
      <i className="nav__prog" aria-hidden="true" />
    </header>
  )
}
