/**
 * 手绘层。三个零件，全部走布局流。
 *
 * v6 把手写批注做成不透明胶囊 position:absolute 压在两张卡上方，
 * 直接吃掉左卡半行正文和右卡一整个小标题。所以这里立三条规矩：
 *
 *  1) `Frame` 的虚线框画在**内容盒之外**，内容至少留 18px 内距（.frame 的 padding）。
 *  2) `Annot` 是一个正常的流内块，跟正文并排或另起一行，永远不叠上去。
 *  3) `Circle` 是唯一压在字上的东西，但它只有一条 1.6px 的描边，
 *     并且 pointer-events:none —— 命中测试穿透它，字还是字。
 *
 * 颜色不走 frame.ts 的 annotColor 轮换表：那张表里有 --highlight，
 * 黄色描边压在米白纸上只有 1.3:1，等于没画。这里一律继承所在色调的 --accent。
 */

import type { ReactNode } from 'react'
import { handCircle, handFrame, handLead } from '../lib/frame'

/** 虚线手绘框。包住一段内容，框线在内容之外。 */
export function Frame({
  seed,
  className,
  children,
}: {
  seed: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className ? `frame ${className}` : 'frame'}>
      <svg className="frame__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={handFrame(seed)} />
      </svg>
      {children}
    </div>
  )
}

/** 圈注。给一个词套一圈手画的椭圆，字本身不动。 */
export function Circle({ seed, children }: { seed: string; children: ReactNode }) {
  return (
    <span className="circ">
      <svg className="circ__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={handCircle(seed)} />
      </svg>
      <span className="circ__t">{children}</span>
    </span>
  )
}

/**
 * 手写旁批。带一条手画引线，整体是流内块。
 * `data-annot` 是给审计 G14 认的标记：它和任何正文块的矩形交叠面积必须为 0。
 */
export function Annot({
  seed,
  children,
  className,
}: {
  seed: string
  children: ReactNode
  className?: string
}) {
  return (
    <p className={className ? `annot ${className}` : 'annot'} data-annot="">
      <svg className="annot__lead" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={handLead(seed)} />
      </svg>
      <span>{children}</span>
    </p>
  )
}
