import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { splitPath } from './router'
import './styles/index.css'

const el = document.getElementById('root')
if (el) {
  const tree = (
    <StrictMode>
      <App />
    </StrictMode>
  )
  // SPA fallback 可能把首页 HTML 发给错误地址；只有正文与当前路由一致才水合。
  // 否则直接渲染缺失态，避免水合错误及首页元数据残留。
  const [, currentRoute] = splitPath(window.location.pathname)
  if (el.firstElementChild && el.dataset.route === currentRoute) hydrateRoot(el, tree)
  else createRoot(el).render(tree)
}
