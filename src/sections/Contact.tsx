import { useEffect, useRef } from 'react'
import { contact, footer, profile, META_AS_OF } from '../content/site'
import { Section } from '../components/Section'
import { Btn, Note } from '../components/ui'
import { TypeMatrix, slugs } from '../components/TypeMatrix'
import { dropIn, fadeUp } from '../lib/motion'

/**
 * 收尾。全站唯一一号字 + 一排发丝线分隔的联系方式 + 落回纸面的页脚。
 *
 * 活字块在标题右侧的字缝里坠下（power2.in 加速曲线，是掉下来不是浮上来）。
 * 这是三处活字锚点的最后一处：Hero 落位成阵、Stack 聚拢蓄力、这里散落收工。
 *
 * 页脚走 Section 的 after 插槽——它在版心栅格之外、区块之内，所以能满宽铺开，
 * 深色面板到此为止，整页以奶油纸收尾。
 */
const CT_SLUGS = slugs('说干就干', { 0: 'paper', 1: 'pop', 2: 'paper', 3: 'mark' })

export function Contact() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    fadeUp('.contact-fade', el, 0.09, 22)
    fadeUp('.channel', el, 0.04, 16)
    dropIn(el.querySelectorAll('.ct-slugs .type-slug'), el)
  }, [])

  return (
    <Section
      id="contact"
      tone="dark"
      label="联系 GET IN TOUCH"
      ref={root}
      padBottom="0px"
      after={
        <footer className="ct-foot">
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
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-8">
        <h2 className="serif ct-title text-on-dark">{contact.headline}</h2>
        <TypeMatrix slugs={CT_SLUGS} cols={4} anchor="contact" className="ct-slugs" />
      </div>

      <div className="mt-[clamp(26px,3.2vw,44px)] grid gap-[clamp(20px,3vw,44px)] lg:grid-cols-12 lg:items-end">
        <p className="contact-fade js-fade max-w-[46ch] text-lead text-on-dark-dim lg:col-span-7">
          {contact.body}
        </p>
        <div className="contact-fade js-fade flex flex-wrap items-center gap-4 lg:col-span-5 lg:justify-end">
          <Btn variant="onDark" />
          <Note className="text-on-dark-dim">写清问题就行</Note>
        </div>
      </div>

      <ul className="channel-row mt-[clamp(44px,6vw,84px)] mb-[clamp(52px,7vh,96px)]">
        {contact.channels.map((c) => (
          <li key={c.id} className="channel-cell channel js-fade">
            <a
              href={c.href}
              {...(c.href.startsWith('mailto:')
                ? null
                : { target: '_blank', rel: 'noreferrer noopener' })}
              className="channel-link flex h-full flex-col gap-2"
            >
              <span className="eyebrow text-on-dark-dim">{c.label}</span>
              <span className="text-[0.9375rem] font-medium break-all text-on-dark">{c.value}</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
