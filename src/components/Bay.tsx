/**
 * 一格通道。机架上的一层，也是首页的一屏。
 *
 * 通道号不写成压在标题上方的小标签——那是所有作品集都长一样的原因之一。
 * 它写在左侧导轨里竖排着，跟安装孔和状态灯在一起，因为它本来就是
 * 机架上的地址（#ch-04 就是案例通道），不是标题的装饰前缀。
 *
 * 机身窗口（win）是这套视觉能成立的关键：每格都有不透明的饱和底色，
 * 不开窗的话后面那块画布一像素都露不出来。开窗就是在机身上真的切一个
 * 矩形洞——四块挡板围出来，洞里什么都不铺。
 *
 * 洞里默认放构建期从同一个场景截出来的静态图版，所以预渲染的 HTML 一落地
 * 就已经「看得见机器」，不需要加载页；实时场景点着以后图版让位给画布。
 */

import type { ReactNode } from 'react'
import type { Channel } from '../content/site'
import { useAsset } from '../lib/asset'

export type Win = {
  /** 洞的位置与大小，都是相对这格 bay 的百分比 */
  x: string
  y: string
  w: string
  h: string
  /** 洞左上角的丝印标 */
  tag?: string
  /** 静态图版文件名（不含扩展名），位于 public/plates/ */
  plate?: string
  /** 图版裁切锚点，对应 CSS 的 object-position */
  pos?: string
  /** 首屏那格要立刻加载，其余懒加载 */
  eager?: boolean
}

export function Lamp({ state = 'live', live = false }: { state?: 'live' | 'standby' | 'off'; live?: boolean }) {
  return <span className="lamp" data-state={state} data-live={live ? 1 : 0} aria-hidden />
}

export function State({ value }: { value: 'live' | 'maintained' | 'archived' }) {
  const label = value === 'live' ? '在线' : value === 'maintained' ? '维护中' : '已归档'
  const lamp = value === 'live' ? 'live' : value === 'maintained' ? 'standby' : 'off'
  return (
    <span className="state" data-state={value}>
      <Lamp state={lamp} live={value === 'live'} />
      {label}
    </span>
  )
}

export function Bay({
  ch,
  win,
  className,
  children,
}: {
  ch: Channel
  win?: Win
  className?: string
  children: ReactNode
}) {
  const asset = useAsset()
  return (
    <section
      id={`ch-${ch.no}`}
      className={className ? `bay ${className}` : 'bay'}
      data-ground={ch.ground}
      data-channel={ch.no}
      data-window={win ? '' : undefined}
      aria-labelledby={`ch-${ch.no}-t`}
    >
      {win ? (
        <div
          className="chassis"
          aria-hidden
          style={{
            ['--win-x' as string]: win.x,
            ['--win-y' as string]: win.y,
            ['--win-w' as string]: win.w,
            ['--win-h' as string]: win.h,
          }}
        >
          <i />
          <i />
          <i />
          <i />
          <div className="chassis__bezel">
            {win.plate ? (
              <span className="plateshot">
                <img
                  src={asset(`plates/${win.plate}.webp`)}
                  alt=""
                  loading={win.eager ? 'eager' : 'lazy'}
                  decoding="async"
                  style={win.pos ? ({ ['--plate-pos' as string]: win.pos } as React.CSSProperties) : undefined}
                />
              </span>
            ) : null}
            {win.tag ? (
              <span className="chassis__tag silk-label">
                <Lamp state="live" live />
                {win.tag}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rail" aria-hidden>
        <span className="rail__no">CH.{ch.no}</span>
        <span className="rail__holes" />
        <Lamp state={ch.state === 'live' ? 'live' : 'standby'} live={ch.state === 'live'} />
      </div>

      <div className="bay__in">{children}</div>
    </section>
  )
}
