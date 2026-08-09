/**
 * 两枚线性箭头。全站只有这两个图标，都是纯几何线段。
 *
 * 不用 emoji、不用图标字体：emoji 在不同系统里是不同的画，图标字体要多下一份
 * 文件还会在 FOIT 期间留一片空白。1em 见方、跟着 currentColor 走，用哪都对。
 */

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

/** 右上外链箭头 */
export const ArrowOut = () => (
  <svg {...base}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
)

/** 左向返回箭头 */
export const ArrowBack = () => (
  <svg {...base}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)
