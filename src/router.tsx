/* 手写路由，只有 `/` 与 `/case/:slug/` 两类地址。 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type MouseEvent,
} from 'react'

export type RoutePath = string

// 入口模块位于 src/（开发）或 assets/（构建）。部署根目录来自模块地址，
// 不能拿访客输入的未知路径猜根目录，否则 /foo/ 也会变成首页。
// 约定入口 chunk 距部署根恰好一层；修改 Vite assetsDir / 输出目录时须同步此算法。
// 前提是模块 URL 位于真实部署目录；若 fallback 把深层错误 assets URL 内部映射到
// 根目录脚本而保留请求 URL，仍会误判部署根。静态托管应对未知页面返回真实 404。
const moduleUrl = import.meta.url
const deploymentBase = typeof window === 'undefined' ? '/' : new URL('../', moduleUrl).pathname
const decodePath = (value: string) => {
  try { return decodeURI(value) } catch { return value }
}

/** 从 location.pathname 里拆出 [基路径, 路由路径]。 */
export const splitPath = (pathname: string, base = deploymentBase): [string, RoutePath] => {
  let p = decodePath(pathname).replace(/\/index\.html$/, '/')
  const decodedBase = decodePath(base)
  if (!p.startsWith('/')) p = '/' + p
  if (p === decodedBase.slice(0, -1)) p = decodedBase
  const route = p.startsWith(decodedBase) ? '/' + p.slice(decodedBase.length) : p
  return [base, route.endsWith('/') ? route : route + '/']
}

const readLocation = () => {
  const pathname = window.location.pathname
  const [base, path] = splitPath(pathname)
  return { base, path, pathname }
}

type Ctx = {
  path: RoutePath
  base: string
  navigate: (to: RoutePath, opts?: { replace?: boolean }) => void
  href: (to: RoutePath) => string
}

const RouterCtx = createContext<Ctx>({
  path: '/',
  base: '/',
  navigate: () => {},
  href: (to) => to,
})

export const useRouter = () => useContext(RouterCtx)

export function Router({ initial, children }: { initial?: RoutePath; children: ReactNode }) {
  const ssr = typeof window === 'undefined'
  const [state, setState] = useState(() => {
    if (ssr) return { base: '/', path: initial || '/', pathname: initial || '/' }
    return readLocation()
  })

  useEffect(() => {
    // 水合后再对一次地址：预渲染时传进来的 initial 与真实 URL 必须一致，
    // 不一致说明服务器发错了文件，这里直接以真实 URL 为准。
    const next = readLocation()
    setState((s) => (s.pathname === next.pathname ? s : next))

    const onPop = () => {
      setState(readLocation())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const href = useCallback(
    (to: RoutePath) => {
      // 预渲染不知道部署目录，按当前路由深度生成相对地址。
      // 服务端与客户端保持一致，长按新标签打开、复制链接和无 JS 导航也能保留子路径。
      // 错误页可能没有尾斜杠，必须按实际 URL 的目录深度计算原生返回链接。
      if (!decodePath(state.pathname).startsWith(decodePath(state.base))) return state.base + to.replace(/^\//, '')
      const depth = state.pathname.split('/').filter(Boolean).length - state.base.split('/').filter(Boolean).length - (state.pathname.endsWith('/') ? 0 : 1)
      const up = '../'.repeat(Math.max(0, depth))
      return (up || './') + to.replace(/^\//, '')
    },
    [state.base, state.pathname],
  )

  const navigate = useCallback(
    (to: RoutePath, opts?: { replace?: boolean }) => {
      if (typeof window === 'undefined') return
      const url = to === '/' ? state.base : state.base + to.replace(/^\//, '')
      if (opts?.replace) window.history.replaceState(null, '', url)
      else window.history.pushState(null, '', url)
      setState({ base: state.base, path: to, pathname: url })
      window.scrollTo({ top: 0, behavior: 'auto' })
    },
    [state.base],
  )

  const value = useMemo<Ctx>(
    () => ({ path: state.path, base: state.base, navigate, href }),
    [state.path, state.base, navigate, href],
  )

  return <RouterCtx.Provider value={value}>{children}</RouterCtx.Provider>
}

/** 站内链接。中键、Ctrl / Cmd 点击、右键都保持浏览器原生行为。 */
export function Link({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: RoutePath
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const { href, navigate } = useRouter()
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented) return
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={href(to)} className={className} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

/** 预渲染时用得到：站点所有路由。 */
export const ROUTES: RoutePath[] = [
  '/',
  '/case/video-vip/',
  '/case/workbuddy/',
  '/case/repair/',
  '/case/lofi/',
  '/case/geo-book/',
  '/case/facetmark/',
]
