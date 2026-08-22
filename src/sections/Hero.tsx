/**
 * 00 开场。
 *
 * 版式基准来自用户点名认可的四个自有页面（repair / book / components-preview /
 * demo-readme-tutorial），不是我的偏好：
 *  左栏 —— 灰色大写 kicker、得意黑超粗大标题（关键字压实心黄块）、
 *          蓝色一行小标题带虚线下划线、灰正文、蓝实心 + 白描边两枚胶囊
 *  右栏 —— 四个案例站的**真机截图叠卡**，可拖可翻（components/Deck.tsx）
 *  底部 —— 四块彩色读数卡（repair 页首屏底下那三块）
 *
 * 右栏为什么换成真机截图：对比过普通商业官网之后量出来的差距不在配色也不在字号，
 * 在于本站一张图都没有，全靠排版硬撑，所以读起来「啥也没有」。
 * 主人手上有四个在线案例站，它们的真实界面既是视觉也是证据——第一屏就把
 * 「他真做过能跑的东西」这条摆出来，而不是等滚到第二屏。
 */

import { Deck } from '../components/Deck'
import { AS_OF, CONTACT_HREF, garden, hero, metrics, profile } from '../content/site'
import { useStagger } from '../lib/motion'

/** 四块读数卡。全部从唯一数据源派生；小站数量取 garden 长度，不写死。 */
const STATS = [
  { t: 'blue', v: metrics[0].value, l: metrics[0].label, src: metrics[0].sub },
  { t: 'yellow', v: metrics[2].value, l: metrics[2].label, src: metrics[2].sub },
  { t: 'coral', v: String(garden.length), l: '在线小站', src: '特效 / 工具 / 内容 / 组件四类' },
  { t: 'plain', v: metrics[4].value, l: metrics[4].label, src: metrics[4].sub },
] as const

export function Hero() {
  const ref = useStagger<HTMLElement>(70)

  return (
    <section className="hero wrap" id="hero" ref={ref}>
      <div className="hero__grid">
        <div>
          <p className="kicker" data-stagger>
            {hero.latin}
          </p>

          {/*
            三行分别做遮片揭示（不是整块淡入）：一行一行从下往上开，
            像标题被逐行印上去。data-stagger="mask" 走的是 index.css 里的 clip-path 那一路。
          */}
          <h1 className="hero__h1">
            <span data-stagger="mask">{hero.line1}</span>
            <span data-stagger="mask">
              {hero.line2Pre}
              <span className="mark">{hero.line2Mark}</span>
              {hero.line2Mid}
              {hero.line2Circle}
            </span>
            <span data-stagger="mask">{hero.line3}</span>
          </h1>

          <p data-stagger>
            <span className="lead">{profile.role}</span>
          </p>

          <p className="hero__body" data-stagger>
            {hero.sub}
          </p>

          <div className="hero__acts" data-stagger>
            <a className="btn btn--blue" href={CONTACT_HREF}>
              {hero.primaryCta}
              <i aria-hidden="true">→</i>
            </a>
            <a className="btn btn--ghost" href="#cases">
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div data-stagger>
          <Deck />
        </div>
      </div>

      <div className="stats" data-stagger>
        {STATS.map((s) => (
          <div className="stat" data-t={s.t} key={s.l}>
            <b>{s.v}</b>
            <s>{s.l}</s>
            <span className="stat__src">{s.src}</span>
          </div>
        ))}
      </div>

      <p className="kicker" style={{ marginTop: '18px' }} data-stagger>
        全部数字核实于 {AS_OF} · 每个都写了接口出处
      </p>
    </section>
  )
}
