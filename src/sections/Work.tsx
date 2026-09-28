/* 03 作品：十个仓库的横推轨。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Section } from '../components/Section'
import { hub, projects, worksIntro } from '../content/site'
import { isCoarse, prefersReducedMotion } from '../lib/caps'
import { useReveal } from '../lib/motion'

const STATE: Record<string, string> = {
  live: '在线',
  maintained: '长期维护',
  archived: '已归档',
}

export function Work() {
  const rail = useRef<HTMLDivElement | null>(null)
  const dragged = useRef(false)
  /** 手动输入调它：暂停自动滚，2.5s 后自动接着走。由下面那个 effect 填实现。 */
  const pause = useRef<() => void>(() => {})
  const scene = useRef<HTMLDivElement | null>(null)
  // 这一章没有 useStagger 容器，所以章尾那条自己揭示
  const hubRef = useReveal<HTMLElement>()

  /** 进度（0–1）、可视比例（缩略条的宽度）、两头是否到底 */
  const [prog, setProg] = useState(0)
  const [ratio, setRatio] = useState(1)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = rail.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setRatio(el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1)
    setProg(max > 0 ? el.scrollLeft / max : 0)
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(max <= 0 || el.scrollLeft >= max - 1)
  }, [])

  const page = useCallback((dir: 1 | -1) => {
    const el = rail.current
    if (!el) return
    pause.current()
    const card = el.querySelector<HTMLElement>('.wcard')
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.8
    el.scrollBy({ left: step * dir, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const el = rail.current
    if (!el) return
    sync()

    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)

    /**
     * 滚轮转横移。两处细节决定它是「顺手」还是「烦人」：
     *  · 横向 delta 更大时直接放手 —— 那是触控板横滑，浏览器原生处理得更好
     *  · 推到任一头就不再 preventDefault，滚动权交回页面，不把整页钉住
     * stopPropagation 是给 lenis 的：它挂在 window 上，不拦住会两边一起滚。
     */
    const onWheel = (e: WheelEvent) => {
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      // deltaMode: 0 像素 / 1 行 / 2 页
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * el.clientWidth : e.deltaY
      if ((step > 0 && el.scrollLeft >= max - 1) || (step < 0 && el.scrollLeft <= 1)) return
      e.preventDefault()
      e.stopPropagation()
      pause.current()
      el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + step))
    }
    el.addEventListener('wheel', onWheel, { passive: false })

    /* 拖拽横移 */
    let down = false
    let sx = 0
    let sl = 0
    let moved = 0

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      pause.current()
      down = true
      sx = e.clientX
      sl = el.scrollLeft
      moved = 0
      dragged.current = false
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - sx
      moved = Math.max(moved, Math.abs(dx))
      if (moved <= 4) return
      // 越过阈值才抢指针：低于阈值时这一下还可能是普通点击
      if (!el.hasPointerCapture(e.pointerId)) {
        el.setPointerCapture(e.pointerId)
        el.dataset.grab = '1'
      }
      el.scrollLeft = sl - dx
    }
    const onUp = () => {
      if (!down) return
      down = false
      delete el.dataset.grab
      dragged.current = moved > 6
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [sync])

  /* 自动横滚。 */
  useEffect(() => {
    const el = rail.current
    const root = scene.current
    if (!el || !root) return
    if (prefersReducedMotion()) return
    /*
      触摸设备不自动滚。这一章在手机上是 scroll-snap: x mandatory，
      每帧写 scrollLeft 会和吸附一直互相拉扯，手指刚停住又被拖走；
      而「悬停即停」这个刹车在没有指针的设备上根本不存在，一旦滚起来就停不下。
      再加上一个常驻 rAF 白白耗电 —— 手机上就让它老实待着，手指划到哪算哪。
    */
    if (isCoarse()) return

    const SPEED = 32 / 1000 // px per ms
    const DWELL = 900 // 到头停多久再往回
    const RESUME = 2500 // 手动动过之后多久接着走

    let dir: 1 | -1 = 1
    let dwellUntil = 0
    let pausedUntil = 0
    let hovering = false
    let inView = false
    let raf = 0
    let last = 0
    /*
      位置自己记在 pos 里，**不从 el.scrollLeft 读回来**。
      一帧只走 0.5px 左右，而滚动容器的 scrollLeft 会把亚像素抹掉：
      写 0.51 读回来是 0，下一帧又从 0 加起，轨道永远停在原地 ——
      第一版就是这么写死的，实测 scrollLeft 五秒不动。
    */
    let pos = el.scrollLeft

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = last ? Math.min(now - last, 64) : 0
      last = now
      if (!inView || hovering || now < pausedUntil || now < dwellUntil) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 1) return
      pos += dir * SPEED * dt
      if (pos >= max) {
        pos = max
        dir = -1
        dwellUntil = now + DWELL
      } else if (pos <= 0) {
        pos = 0
        dir = 1
        dwellUntil = now + DWELL
      }
      el.scrollLeft = pos
    }

    pause.current = () => {
      pausedUntil = performance.now() + RESUME
      // 读者刚拖/滚过，位置以他为准，恢复时从那里接着走
      pos = el.scrollLeft
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inView = e.isIntersecting
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    io.observe(root)

    const enter = () => {
      hovering = true
    }
    const leave = () => {
      hovering = false
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('focusin', enter)
    el.addEventListener('focusout', leave)

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('focusin', enter)
      el.removeEventListener('focusout', leave)
      pause.current = () => {}
    }
  }, [])

  /** 刚拖完的那一次 click 不算点击，否则一拖就跳走。 */
  const swallowClick = (e: React.MouseEvent) => {
    if (!dragged.current) return
    dragged.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  /** 进度条：点哪跳哪，按住可拖。这是把藏掉的滚动条还回来。 */
  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rail.current
    if (!el) return
    pause.current()
    const box = e.currentTarget.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
    el.scrollLeft = t * (el.scrollWidth - el.clientWidth)
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture(e.pointerId)
  }

  const thumb = Math.max(14, Math.min(100, ratio * 100))

  return (
    <Section id="work" title={worksIntro.headline} intro={worksIntro.body}>
      <div ref={scene}>
      <div className="rail-top">
        <p className="rail-hint">
          {/* 手机上这四样一个都没有：不自动滚、没有悬停、没有滚轮，箭头也收起来了。
              用 CSS 换而不是 JS 判断 —— 这一页是预渲染的，JS 判断会水合不一致。 */}
          <span className="rail-hint__fine">自动横滚，悬停即停 · 也可滚轮 / 拖拽 / 箭头</span>
          <span className="rail-hint__coarse">左右滑动看全部</span> · <b>{projects.length}</b> 个
        </p>
        <div className="rail-nav">
          <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="上一张">
            ←
          </button>
          <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="下一张">
            →
          </button>
        </div>
      </div>

      <div
        className="rail"
        id="work-rail"
        ref={rail}
        onClickCapture={swallowClick}
        /* 键盘可达。 */
        tabIndex={0}
        role="group"
        aria-roledescription="横向卡轨"
        aria-label={`${projects.length} 个作品，左右方向键横推`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') pause.current()
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            page(1)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            page(-1)
          }
        }}
      >
        {projects.map((p, i) => (
          <article className="wcard" data-t={p.tint} key={p.slug}>
            <div className="wcard__top">
              {/* 编号不做水印，直接当版式的一部分：巨号 + 年份并排，右边是状态。
                  水印做法上一版被读成「字显示不全」，这样它完整、也有信息。 */}
              <b className="wcard__no">{String(i + 1).padStart(2, '0')}</b>
              <span className="wcard__year">{p.year}</span>
              <span className="wcard__state" data-s={p.state}>
                {STATE[p.state]}
              </span>
            </div>

            <h3 className="wcard__name">{p.name}</h3>
            <p className="wcard__cn">{p.cn}</p>
            <p className="wcard__blurb">{p.blurb}</p>

            <ul className="wcard__stack">
              {p.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>

            <div className="wcard__foot">
              <p className="wcard__nums">
                {p.stars > 0 && (
                  <span>
                    <b>{p.stars.toLocaleString('en-US')}</b> Star
                  </span>
                )}
                {p.forks > 0 && (
                  <span>
                    <b>{p.forks}</b> Fork
                  </span>
                )}
              </p>
              <p className="wcard__links">
                {p.live && (
                  <a href={p.live} target="_blank" rel="noreferrer">
                    打开 ↗
                  </a>
                )}
                <a href={p.repo} target="_blank" rel="noreferrer">
                  源码 ↗
                </a>
              </p>
            </div>
          </article>
        ))}
        <i className="rail-pad" aria-hidden="true" />
      </div>

      {/* 自绘进度条。 */}
      <div
        className="rail-bar"
        aria-hidden="true"
        onPointerDown={seek}
        onPointerMove={(e) => e.buttons === 1 && seek(e)}
      >
        <i style={{ width: `${thumb}%`, left: `calc((100% - ${thumb}%) * ${prog})` }} />
      </div>

      <aside className="hub" ref={hubRef}>
        <p className="hub__t">
          <b>{hub.title}</b>
          <span>{hub.blurb}</span>
        </p>
        <a className="btn btn--ghost" href={hub.href} target="_blank" rel="noreferrer">
          {hub.label}
          <i aria-hidden="true">↗</i>
        </a>
      </aside>
      </div>
    </Section>
  )
}
