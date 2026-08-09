/**
 * 右侧锚点栏。
 *
 * 刻意不做成悬浮胶囊导航：那东西压内容、抢视线，八章的站也不需要一直挂着菜单。
 * 这里是一列 14px 的短横线，当前章那根变长并显出章名，hover 才展开其余。
 *
 * 它是 fixed 的，不在任何章里面——所以颜色只能由当前章的 tone 决定，
 * 少了 data-tone 就会在深色章里变成看不见的墨色。桌面独有，900 以下整列隐藏。
 */

import { useEffect, useState } from 'react'
import { chapters } from '../content/site'
import { onSignal } from '../lib/bus'
import { scrollToId } from '../lib/motion'

export function Rail() {
  const [active, setActive] = useState(0)
  useEffect(() => onSignal((s) => setActive(s.chapter)), [])

  return (
    <nav className="rail" aria-label="章节导航" data-tone={chapters[active].tone}>
      {chapters.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className="rail__item"
          aria-current={i === active}
          onClick={() => scrollToId(c.id)}
        >
          <span className="rail__label">{c.label}</span>
          <span className="rail__dash" />
        </button>
      ))}
    </nav>
  )
}
