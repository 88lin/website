/**
 * 应用外壳。只做四件事：装路由、点火 3D、接上平滑滚动与指针、分发页面。
 */

import { useEffect } from 'react'
import { Router, useRouter, type RoutePath } from './router'
import { Stage } from './components/Stage'
import { Home } from './pages/Home'
import { CasePage } from './pages/CasePage'
import { bootPointer, bootScroll } from './lib/motion'

function Page() {
  const { path } = useRouter()
  const m = path.match(/^\/case\/([a-z0-9-]+)\/?$/)
  if (m) return <CasePage slug={m[1]} />
  return <Home />
}

function Shell() {
  useEffect(() => {
    // 客户端才有的东西全在这里接：CSS 靠 .js 判断要不要做入场动效
    document.documentElement.classList.add('js')
    const offPointer = bootPointer()
    let offScroll: (() => void) | undefined
    bootScroll().then((fn) => {
      offScroll = fn
    })
    return () => {
      offPointer()
      offScroll?.()
    }
  }, [])

  return (
    <>
      <a className="skip" href="#main">
        跳到正文
      </a>
      <Stage />
      <Page />
    </>
  )
}

export default function App({ route }: { route?: RoutePath }) {
  return (
    <Router initial={route}>
      <Shell />
    </Router>
  )
}
