/**
 * 横向溢出检测（在浏览器上下文里执行，必须自包含、不能闭包外部变量）。
 *
 * 判定口径：**只有祖先链全程 overflow-x: visible 的元素越出视口才算 bug**。
 * 无缝轮播的 .hscroll__track 本来就有视口三倍宽、克隆项还会被 translateX
 * 推到视口左边去，但父级 .hscroll 是 overflow:hidden —— 用户看不到、也拉
 * 不出横向滚动条，那不是 bug。真正的 bug 是没人裁的元素把页面撑宽。
 * 兜底再看一眼 documentElement 有没有真的出现横向滚动条。
 */
export const findOverflow = () => {
  const clipsX = (cs) => cs.overflowX !== 'visible'
  const bad = []
  const de = document.documentElement
  if (de.scrollWidth > de.clientWidth + 1) {
    bad.push(`document scrollWidth=${de.scrollWidth} > clientWidth=${de.clientWidth}`)
  }
  for (const el of document.querySelectorAll('#root *')) {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const cs = getComputedStyle(el)
    if (cs.position === 'fixed' || cs.visibility === 'hidden') continue
    if (r.right <= window.innerWidth + 2 && r.left >= -2) continue

    let clipped = false
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (clipsX(getComputedStyle(p))) {
        clipped = true
        break
      }
    }
    if (clipped) continue
    bad.push(
      `${el.tagName}.${String(el.className || '').slice(0, 48)} ` +
        `[${Math.round(r.left)},${Math.round(r.right)}] vw=${window.innerWidth}`,
    )
  }
  return bad.slice(0, 14)
}
