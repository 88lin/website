import { useEffect } from 'react'
import { useRouter } from '../router'
import { seoTags } from '../content/seo'

/** 点击案例、返回首页和浏览器前进后退时，head 与当前正文保持一致。 */
export function PageMetadata() {
  const { path } = useRouter()
  useEffect(() => {
    document.head.querySelectorAll('[data-site-seo]').forEach((node) => node.remove())
    for (const { tag, attrs, text } of seoTags(path)) {
      const node = document.createElement(tag)
      node.setAttribute('data-site-seo', '')
      for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value)
      if (text) node.textContent = text
      document.head.append(node)
    }
  }, [path])
  return null
}
