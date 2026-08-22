/**
 * 03 作品。七个还在线上跑着的东西，横着推。
 *
 * 上一版这里是个真 bug：容器确实可以横向滚（scrollWidth 2136 / clientWidth 1168），
 * 但**鼠标滚轮滚不动横向容器**，而我又把滚动条藏了——于是鼠标用户既没有可用输入，
 * 也没有任何提示。我在旧注释里写「原生滚动天生支持滚轮横滑」，那句话只对触控板成立，
 * 对滚轮是错的。用户的原话是「横向滑动 · 7 个它自己为什么不能滚动？」，问得对。
 *
 * 这一版四种输入都通，且都有可见提示：
 *  1) 滚轮 —— 竖向滚轮转成横移，推到头再把滚动交回页面（不劫持整页）
 *  2) 拖拽 —— 按住就能拖，拖动超过阈值时吃掉那一次 click，不误点开链接
 *  3) 箭头 —— 到头即置灰，提示是真的而不是装饰
 *  4) 进度条 —— 藏起来的滚动条用一条自绘的替回来，可点可拖
 * 触摸与键盘走原生 overflow 行为，不需要额外代码。
 *
 * 另加一层「随页面滚动自己走」：本章经过视口时，轨道按章节滚动进度往前推六成行程。
 * 它解决的是发现性 —— 一条不动的横轨，读者根本不知道右边还有东西。
 * 一旦读者自己动过手（滚轮、拖、箭头、方向键），这层立刻永久让位，
 * 不跟人抢方向盘。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Section } from '../components/Section'
import { projects, worksIntro } from '../content/site'
import { useLazyScene, type SceneApi } from '../lib/motion'

const STATE: Record<string, string> = {
  live: '在线',
  maintained: '长期维护',
  archived: '已归档',
}

export function Work() {
  const rail = useRef<HTMLDivElement | null>(null)
  const dragged = useRef(false)
  /** 读者自己动过手就不再自动推。一次为真、永远为真，不做超时恢复。 */
  const taken = useRef(false)
  const scene = useRef<HTMLDivElement | null>(null)

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
    taken.current = true
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
      taken.current = true
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
      taken.current = true
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

  /*
    随滚动推进。只推 60% 行程：全推到底的话读者到这一章就没事可做了，
    留 40% 给他自己滑，箭头与进度条才有存在的意义。
  */
  const build = useCallback(({ ScrollTrigger, root }: SceneApi) => {
    const el = rail.current
    if (!el) return
    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self: { progress: number }) => {
        if (taken.current) return
        const max = el.scrollWidth - el.clientWidth
        if (max <= 0) return
        // 进度 0–1 里取中间那段（0.15–0.85）做映射，两头留静止区，
        // 否则章节刚露头轨道就在动，读者还没看清它是什么
        const t = Math.min(1, Math.max(0, (self.progress - 0.15) / 0.7))
        el.scrollLeft = t * max * 0.6
      },
    })
  }, [])

  useLazyScene(scene, build)

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
    taken.current = true
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
          随滚动自动推进，也可以滚轮 / 拖拽 / 箭头接手 · <b>{projects.length}</b> 个
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
        /*
          键盘可达。overflow 容器本身不可聚焦，所以键盘用户根本进不来 ——
          这和「鼠标滚不动」是同一类缺陷，只是发生在另一种输入上。
          tabIndex + 方向键接管之后，Tab 能落进来，← → 一次推一张。
        */
        tabIndex={0}
        role="group"
        aria-roledescription="横向卡轨"
        aria-label={`${projects.length} 个作品，左右方向键横推`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') taken.current = true
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

      {/*
        自绘进度条。这里刻意不写 role="scrollbar"：那个角色要求可聚焦并自带键盘协议，
        半套实现比没有更糟。轨道本身已经可聚焦、可用方向键推，所以这条对辅助技术
        隐藏，只做视觉提示与鼠标快捷跳位。
      */}
      <div
        className="rail-bar"
        aria-hidden="true"
        onPointerDown={seek}
        onPointerMove={(e) => e.buttons === 1 && seek(e)}
      >
        <i style={{ width: `${thumb}%`, left: `calc((100% - ${thumb}%) * ${prog})` }} />
      </div>
      </div>
    </Section>
  )
}
