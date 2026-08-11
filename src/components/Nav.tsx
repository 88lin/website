/**
 * 固定顶栏 + 顶部滚动进度条。
 *
 * v9 之前顶栏是流内的：它长在 hero 里，滚过第一屏就没了。读到第五章想回开场
 * 只能拖滚动条 —— 一个六章长页不该这样。repair.88lin.eu.org 的做法是常驻：
 * 62px 高、半透明奶油底 + 背景模糊，当前项一条黄色下划线从左侧展开。
 * 这里逐条照抄，链接直接由 site.ts 的 chapters 派生，改章名不用改两处。
 *
 * 进度条只写一个自定义属性 --p，宽度靠 scaleX 走合成器，主线程不参与排版。
 * 节流用 rAF 而不是 scroll 事件本身：lenis 每帧都会派发 scroll，
 * 不合帧的话一屏能跑几十次样式写入。
 */

import { useEffect, useRef } from 'react'
import { chapters, profile } from '../content/site'

/** 开场不进导航：点它等于回到页顶，左上角的站名已经是这个动作。 */
const LINKS = chapters.filter((c) => c.id !== 'hero')

export function Nav() {
  const bar = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = bar.current
    if (!el) return

    let raf = 0
    let last = -1

    const tick = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      // 半像素以下的变化不写：3px 高的条上肉眼分辨不出，写了只是白烧一帧
      if (Math.abs(p - last) > 0.0015) {
        last = p
        el.style.setProperty('--p', p.toFixed(4))
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    tick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <>
      <div className="scrollbar" aria-hidden="true">
        <i ref={bar} />
      </div>
      <header className="nav">
        <div className="nav-in">
          <a className="nav-mark" href="#hero">
            <b>{profile.name}</b>
            <s>@88LIN</s>
          </a>
          <nav className="nav-links" aria-label="章节">
            {LINKS.map((c) => (
              <a key={c.id} href={`#${c.id}`}>
                {c.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}
