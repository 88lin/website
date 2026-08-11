/**
 * 05 在写 · 分屏 + 深色短带。
 *
 * v8 这一章铺了 40 块彩色底卡，数量本身当过论据，但四十块挤在一屏谁也看不清。
 * v9 挑六个出来，v10 干脆把这六个挪去 03 章的章尾（那里本来就在讲「跑着的东西」），
 * 这一章只剩写作，构图跟着换成参考站 dst 的 .brand-split：左 0.45fr 讲立场，
 * 右 1fr 是六条可点的文章。左右共用一个圆角与一层投影，读作一块而不是两张卡。
 *
 * 章尾一条深色短带。它是全站第三处也是最后一处深色，只是一条带不是一屏 ——
 * 深色像素总配额由 audit G23 卡在 12%。
 *
 * v8 的博客六篇只有标题和日期，点不开，数据源里当时根本没存链接。
 * v9 起每篇都带永久链接，整块条目是 <a>，不是标题旁边挂个小箭头。
 */

import { ArrowOut } from '../components/Icons'
import { Annot } from '../components/Ink'
import { Reveal } from '../components/Reveal'
import { contact, writing } from '../content/site'

const num = (n: number) => n.toLocaleString('en-US')

/** 公众号是另一条写作线，链接取自 contact.channels，不另存一份。 */
const GZH = contact.channels.find((c) => c.id === 'wechat')!

/** 标签云前两名的合计，用来说明这个博客到底在写什么。数字由数组现算。 */
const TOP2 = writing.tags.slice(0, 2)
const TOP2_SUM = TOP2.reduce((s, t) => s + t.count, 0)

export function Notes() {
  return (
    <section id="notes" className="ch" data-tone="paper" aria-labelledby="notes-h">
      <div className="wrap notes-grid">
        <div className="ch-head">
          <span className="section-number" aria-hidden="true">
            05
          </span>
          <p className="label-caps">WRITING SINCE 2021</p>
          <h2 className="ch-title" id="notes-h">
            {writing.headline}
          </h2>
          <p className="ch-lede">{writing.body}</p>
        </div>

        <Reveal className="brand-split">
          <div className="brand-left">
            <h3>{writing.hrefLabel}</h3>
            <p>
              不追热点，追可复用。写的是软件资源、AI 工具、效率方法与学习资料，
              能直接抄走用的那一类。
            </p>

            <div className="notes-meta">
              <span className="pill pill--mono">{writing.posts} POSTS</span>
              <span className="pill pill--mono">{num(writing.days)} DAYS</span>
              <span className="pill pill--mono">{writing.tagTotal} TAGS</span>
            </div>

            <Annot seed="notes">只列前 {writing.tags.length} 个，全站 {writing.tagTotal} 个标签</Annot>

            <ul className="notes-tags">
              {writing.tags.map((t) => (
                <li className="pill pill--mono" key={t.name}>
                  {t.name} <b>{t.count}</b>
                </li>
              ))}
            </ul>

            <div className="act-row">
              <a
                className="cta-btn cta-btn--sm"
                href={writing.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                去博客 <ArrowOut />
              </a>
            </div>
          </div>

          {/* 整条是链接。v8 这里是六个点不开的死字。 */}
          <div className="brand-right">
            <ul className="notes-list">
              {writing.latest.map((p) => (
                <li key={p.href}>
                  <a href={p.href} target="_blank" rel="noreferrer noopener">
                    <s>{p.date}</s>
                    <b>{p.title}</b>
                    <span aria-hidden="true">
                      <ArrowOut />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal className="dark-reveal">
          <b className="dark-reveal__bg" aria-hidden="true">
            NOTES
          </b>
          <div className="dark-reveal__txt">
            <div className="dark-reveal__rule" aria-hidden="true" />
            <h3>更新不快，但每篇都还能用</h3>
            <p>
              {num(writing.days)} 天写了 {writing.posts} 篇，平均一个月不到一篇。标签云里最大的两个是「
              {TOP2[0].name}」和「{TOP2[1].name}」，加起来 {TOP2_SUM} 次，这就是这个博客的全部主题。
            </p>
          </div>
          <a className="cta-btn" href={GZH.href} target="_blank" rel="noreferrer noopener">
            {GZH.label} · {GZH.value} <ArrowOut />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
