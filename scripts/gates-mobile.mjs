/**
 * G21 / G22 的浏览器内取数函数。放在单独文件里，是因为这两关要在
 * Chromium 和 WebKit 两个引擎上跑同一份逻辑，写在 audit.mjs 里会重复两遍。
 *
 * 全部函数都以字符串形式被 page.evaluate 序列化，所以不能引用模块作用域的东西。
 */

/** 一屏内的可用性取数。返回值全是可判定的数，不含主观描述。 */
export const MOBILE_PROBE = () => {
  const de = document.documentElement
  const vh = window.innerHeight

  /* ① 跑道：worksPan() 会往 .work__rail 写内联 height。窄屏不该建跑道，
        所以内联样式必须是空的，元素高度必须由内容决定。 */
  const rail = document.querySelector('.work__rail')
  const track = document.querySelector('.work__track')
  const vp = document.querySelector('.work__vp')
  const railInline = rail ? rail.style.height : null
  const railH = rail ? Math.round(rail.getBoundingClientRect().height) : null
  const railContent = rail
    ? Math.round(
        [...rail.children].reduce((mx, c) => Math.max(mx, c.getBoundingClientRect().bottom), 0) -
          rail.getBoundingClientRect().top,
      )
    : null

  /* ② 横滑容器：竖排之后 track 不该还能横滚，也不该残留 transform。 */
  const trackCS = track ? getComputedStyle(track) : null

  /* ③ ScrollTrigger 的 pin 会插一个 .pin-spacer；窄屏不该有。 */
  const pinSpacers = document.querySelectorAll('#work .pin-spacer, .pin-spacer').length

  /* ④ 单轴 overflow：只写 overflow-x 时规范会把另一轴算成 auto，
        那一轴会吞掉触摸的竖向手势，页面看起来「滑不动」。 */
  const badAxis = []
  for (const el of document.querySelectorAll('#root *')) {
    const cs = getComputedStyle(el)
    if (!/^(auto|scroll)$/.test(cs.overflowX)) continue
    if (cs.overflowY === 'hidden' || cs.overflowY === 'clip') continue
    const r = el.getBoundingClientRect()
    if (r.width * r.height < 400) continue
    badAxis.push(`${String(el.className).split(' ')[0] || el.tagName} x=${cs.overflowX} y=${cs.overflowY}`)
  }

  /* ⑤ 空白死区：按章统计内容矩形的纵向并集，找最大的无内容缝。 */
  const gaps = []
  for (const sec of document.querySelectorAll('#root section[id]')) {
    const sr = sec.getBoundingClientRect()
    const secBg = getComputedStyle(sec).backgroundColor
    const spans = []
    for (const el of sec.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.height <= 0 || r.width <= 0) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue
      let inked = false
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) inked = true
      }
      if (!inked && el.tagName.toLowerCase() === 'svg') inked = true
      if (!inked && cs.backgroundColor !== secBg && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') inked = true
      if (!inked) continue
      spans.push([r.top, r.bottom])
    }
    if (!spans.length) continue
    spans.sort((a, b) => a[0] - b[0])
    const merged = [spans[0].slice()]
    for (const s of spans.slice(1)) {
      const last = merged[merged.length - 1]
      if (s[0] <= last[1] + 1) last[1] = Math.max(last[1], s[1])
      else merged.push(s.slice())
    }
    let worst = 0
    for (let i = 1; i < merged.length; i++) worst = Math.max(worst, merged[i][0] - merged[i - 1][1])
    // 章首和章尾的留白是设计padding，不算死区，只看内容之间的缝
    if (worst > 0) gaps.push({ id: sec.id, gap: Math.round(worst), h: Math.round(sr.height) })
  }

  return {
    scrollW: de.scrollWidth,
    clientW: de.clientWidth,
    docH: Math.round(de.scrollHeight),
    vh,
    railInline,
    railH,
    railContent,
    vpMinH: vp ? getComputedStyle(vp).minHeight : null,
    trackScrollW: track ? track.scrollWidth : null,
    trackClientW: track ? track.clientWidth : null,
    trackTransform: trackCS ? trackCS.transform : null,
    trackOverflowY: trackCS ? trackCS.overflowY : null,
    pinSpacers,
    badAxis: [...new Set(badAxis)],
    gaps: gaps.sort((a, b) => b.gap - a.gap).slice(0, 4),
    cards: document.querySelectorAll('.pcard').length,
  }
}

/** G22：所有该点得动的东西都真的点得动。 */
export const CLICK_PROBE = () => {
  const bad = []
  const info = {}

  const hrefOf = (a) => a.getAttribute('href')
  const dead = (h) => !h || h === '#' || h.trim() === ''

  // ① 博客最新六条
  const posts = [...document.querySelectorAll('.notes__list li')]
  info.posts = posts.length
  posts.forEach((li, i) => {
    const a = li.querySelector('a')
    if (!a) return bad.push(`博客第 ${i + 1} 条不是链接`)
    const h = hrefOf(a)
    if (dead(h)) return bad.push(`博客第 ${i + 1} 条 href 为空`)
    if (!/^https?:\/\//.test(h)) bad.push(`博客第 ${i + 1} 条 href 不是绝对地址：${h}`)
  })

  // ② 数字花园精选（含末尾导航站那块）
  const cells = [...document.querySelectorAll('.gcell')]
  info.cells = cells.length
  cells.forEach((c, i) => {
    if (c.tagName.toLowerCase() !== 'a') return bad.push(`花园第 ${i + 1} 格不是 <a>`)
    const h = hrefOf(c)
    if (dead(h)) return bad.push(`花园第 ${i + 1} 格 href 为空`)
    if (!/^https?:\/\//.test(h)) bad.push(`花园第 ${i + 1} 格 href 不是绝对地址：${h}`)
  })

  // ③ 作品卡的按钮必须真的落在卡里（用户原话：按钮要放在卡片内部）
  const cards = [...document.querySelectorAll('.pcard')]
  info.cards = cards.length
  let btns = 0
  cards.forEach((card, i) => {
    const cr = card.getBoundingClientRect()
    const acts = [...card.querySelectorAll('.pcard__act .pill')]
    if (!acts.length) return bad.push(`作品卡 ${i + 1} 没有卡内按钮`)
    btns += acts.length
    for (const a of acts) {
      const r = a.getBoundingClientRect()
      const inside = r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5 && r.top >= cr.top - 0.5 && r.bottom <= cr.bottom + 0.5
      if (!inside) bad.push(`作品卡 ${i + 1} 的「${a.textContent.trim()}」溢出卡片`)
      if (dead(hrefOf(a))) bad.push(`作品卡 ${i + 1} 的「${a.textContent.trim()}」href 为空`)
      if (r.height < 28) bad.push(`作品卡 ${i + 1} 的「${a.textContent.trim()}」高度 ${Math.round(r.height)}px < 28px`)
    }
  })
  info.btns = btns

  // ④ 全站不许有死链接壳子
  const all = [...document.querySelectorAll('#root a')]
  info.links = all.length
  const deadAll = all.filter((a) => dead(hrefOf(a)))
  if (deadAll.length)
    bad.push(`${deadAll.length} 个 <a> 没有可用 href：${deadAll.slice(0, 4).map((a) => a.textContent.trim().slice(0, 12) || a.className).join(' | ')}`)

  return { bad, info }
}
