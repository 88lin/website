/**
 * 顶栏。站名 + 三个锚点 + GitHub，当前项一条黄色下划线从左侧展开。
 * 形态照 repair.88lin.eu.org —— 那是用户点名能看上的页面之一，
 * 品牌上也该同源。
 *
 * 底边那条进度条由 CSS 的 scroll-timeline 驱动（见 index.css 的 .nav__prog），
 * 没有 JS、不占主线程；浏览器不支持就整个不显示，所以它只是提示，不承载导航。
 */

import { profile } from '../content/site'

const LINKS = [
  { href: '#cases', label: '案例' },
  { href: '#work', label: '作品' },
  { href: '#contact', label: '联系' },
]

export function Nav() {
  return (
    <header className="nav">
      <div className="nav-in">
        <a className="nav-mark" href="#hero">
          <b>{profile.name}</b>
          <s>@88LIN</s>
        </a>
        <nav className="nav-links" aria-label="导航">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
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
