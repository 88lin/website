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

const CASE_RE = /^(.*?)\/?case\/([a-z0-9-]+)\/?$/

/** 从 location.pathname 里拆出 [基路径, 路由路径]。 */
export const splitPath = (pathname: string): [string, RoutePath] => {
  let p = pathname.replace(/index\.html$/, '')
  if (!p.startsWith('/')) p = '/' + p
  const m = p.match(CASE_RE)
  if (m) {
    const base = (m[1] || '') + '/'
    return [base, `/case/${m[2]}/`]
  }
  return [p.endsWith('/') ? p : p + '/', '/']
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
    if (ssr) return { base: '/', path: initial || '/' }
    const [base, path] = splitPath(window.location.pathname)
    return { base, path }
  })

  useEffect(() => {
    // 水合后再对一次地址：预渲染时传进来的 initial 与真实 URL 必须一致，
    // 不一致说明服务器发错了文件，这里直接以真实 URL 为准。
    const [base, path] = splitPath(window.location.pathname)
    setState((s) => (s.base === base && s.path === path ? s : { base, path }))

    const onPop = () => {
      const [b, p] = splitPath(window.location.pathname)
      setState({ base: b, path: p })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const href = useCallback(
    (to: RoutePath) => (to === '/' ? state.base : state.base + to.replace(/^\//, '')),
    [state.base],
  )

  const navigate = useCallback(
    (to: RoutePath, opts?: { replace?: boolean }) => {
      if (typeof window === 'undefined') return
      const url = to === '/' ? state.base : state.base + to.replace(/^\//, '')
      if (opts?.replace) window.history.replaceState(null, '', url)
      else window.history.pushState(null, '', url)
      setState({ base: state.base, path: to })
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
