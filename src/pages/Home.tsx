/**
 * 首页。六章，每章一种构图，页面本身没有逻辑。
 *
 * 没有常驻侧边锚点栏：v6 那一列短横线被读成 debug HUD，而且 fixed 的东西
 * 会压在每一章的正文上。导航改成 hero 里的一条流内顶栏，滚过去就没了。
 */

import { Hero } from '../sections/Hero'
import { Craft } from '../sections/Craft'
import { Work } from '../sections/Work'
import { Cases } from '../sections/Cases'
import { Notes } from '../sections/Notes'
import { Contact } from '../sections/Contact'

/**
 * v9 换了顺序。v8 是 hero → work，第二屏就在摆仓库，整页读下来像在证明
 * 「我 star 多」。现在第二章先答「能替你做什么」，仓库退到第 3、4 章当证据。
 * 章序同时是 site.ts 的 chapters 与 scripts/audit.mjs 的 CHAPTERS，三处必须一致。
 */
export function Home() {
  return (
    <main id="main">
      <Hero />
      <Craft />
      <Work />
      <Cases />
      <Notes />
      <Contact />
    </main>
  )
}
