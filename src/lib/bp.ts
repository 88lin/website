/**
 * 断点。全站只有这一个数。
 *
 * v8 出过一个真实事故：CSS 写 `@media (max-width: 900px)`，JS 写
 * `useMediaQuery('(min-width: 900px)')`。视口正好 900px 时两边同时成立，
 * 于是 GSAP 去 pin 一条 CSS 已经拆掉的跑道，pin-spacer 撑出一屏空白。
 *
 * 修法不是把某一边挪一格了事，而是把区间写成严格互补，并且只写一次：
 *   窄屏 = [0, 900]      → CSS `@media (max-width: 900px)`
 *   宽屏 = [901, ∞)      → JS  `useMediaQuery(WIDE_MQ)`
 * 两者交集为空，并集为全体。改这里的时候必须同步改 index.css 里的 900。
 */

/** 窄屏上界，单位 px。index.css 的所有 `max-width: 900px` 都指这个数。 */
export const NARROW_MAX = 900

/** 宽屏媒体查询。只有它能给「宽屏才建的 GSAP 场景」放行。 */
export const WIDE_MQ = `(min-width: ${NARROW_MAX + 1}px)`
