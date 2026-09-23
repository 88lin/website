/** 首页七章：开场 / 服务 / 案例 / 作品 / 主线 / 写作 / 联系。 */

import { Nav } from '../components/Nav'
import { ChapterRail } from '../components/ChapterRail'
import { Hero } from '../sections/Hero'
import { Services } from '../sections/Services'
import { Cases } from '../sections/Cases'
import { Work } from '../sections/Work'
import { Craft } from '../sections/Craft'
import { Notes } from '../sections/Notes'
import { Contact } from '../sections/Contact'

export function Home() {
  return (
    <>
      <Nav />
      <ChapterRail />
      <main id="main">
        <Hero />
        <Services />
        <Cases />
        <Work />
        <Craft />
        <Notes />
        <Contact />
      </main>
    </>
  )
}
