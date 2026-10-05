/**
 * 首屏项目叠卡。名单 = projects 里 star ≥ DECK_MIN_STARS 的，按 star 降序。
 *
 * 不做 DOM 重排，只算槽位：第 i 张的槽位 = (i - index + n) % n，槽位决定 transform。
 * 拖 / 箭头 / 圆点 / 方向键四种输入都能翻。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cases } from '../content/cases'
import { DECK_MIN_STARS, projects } from '../content/site'
import { Link } from '../router'
import { useTilt } from '../lib/motion'

/** 拖过这个距离才算翻页；也用来判断这一下是拖还是点。 */
const THRESHOLD = 56
const CLICK_SLOP = 6

const STATE: Record<string, string> = {
  live: '在线',
  maintained: '长期维护',
  archived: '已归档',
}

const deckItems = projects
  .filter((p) => p.stars >= DECK_MIN_STARS)
  .slice()
  .sort((a, b) => b.stars - a.stars)

const caseBySlugRepo = new Map(cases.map((c) => [c.repo, c.slug]))

export function Deck() {
  const n = deckItems.length
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const moved = useRef(0)
  const pointer = useRef<number | null>(null)
  const host = useRef<HTMLDivElement | null>(null)
  const tilt = useTilt<HTMLDivElement>()

  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n])

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary || pointer.current !== null) return // 只跟踪一个主指针
    pointer.current = e.pointerId
    setDragging(true)
    startX.current = e.clientX
    moved.current = 0
    // 别在这里 setPointerCapture：Chrome 会把 click 一并重定向到捕获元素上，
    // 卡里的链接就永远点不动了。越过阈值才抢，见 onMove。
  }

  const onMove = (e: React.PointerEvent) => {
    if (pointer.current !== e.pointerId) return
    if (e.buttons === 0) {
      onCancel()
      return
    }
    const d = e.clientX - startX.current
    moved.current = Math.max(moved.current, Math.abs(d))
    if (moved.current > CLICK_SLOP && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDrag(d)
  }

  const onUp = (e: React.PointerEvent) => {
    if (pointer.current !== e.pointerId) return
    const d = e.clientX - startX.current
    onCancel()
    if (d < -THRESHOLD) go(1)
    else if (d > THRESHOLD) go(-1)
  }

  // 系统接管触摸（如纵向滚动）或丢失指针时，只复位，不把中断当成翻页。
  const onCancel = () => {
    const id = pointer.current
    pointer.current = null
    setDragging(false)
    setDrag(0)
    if (id !== null && host.current?.hasPointerCapture(id)) host.current.releasePointerCapture(id)
  }

  useEffect(() => {
    const el = host.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [go])

  const cur = deckItems[index]

  return (
    <div className="deck">
      <div
        className="deck__stack"
        ref={(el) => {
          host.current = el
          tilt.current = el
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="卡组"
        aria-label={`star 最多的 ${n} 个项目，当前第 ${index + 1} 张：${cur.name}。左右方向键翻页`}
        data-dragging={dragging ? '1' : undefined}
        // 链接的原生 HTML 拖放会触发 pointercancel，中断卡片手势。
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onPointerLeave={(e) => {
          // 未达到横拖阈值就移出卡组时尚未捕获指针，外部松手不会回到这里。
          if (pointer.current === e.pointerId && !e.currentTarget.hasPointerCapture(e.pointerId)) onCancel()
        }}
        onLostPointerCapture={(e) => {
          // 触摸从子元素的隐式捕获转给卡组时，也会冒泡 lostpointercapture。
          if (e.target === e.currentTarget) onCancel()
        }}
      >
        {deckItems.map((p, i) => {
          const slot = (i - index + n) % n
          const front = slot === 0
          return (
            <article
              className="dcard"
              key={p.slug}
              data-slot={slot}
              data-t={p.tint}
              aria-hidden={!front}
              style={
                {
                  '--dx': front ? `${drag}px` : '0px',
                  '--rot': front ? `${(drag * 0.016).toFixed(3)}deg` : '0deg',
                } as React.CSSProperties
              }
            >
              <b className="dcard__ghost" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </b>

              <p className="dcard__spine" aria-hidden="true">
                {p.name}
              </p>

              <div className="dcard__say">
                {/* kind 与 state 偶尔会撞，撞了只出一个 */}
                <p className="dcard__meta">
                  {p.kind}
                  <s />
                  {p.year}
                  {STATE[p.state] !== p.kind && (
                    <>
                      <s />
                      {STATE[p.state]}
                    </>
                  )}
                </p>

                <h3 className="dcard__claim">{p.cn}</h3>

                <p className="dcard__blurb">{p.blurb}</p>

                <p className="dcard__stack">{p.stack.join(' · ')}</p>

                {(p.stars > 0 || p.forks > 0) && (
                  <div className="dcard__nums">
                    {/* data-k 给闸门区分 star / fork，两者长得一样 */}
                    {p.stars > 0 && (
                      <span data-k="star">
                        <b>{p.stars.toLocaleString('en-US')}</b>
                        <s>GitHub Star</s>
                      </span>
                    )}
                    {p.forks > 0 && (
                      <span data-k="fork">
                        <b>{p.forks}</b>
                        <s>Fork</s>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {front &&
                (() => {
                  const caseSlug = caseBySlugRepo.get(p.repo)
                  return caseSlug ? (
                    <Link
                      className="dcard__go"
                      to={`/case/${caseSlug}/`}
                      onClick={(e) => {
                        if (e.detail > 0 && moved.current > CLICK_SLOP) e.preventDefault() // 只拦拖动产生的鼠标点击
                      }}
                    >
                      看完整案例
                      <i aria-hidden="true">→</i>
                    </Link>
                  ) : (
                    <a
                      className="dcard__go"
                      href={p.live ?? p.repo}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => {
                        if (e.detail > 0 && moved.current > CLICK_SLOP) e.preventDefault()
                      }}
                    >
                      {p.live ? '打开看看' : '看源码'}
                      <i aria-hidden="true">↗</i>
                    </a>
                  )
                })()}
            </article>
          )
        })}
      </div>

      <div className="deck__ctl">
        <button type="button" className="deck__arrow" onClick={() => go(-1)} aria-label="上一个项目">
          ←
        </button>
        <span className="deck__dots" role="tablist" aria-label="选择项目">
          {deckItems.map((p, i) => (
            <button
              type="button"
              key={p.slug}
              role="tab"
              aria-selected={i === index}
              aria-label={p.name}
              data-on={i === index ? '1' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </span>
        <button type="button" className="deck__arrow" onClick={() => go(1)} aria-label="下一个项目">
          →
        </button>
        <span className="deck__hint">star 最多的 {n} 个 · 卡片可以直接拖</span>
      </div>
    </div>
  )
}
