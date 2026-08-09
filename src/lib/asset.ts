/**
 * 静态资源路径。
 *
 * 坑一：vite 配了 base:'./' 之后，只有**客户端**构建会把 import.meta.env.BASE_URL
 * 编译成 './'；SSR 构建拿到的是 '/'。预渲染出来的 <img src="/covers/x.webp">
 * 在 GitHub Pages 的 /website/ 子路径下会直接 404（本地服务器则被重定向成 HTML，
 * naturalWidth=0，肉眼看是一块黑），而且 hydration 之后 React 也不会去改 src。
 *
 * 坑二：案例子页在 /case/<slug>/，比首页深两级。同样一句 './covers/x.webp'
 * 在子页上会解析到 /case/<slug>/covers/x.webp。所以前缀必须跟着**路由深度**走，
 * 而不是写死。路由 SSR 与 CSR 两侧都知道，所以两边算出来的字符串完全一致，
 * 水合不会打架。
 */
import { useRouter } from '../router'

/** 由路由深度推出「回到站点根」的相对前缀。'/' → './'，'/case/lofi/' → '../../'。 */
export const rootPrefix = (route: string) => {
  const depth = route.split('/').filter(Boolean).length
  return depth ? '../'.repeat(depth) : './'
}

export const assetFor = (route: string, p: string) => rootPrefix(route) + p.replace(/^\/+/, '')

/** 组件里用这个：拿到一个已经绑好当前路由深度的取址函数。 */
export const useAsset = () => {
  const { path } = useRouter()
  return (p: string) => assetFor(path, p)
}
