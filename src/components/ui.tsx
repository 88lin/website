import type { ReactNode } from 'react'
import { CTA_LABEL, CONTACT_HREF } from '../content/site'

type BtnProps = {
  href?: string
  variant?: 'solid' | 'outline' | 'onDark' | 'onDarkGhost'
  size?: 'md' | 'sm'
  arrow?: boolean
  children?: ReactNode
  className?: string
  external?: boolean
}

/** 全站按钮只有胶囊一种形状。scene-landing.md 的 CTA 形制 + 999px 圆角。 */
export function Btn({
  href = CONTACT_HREF,
  variant = 'solid',
  size = 'md',
  arrow = true,
  children,
  className = '',
  external = false,
}: BtnProps) {
  const cls = `btn btn--${variant}${size === 'sm' ? ' btn--sm' : ''} ${className}`
  return (
    <a
      href={href}
      className={cls}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : null)}
    >
      <span>{children ?? CTA_LABEL}</span>
      {arrow ? (
        <span aria-hidden className="btn__arrow">
          &rarr;
        </span>
      ) : null}
    </a>
  )
}

/** 分区微标签。13px 实色，不是灰色细线。 */
export function Eyebrow({
  children,
  tone = 'brand',
  className = '',
}: {
  children: ReactNode
  tone?: 'brand' | 'pop' | 'ink' | 'onDark' | 'onBrand'
  className?: string
}) {
  // brand 用 --brand-deep 而不是 --brand-text：13px 的 --brand-text 压在
  // --cream-dark 上实测只有 4.43:1，差 AA 一口气；--brand-deep 在 cream 与
  // cream-dark 上分别是 6.58 / 6.24，两种底色都稳过。
  const color =
    tone === 'brand'
      ? 'text-brand-deep'
      : tone === 'pop'
        ? 'text-pop-text'
        : tone === 'onDark'
          ? 'text-on-dark-dim'
          : tone === 'onBrand'
            ? 'text-on-brand'
            : 'text-ink-light'
  return <p className={`eyebrow ${color} ${className}`}>{children}</p>
}

/**
 * 手写批注。只用于点缀，从不承载正文。
 * 默认 17px：Caveat 没有汉字，中文批注会落回正文栈，1.25rem 的无衬线粗体在
 * 中文下会重到压过旁边的正文。拉丁批注（Caveat x-height 偏小）自己调大。
 */
export function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`hand text-[1.0625rem] leading-none ${className}`}>{children}</span>
}

/** 荧光笔标注。用设计系统的 --highlighter token，不自定义渐变。 */
export function Mark({ children }: { children: ReactNode }) {
  return <span className="marker">{children}</span>
}
