/**
 * 首页。
 *
 * Phase 0 只铺 00 开场：满幅光学体 + 论点 + 证据条。首屏语言定稿之后，
 * 其余章节在 Phase 1 按同一套语言铺开（光学体常驻，各章只换字与版面）。
 */

import { Nav } from '../components/Nav'
import { Optic } from '../components/Optic'
import { Hero } from '../sections/Hero'

export function Home() {
  return (
    <>
      {/*
        光学体挂在根上、排在 main 之前，不放进任何区块里。
        它是 position:fixed 的定位元素，塞进 .hero 内部的话，按层叠绘制顺序
        它会盖在同一个层叠上下文里那些非定位的正文之上 —— 字会整块被吃掉。
        放到 main 的兄弟位置，再靠 main 的 z-index 压住它，关系才是干净的。
      */}
      <Optic />
      <Nav />
      <main id="main">
        <Hero />
      </main>
    </>
  )
}
