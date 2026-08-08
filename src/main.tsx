import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

const el = document.getElementById('root')
if (el) {
  const tree = (
    <StrictMode>
      <App />
    </StrictMode>
  )
  // 构建期已经把首屏写进 HTML，正常情况下走水合；万一 HTML 是空的就退回客户端渲染
  if (el.firstElementChild) hydrateRoot(el, tree)
  else createRoot(el).render(tree)
}
