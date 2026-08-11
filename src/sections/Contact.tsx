/**
 * 06 联系 · 居中收口。
 *
 * v9 这一屏是一整块珊瑚红满幅色块。放大了唯一重要的动作，代价是整屏 #A8452F ——
 * 用户点名不喜欢的颜色，一次性铺满最后一屏。v10 换成参考站的收口写法：
 * 还是纸底，靠居中、字号与留白把 CTA 顶上去，颜色只留在那一枚按钮上。
 *
 * CTA 有磁吸：指针靠近时按钮往指针方向偏一点。全站只有这一个控件这么做 ——
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
    <section id="contact" className="ch ch--contact" data-tone="alt" aria-labelledby="contact-h">
      <div className="wrap">
        <div className="contact-in">
          <span className="section-number" aria-hidden="true">
            06
          </span>
          <p className="label-caps">LET US BUILD SOMETHING</p>
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
            <span className="contact-mail">{contact.primary.value}</span>
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
