/**
 * 首页。
 *
 * 这一版先只铺 00 开场：底子的好看要先立住（用户判过两次「难看」），
 * 确认之后其余章节按同一套语言铺开，再往上加 3D 与滚动动效。
 */

import { Nav } from '../components/Nav'
import { Hero } from '../sections/Hero'

export function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
      </main>
    </>
  )
}
