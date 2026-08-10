/**
 * 06 联系 · 满幅色块。
 *
 * 最后一屏只做一件事：把唯一重要的动作放大到不可能错过。
 * 前五章都在给证据，这一屏不需要再证明什么，所以没有卡、没有网格、没有图形，
 * 就是一整块珊瑚红加一行巨字，加一张平铺的联系方式清单。
 *
 * CTA 有磁吸：指针靠近时按钮往指针方向偏一点。全站只有这一个控件这么做——
 * 它是整页唯一真正想让人点的东西，反馈该给在这里。
 */

import { useEffect, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { CTA_LABEL, contact, footer, profile } from '../content/site'
import { prefersReducedMotion } from '../lib/caps'

function useMagnet<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || matchMedia('(pointer: coarse)').matches) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      // 只在按钮周围一圈内吸附，超出就归零，不然整屏移动都在拽它
      const near = Math.abs(dx) < r.width * 0.9 && Math.abs(dy) < r.height * 2.4
      el.style.setProperty('--mx', near ? (dx * 0.28).toFixed(1) : '0')
      el.style.setProperty('--my', near ? (dy * 0.32).toFixed(1) : '0')
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return ref
}

export function Contact() {
  const magnet = useMagnet<HTMLAnchorElement>()

  return (
    <section id="contact" className="ch ch--contact" data-tone="coral" aria-labelledby="contact-h">
      <div className="wrap">
        <p className="eyebrow">LET US BUILD SOMETHING</p>
        <h2 className="contact__h" id="contact-h">
          {contact.headline}
        </h2>
        <p className="contact__body">{contact.body}</p>

        <div className="contact__act">
          <a
            className="btn btn--paper btn--magnet btn--lg"
            href={contact.primary.href}
            ref={magnet}
          >
            {CTA_LABEL}
          </a>
          <span className="contact__mail">{contact.primary.value}</span>
        </div>

        <div className="contact__ch">
          {contact.channels.map((c) => (
            <a key={c.id} href={c.href} target="_blank" rel="noreferrer noopener">
              <span className="contact__cl">{c.label}</span>
              <span className="contact__cv">{c.value}</span>
              <span className="contact__cn">
                打开
                <ArrowOut />
              </span>
            </a>
          ))}
        </div>

        <footer className="foot">
          <span>{footer.copyright}</span>
          <span>{footer.note}</span>
          <a href={footer.source} target="_blank" rel="noreferrer noopener">
            源码仓库
            <ArrowOut />
          </a>
          <span>数据核实于 {footer.asOf}</span>
          <span>{profile.location}</span>
        </footer>
      </div>
    </section>
  )
}
