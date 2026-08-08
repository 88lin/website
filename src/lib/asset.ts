/**
 * 静态资源路径。
 *
 * 坑：vite 配了 base:'./' 之后，只有**客户端**构建会把 import.meta.env.BASE_URL
 * 编译成 './'；SSR 构建拿到的是 '/'。预渲染出来的 <img src="/covers/x.webp">
 * 在 GitHub Pages 的 /website/ 子路径下会直接 404（本地服务器则被重定向成 HTML，
 * naturalWidth=0，肉眼看是一块黑），而且 hydration 之后 React 也不会去改 src。
 *
 * 所以静态资源一律走这里：输出与文档同级的相对路径，SSR 与 CSR 产物完全一致。
 */
export const asset = (p: string) => `./${p.replace(/^\/+/, '')}`
