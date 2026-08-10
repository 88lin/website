/**
 * 截图容器。全站每一张真实界面都从这里出。
 *
 * 为什么要收进一个组件：异构截图（深色播放器、白底文档、GitHub 社交卡）放在
 * 一起会散，统一靠的是**同一套容器**，不是滤镜。滤镜洗过的截图不再是证据。
 * 所以这里固定四件事：裁切比、顶部对齐、同色相投影、显式宽高。
 *
 * 两种取图方式：
 *  - shot：真实页面截图，按比例裁，顶部对齐（网站的信息都在上半屏）。
 *  - og：GitHub 官方社交预览卡，2:1，整张放进来不裁，两端补白。
 *
 * srcset 给两档：@sm 是 720×450，卡片里显示宽度多数不到 480px，
 * 桌面 2x 屏也够用；只有 hero 那张主视觉才值得拉满 1440。
 */

import { useAsset } from '../lib/asset'

export function Shot({
  cover,
  alt,
  kind = 'shot',
  ratio = '16 / 10',
  sizes = '(max-width: 900px) 92vw, 34vw',
  eager = false,
  className,
}: {
  cover: string
  alt: string
  kind?: 'shot' | 'og'
  ratio?: string
  sizes?: string
  eager?: boolean
  className?: string
}) {
  const asset = useAsset()
  const cls = ['shot', kind === 'og' ? 'shot--og' : '', className].filter(Boolean).join(' ')
  return (
    <span className={cls} style={{ aspectRatio: ratio }}>
      <img
        src={asset(`covers/${cover}.webp`)}
        srcSet={`${asset(`covers/${cover}@sm.webp`)} 720w, ${asset(`covers/${cover}.webp`)} 1440w`}
        sizes={sizes}
        width={1440}
        height={900}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
      />
    </span>
  )
}
