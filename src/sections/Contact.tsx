/**
 * 06 联系。收口。
 *
 * 邮箱是这一页真正的出口，所以把它排成整章最大的一行等宽字，点了就是 mailto。
 * 渠道做成一排胶囊。页脚写清「每个数字都来自公开接口、源码开源」与核实日期 ——
 * 这不是免责声明，是这一页的立场。
 *
 * 蓝块右下角曾经压过一个切边出血的巨号 @88lin。删了：用户第一反应是「字看不全」。
 * 网页上文字被切就是被读成出错，不管它在版式上多说得通。
 */

import { Section } from '../components/Section'
import { AS_OF, CONTACT_EMAIL, CONTACT_HREF, contact, footer } from '../content/site'
import { useStagger } from '../lib/motion'

export function Contact() {
  const ref = useStagger<HTMLDivElement>(60)

  return (
    <Section id="contact" title={contact.headline} intro={contact.body}>
      <div className="contact" ref={ref}>
        <p className="contact__k" data-stagger>
          写信到
        </p>

        <a className="mailto" href={CONTACT_HREF} data-stagger>
          {CONTACT_EMAIL}
          <i aria-hidden="true">→</i>
        </a>

        <ul className="chans" data-stagger>
          {contact.channels.map((c) => (
            <li key={c.id}>
              <a href={c.href} target="_blank" rel="noreferrer">
                <b>{c.label}</b>
                <span>{c.value}</span>
                <i aria-hidden="true">↗</i>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className="foot">
        <p>{footer.copyright}</p>
        <p className="foot__note">{footer.note}</p>
        <p className="foot__meta">
          <a href={footer.source} target="_blank" rel="noreferrer">
            本站源码 ↗
          </a>
          <span>数字核实于 {AS_OF}</span>
        </p>
      </footer>
    </Section>
  )
}
