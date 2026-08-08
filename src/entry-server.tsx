import { renderToString } from 'react-dom/server'
import App from './App'

/** 构建期预渲染入口：把首屏 DOM 直接写进 index.html，LCP 不再等 JS。 */
export function render() {
  return renderToString(<App />)
}
