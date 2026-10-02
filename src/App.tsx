/** 应用外壳：装路由、接平滑滚动与指针、分发页面。 */

import { useEffect } from 'react'
import { Router, useRouter, type RoutePath } from './router'
import { Home } from './pages/Home'
import { CasePage, MissingPage } from './pages/CasePage'
import { PageMetadata } from './components/PageMetadata'
import { bootPointer, bootScroll } from './lib/motion'

function Page() {
  const { path } = useRouter()
  const m = path.match(/^\/case\/([a-z0-9-]+)\/?$/)
  if (m) return <CasePage key={m[1]} slug={m[1]} />
  return path === '/' ? <Home /> : <MissingPage />
}

function Shell() {
  useEffect(() => {
    // .js 已经由 index.html 里的同步脚本在首帧之前挂上了（见那里的注释）；
    // 这里只负责告诉那段脚本「应用起来了」，把 2.5 秒的摘类兜底作废。
    // 兜底存在的意义：JS 挂了就让正文回到可见，不能因为动效没跑而把内容藏住。
    document.documentElement.dataset.booted = '1'
    document.documentElement.classList.add('js')
    const offPointer = bootPointer()
    const scrollAbort = new AbortController()
    bootScroll(scrollAbort.signal).catch((error) => {
      if (!scrollAbort.signal.aborted) console.warn('平滑滚动加载失败，保留浏览器原生滚动。', error)
    })
    return () => {
      offPointer()
      scrollAbort.abort()
    }
  }, [])

  return (
    <>
      <PageMetadata />
      <a className="skip" href="#main">
        跳到正文
      </a>
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
