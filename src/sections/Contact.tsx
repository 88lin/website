/**
 * CH.08 接入。
 *
 * 整页只有一个主 CTA，就是这封邮件。邮箱本身用等宽大字直接印出来，不藏在
 * 一枚按钮后面——地址是可以被复制、被记住的东西，按钮不是。
 * 其余渠道排成一列端子，是补充，不是并列的第二选择。
 */

import { Bay } from '../components/Bay'
import { Reveal } from '../components/Reveal'
import { Annot } from '../components/Annot'
import { channelIcon } from '../components/Icons'
import { CONTACT_HREF, channels, contact } from '../content/site'

const ch = channels[8]

export function Contact() {
  return (
    <Bay ch={ch} win={{ x: '58%', y: '8%', w: '38%', h: '34%', tag: 'SIGNAL OUT', plate: 'ch-08' }}>
      <div className="contact__col">
        <div>
          <Reveal v="flood" as="h2" id="ch-08-t" className="bay-title">
            {contact.headline}
          </Reveal>
          <p className="bay__lede">{contact.body}</p>
        </div>

        <p>
          <Annot k="contact-mail" note="写清问题，我回可执行的判断" place="bottom">
            <a className="contact__mail" href={CONTACT_HREF}>
              {contact.primary.value}
            </a>
          </Annot>
        </p>

        <div className="chan">
          {contact.channels.map((c) => {
            const Icon = channelIcon[c.id]
            return (
              <a href={c.href} target="_blank" rel="noreferrer noopener" key={c.id}>
                <span className="chan__l">
                  {Icon ? <Icon size={14} /> : null} {c.label}
                </span>
                <span className="chan__v">{c.value}</span>
              </a>
            )
          })}
        </div>
      </div>
    </Bay>
  )
}
