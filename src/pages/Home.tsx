/**
 * 首页。
 *
 * Phase 0 只铺 00 开场 —— 首屏语言先定稿，八章按定稿的版式语言在 Phase 1 铺开。
 * 两种首屏版式用 ?p=1 / ?p=2 切换，是开发期的取景开关，定稿后删掉。
 * 变体在 useEffect 里读，不在首次渲染读：SSR 与水合首帧必须一致，
 * 否则 React 直接报注水失配。
 */

import { useEffect, useState } from 'react'
import { Nav } from '../components/Nav'
import { Hero, type HeroVariant } from '../sections/Hero'

export function Home() {
  const [variant, setVariant] = useState<HeroVariant>('p1')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('p')
    if (p === '2') setVariant('p2')
  }, [])

  return (
    <>
      <Nav />
      <main id="main">
        {/*
          key 挂 variant 是必须的：useStagger 在挂载时一次性抓齐 [data-stagger]
          子节点，变体切换换掉了整棵子树，旧的观察对象已经不在文档里，新节点
          没人给它们加 .is-in，于是整块内容停在 opacity:0。换 key 让它重新挂载。
          定稿删掉变体开关之后这条也就不需要了。
        */}
        <Hero key={variant} variant={variant} />
      </main>
    </>
  )
}
