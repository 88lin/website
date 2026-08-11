/**
 * 首页。六章，每章一种构图，页面本身没有逻辑。
 *
 * v10 补回一条常驻顶栏。v6 那一列 fixed 的短横线被读成 debug HUD，所以 v7–v9
 * 把导航塞进 hero 里，滚过第一屏就没了 —— 一个六章长页读到第五章想回开场
 * 只能拖滚动条。参考站 repair.88lin.eu.org 的写法是 62px 常驻条 + 3px 进度条，
 * 这里照抄：它是横向的、只占 62px，不会压在任何一章的正文上。
 *
 * 章序同时是 site.ts 的 chapters 与 scripts/audit.mjs 的 CHAPTERS，三处必须一致。
 */

import { Nav } from '../components/Nav'
import { Hero } from '../sections/Hero'
import { Craft } from '../sections/Craft'
import { Work } from '../sections/Work'
import { Cases } from '../sections/Cases'
import { Notes } from '../sections/Notes'
import { Contact } from '../sections/Contact'

export function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Craft />
        <Work />
        <Cases />
        <Notes />
        <Contact />
      </main>
    </>
  )
}
