import type { ReactNode } from 'react'
import { CTA_LABEL, CONTACT_HREF } from '../content/site'

export function Shell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`shell ${className}`}>{children}</div>
}

type CtaProps = {
  size?: 'md' | 'lg'
  variant?: 'solid' | 'ghost' | 'invert'
  href?: string
  children?: ReactNode
  className?: string
}

/** 全站唯一转化按钮。solid = 朱红底墨字（5.2:1）。 */
export function Cta({ size = 'md', variant = 'solid', href = CONTACT_HREF, children, className = '' }: CtaProps) {
  const pad = size === 'lg' ? 'px-8 py-4 text-[1.125rem]' : 'px-5 py-2.5 text-[1.0625rem]'
  const skin =
    variant === 'solid'
      ? 'bg-vermilion text-ink hover:bg-vermilion-press'
      : variant === 'invert'
        ? 'bg-ink text-paper hover:bg-vermilion hover:text-ink'
        : 'border border-ink/25 text-ink hover:bg-ink hover:text-paper'
  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-2.5 rounded-full font-semibold tracking-[-0.014em] transition-colors duration-200 ${pad} ${skin} ${className}`}
    >
      <span>{children ?? CTA_LABEL}</span>
      <span aria-hidden className="mono translate-y-px transition-transform duration-300 group-hover:translate-x-1">
        &rarr;
      </span>
    </a>
  )
}

export function Meta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`mono text-[0.875rem] uppercase tracking-[0.06em] ${className}`}>{children}</span>
  )
}

/** 两行标题的逐行遮罩容器。 */
export function Line({ children }: { children: ReactNode }) {
  return (
    <span className="reveal-line">
      <span>{children}</span>
    </span>
  )
}

/** 色场里给正文用的分隔细线。 */
export function Hair({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-ink/15 ${className}`} />
}
