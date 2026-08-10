/**
 * 首页。六章，每章一种构图，页面本身没有逻辑。
 *
 * 没有常驻侧边锚点栏：v6 那一列短横线被读成 debug HUD，而且 fixed 的东西
 * 会压在每一章的正文上。导航改成 hero 里的一条流内顶栏，滚过去就没了。
 */

import { Hero } from '../sections/Hero'
import { Work } from '../sections/Work'
import { Cases } from '../sections/Cases'
import { Craft } from '../sections/Craft'
import { Notes } from '../sections/Notes'
import { Contact } from '../sections/Contact'

export function Home() {
  return (
    <main id="main">
      <Hero />
      <Work />
      <Cases />
      <Craft />
      <Notes />
      <Contact />
    </main>
  )
}
