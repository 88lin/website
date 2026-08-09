import { renderToString } from 'react-dom/server'
import App from './App'
import { ROUTES, type RoutePath } from './router'

export { ROUTES }

/**
 * 构建期预渲染入口：把每条路由的首屏 DOM 直接写进对应的 index.html。
 * 首屏因此不等 JS，也就不需要加载页——3D 是后来才点着的一层。
 */
export function render(route: RoutePath = '/') {
  return renderToString(<App route={route} />)
}
