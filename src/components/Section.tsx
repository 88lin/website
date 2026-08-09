import { forwardRef, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { railProgress } from '../lib/motion'

export type SectionTone = 'cream' | 'creamDark' | 'brand' | 'pop' | 'dark'

type Props = {
  id: string
  /** 竖排微标签。全站每个区块有且只有一个，挂在基准线上。 */
  label: ReactNode
  tone?: SectionTone
  children: ReactNode
  className?: string
  /** 给 .sec__inner（版心栅格容器）追加类 */
  innerClassName?: string
  /** 给 .sec__body（正文列）追加类 */
  bodyClassName?: string
  /** 覆盖上下留白。Hero 要给固定导航让位，Contact 要更满。 */
  padTop?: string
  padBottom?: string
  /** 版心之外、区块之内的满宽内容（页脚、出血带）。不参与基准线栅格。 */
  after?: ReactNode
}

/**
 * 栏外注基准线壳。
 *
 * 每个区块共享同一条 1px 竖线（落在版心内容区左边界），线上挂竖排微标签和一段
 * 滚动进度高亮。区块之间的差异靠正文列里的排版逻辑拉开——谁跨过线、谁贴着线、
 * 谁退到线右边——而不是靠换背景色。
 */
export const Section = forwardRef<HTMLElement, Props>(function Section(
  {
    id,
    label,
    tone = 'cream',
    children,
    className = '',
    innerClassName = '',
    bodyClassName = '',
    padTop,
    padBottom,
    after,
  },
  ref
) {
  const local = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = local.current
    if (!el) return
    const prog = el.querySelector<HTMLElement>('.sec__prog')
    if (prog) railProgress(prog, el)
  }, [])

  const style: CSSProperties = {}
  if (padTop) (style as Record<string, string>)['--sec-pt'] = padTop
  if (padBottom) (style as Record<string, string>)['--sec-pb'] = padBottom

  return (
    <section
      id={id}
      ref={(node) => {
        local.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node
      }}
      className={`sec sec--${tone} ${className}`}
      style={style}
    >
      <div className={`shell sec__inner ${innerClassName}`}>
        <div className="sec__gutter">
          <span aria-hidden className="sec__rail">
            <i className="sec__prog" />
          </span>
          <p className="eyebrow eyebrow--rail">{label}</p>
        </div>
        <div className={`sec__body ${bodyClassName}`}>{children}</div>
      </div>
      {after}
    </section>
  )
})
