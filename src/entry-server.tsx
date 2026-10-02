import { renderToString } from 'react-dom/server'
import App from './App'
import { ROUTES, type RoutePath } from './router'

export { ROUTES }
export { seoTags, SITE_URL, llmsText } from './content/seo'

/* 构建期预渲染入口：把每条路由的首屏 DOM 直接写进对应的 index.html。 */
export function render(route: RoutePath = '/') {
  return renderToString(<App route={route} />)
}
