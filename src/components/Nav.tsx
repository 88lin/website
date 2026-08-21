/**
 * 顶栏。一枚标志 + 三个词，没有底、没有边、没有背景模糊。
 *
 * 满幅实时画面的站点必须这样：任何一条横线、任何一块半透明底，都会把画面
 * 切成两段。参考站也是这个做法。八章的锚点不进顶栏 —— 一个满幅叙事页
 * 摆七个锚点等于告诉访客「这里很长」，这不是想给的第一印象。
 */

import { CTA_LABEL, CONTACT_HREF, profile } from '../content/site'

const LINKS = [
  { href: '#cases', label: '案例' },
  { href: '#work', label: '作品' },
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
          <a href={CONTACT_HREF}>{CTA_LABEL}</a>
        </nav>
      </div>
    </header>
  )
}
