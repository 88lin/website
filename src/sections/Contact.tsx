/**
 * EXP.07 联系 · 收口。
 *
 * 纸底，靠字号与留白把 CTA 顶上去，颜色只留在按钮上（v9 满幅珊瑚红的教训）。
 * CTA 磁吸：全站只有这一个控件这么做。Caveat 旁批把「不收咨询费」
 * 写在按钮边上——这句是承诺，用手写体比用正文体可信。
 */

import { useEffect, useRef } from 'react'
import { ArrowOut } from '../components/Icons'
import { Annot } from '../components/Ink'
import { CTA_LABEL, chapters, contact, footer, profile } from '../content/site'
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
  const ch = chapters.find((c) => c.id === 'contact')!

  return (
    <section id="contact" className="ch ch--contact" data-tone="alt" aria-labelledby="contact-h">
      <div className="wrap">
        <div className="contact-in">
          <s className="ch-no ch-no--center" aria-hidden="true">
            EXP.{ch.no}
          </s>
          <h2 className="contact-h" id="contact-h">
            {contact.headline}
          </h2>
          <p className="contact-body">{contact.body}</p>

          <div className="contact-act">
            <a
              className="cta-btn cta-btn--lg cta-btn--magnet"
              href={contact.primary.href}
              ref={magnet}
            >
              {CTA_LABEL}
            </a>
            <Annot seed="contact-free" className="contact-free">
              不收咨询费，会回一份可执行的判断
            </Annot>
          </div>

          <div className="contact-ch">
            {contact.channels.map((c) => (
              <a key={c.id} href={c.href} target="_blank" rel="noreferrer noopener">
                <span className="contact-cl">{c.label}</span>
                <span className="contact-cv">{c.value}</span>
                <span className="contact-cn">
                  打开
                  <ArrowOut />
                </span>
              </a>
            ))}
          </div>
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
