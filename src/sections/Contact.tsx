import { useEffect, useRef } from 'react'
import { contact, footer, profile, META_AS_OF } from '../content/site'
import { Btn, Eyebrow, Note } from '../components/ui'
import { fadeUp } from '../lib/motion'

/**
 * layouts.md #6 全宽深色面板 + CTA，收尾用一整片 --dark-panel 打断奶油底。
 * 六个渠道用 hairline 网格分隔，不做卡片。
 */
export function Contact() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!root.current) return
    fadeUp('.contact-fade', root.current, 0.09, 24)
    fadeUp('.channel', root.current, 0.05, 18)
  }, [])

  return (
    <section id="contact" ref={root} className="section-y bg-dark-panel text-on-dark">
      <div className="shell">
        <div className="grid gap-[clamp(28px,4vw,64px)] lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Eyebrow tone="onDark">Get in touch</Eyebrow>
            <h2 className="serif mt-4 text-d1 text-on-dark">{contact.headline}</h2>
          </div>
          <div className="contact-fade js-fade lg:col-span-5">
            <p className="max-w-[44ch] text-lead text-on-dark-dim">{contact.body}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Btn variant="onDark" />
              <Note className="text-on-dark-dim">写清问题就行</Note>
            </div>
          </div>
        </div>

        <ul
          className="channel-grid mt-[clamp(48px,6vw,88px)] grid gap-px sm:grid-cols-2 md:grid-cols-3"
        >
          {contact.channels.map((c) => (
            <li key={c.id} className="channel js-fade bg-dark-panel">
              <a
                href={c.href}
                {...(c.href.startsWith('mailto:')
                  ? null
                  : { target: '_blank', rel: 'noreferrer noopener' })}
                className="channel-link flex h-full flex-col gap-2 px-6 py-7"
              >
                <span className="eyebrow text-on-dark-dim">{c.label}</span>
                <span className="text-[1.0625rem] font-medium break-all text-on-dark">
                  {c.value}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* 页脚回到奶油底，深色面板到此为止 */}
      <footer className="mt-[clamp(56px,7vw,104px)] -mb-[clamp(80px,12vh,160px)] bg-cream py-9 text-ink">
        <div className="shell flex flex-wrap items-center justify-between gap-x-8 gap-y-2.5">
          <p className="text-sm font-medium">{footer.copyright}</p>
          <p className="text-sm text-ink-light">
            {footer.note}{' '}
            <a href={footer.source} target="_blank" rel="noreferrer noopener" className="link">
              查看源码
            </a>
          </p>
          <p className="text-sm text-ink-light">
            {profile.location} · 数据截至 {META_AS_OF}
          </p>
        </div>
      </footer>
    </section>
  )
}
