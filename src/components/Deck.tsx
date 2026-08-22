/**
 * 首屏案例叠卡：四张，真的能翻。
 *
 * 上一版这里是纯装饰——三张死的彩色卡垫在蓝卡后面，看着像能翻其实没有任何交互，
 * 用户第一句话就是「为啥不能滑动到下一张」。看起来能操作的东西必须真的能操作，
 * 这条没有余地。
 *
 * 实现：不做 DOM 重排，只算「槽位」。第 i 张卡的槽位 = (i - index + n) % n，
 * 槽位决定 transform，换 index 时靠 CSS transition 走位。四张卡的 DOM 节点从不移动，
 * React 不必重排，动画也不会因为重挂载而断。
 *
 * 四种输入都通：拖、点箭头、点圆点、左右方向键。
 * 手感：不拖的时候整叠跟指针微倾（±5°，CSS 里换算），拖动时倾斜让位给位移，
 * 松手回正。倾斜幅度刻意压得比常见的「卡片 3D hover」小一档 —— 那种一动就翻 15°
 * 的做法在真用的时候很晃眼。
 *
 * 卡面上曾经压过一个切边出血的巨号编号。删了：用户第一反应是「字显示不全，故意的吗」。
 * 出血在海报上成立，在网页上会被读成渲染出错 —— 读者的默认假设是「文字应该完整」。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cases } from '../content/cases'
import { Link } from '../router'
import { useTilt } from '../lib/motion'

/** 拖过这个距离才算翻页，低于它松手就弹回；也用来判断这一下是拖还是点。 */
const THRESHOLD = 56
const CLICK_SLOP = 6

export function Deck() {
  const n = cases.length
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const moved = useRef(0)
  const host = useRef<HTMLDivElement | null>(null)
  /* 指针微倾：钩子只写 --px / --py，转成多少度交给 CSS（见 index.css .dcard） */
  const tilt = useTilt<HTMLDivElement>()

  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n])

  const onDown = (e: React.PointerEvent) => {
    // 右键与中键不参与拖拽，交回浏览器
    if (e.button !== 0) return
    setDragging(true)
    startX.current = e.clientX
    moved.current = 0
    // 这里**不能**抢指针。Chrome 在指针被捕获时会把兼容鼠标事件（含 click）
    // 一并重定向到捕获元素上，于是 click 落在 .deck__stack 而不是卡里的链接上，
    //「看完整案例」永远点不动 —— 用户报的就是这个。改成越过阈值才抢（见 onMove）。
  }

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const d = e.clientX - startX.current
    moved.current = Math.max(moved.current, Math.abs(d))
    // 真的在拖了才接管指针：低于阈值时这一下还可能是普通点击，
    // 抢了就会把 click 从链接身上夺走。
    if (moved.current > CLICK_SLOP && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDrag(d)
  }

  const onUp = () => {
    if (!dragging) return
    setDragging(false)
    const d = drag
    setDrag(0)
    // 往左拖看下一张，往右拖看上一张——和翻实体卡片的方向一致
    if (d < -THRESHOLD) go(1)
    else if (d > THRESHOLD) go(-1)
  }

  /* 键盘：左右方向键翻页。整块是 role=group 且可聚焦，Tab 能落进来。 */
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

  const cur = cases[index]

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
        aria-label={`四个案例，当前第 ${index + 1} 张：${cur.name}。左右方向键翻页`}
        data-dragging={dragging ? '1' : undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {cases.map((c, i) => {
          const slot = (i - index + n) % n
          const front = slot === 0
          return (
            <article
              className="dcard"
              key={c.slug}
              data-slot={slot}
              data-t={c.tint}
              aria-hidden={!front}
              style={
                {
                  '--dx': front ? `${drag}px` : '0px',
                  '--rot': front ? `${(drag * 0.016).toFixed(3)}deg` : '0deg',
                } as React.CSSProperties
              }
            >
              <p className="dcard__spine" aria-hidden="true">
                {c.name}
              </p>

              <div className="dcard__say">
                <p className="dcard__meta">
                  CASE {c.no}
                  <s />
                  {c.year}
                  <s />
                  {c.role}
                </p>

                <h3 className="dcard__claim">{c.claim}</h3>

                <p className="dcard__stack">{c.stackLine}</p>

                <div className="dcard__nums">
                  {c.results.slice(0, 3).map((r) => (
                    <span key={r.label}>
                      <b>{r.value}</b>
                      <s>{r.label}</s>
                    </span>
                  ))}
                </div>
              </div>

              {front && (
                <Link
                  className="dcard__go"
                  to={`/case/${c.slug}/`}
                  onClick={(e) => {
                    // 刚才那一下是拖不是点，别顺手把人带走
                    if (moved.current > CLICK_SLOP) e.preventDefault()
                  }}
                >
                  看完整案例
                  <i aria-hidden="true">→</i>
                </Link>
              )}
            </article>
          )
        })}
      </div>

      <div className="deck__ctl">
        <button type="button" className="deck__arrow" onClick={() => go(-1)} aria-label="上一个案例">
          ←
        </button>
        <span className="deck__dots" role="tablist" aria-label="选择案例">
          {cases.map((c, i) => (
            <button
              type="button"
              key={c.slug}
              role="tab"
              aria-selected={i === index}
              aria-label={c.name}
              data-on={i === index ? '1' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </span>
        <button type="button" className="deck__arrow" onClick={() => go(1)} aria-label="下一个案例">
          →
        </button>
        <span className="deck__hint">拖卡片，或按 ← → 翻 {n} 个案例</span>
      </div>
    </div>
  )
}
