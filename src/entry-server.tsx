import { renderToString } from 'react-dom/server'
import App from './App'
import { ROUTES, type RoutePath } from './router'
import { AS_OF, garden, metrics, profile } from './content/site'
import { cases } from './content/cases'

export { ROUTES }

/**
 * 首页的 description / og:description。
 *
 * 由 site.ts 现算，不写死在 index.html 里 —— v12 那份写死的文案里还留着
 * 「24 个原创开源仓库，累计 4,764 star」，而页面上的数早就往前走了。
 * 分享卡片和页面对不上，比没有描述更糟。prerender.mjs 会把这句换进 <head>。
 */
export const HOME_DESC =
  `${profile.name}（@${profile.handle}）个人主页与作品集。把前沿 AI 变成可交付、可维护的工程结果。` +
  `${metrics[2].value} 个原创开源仓库、累计 ${metrics[0].value} star、${garden.length} 个在线小站，` +
  `每个数字都写了接口出处，核实于 ${AS_OF}。`

/**
 * 四条案例子页的 title / description，同样现算。
 *
 * 上一版是在 prerender.mjs 里逐条手写的散文，于是 video_vip 那条一直停在
 * 「4,658★」——数字更新了，页面跟着变了，只有分享卡片没人记得改。
 * 现在标题取 name + claim，描述取 summary：改案例文案就等于改了 SEO 文案。
 */
export const CASE_META = Object.fromEntries(
  cases.map((c) => [
    `/case/${c.slug}/`,
    {
      title: `${c.name} ｜ ${c.claim} · ${profile.name}`,
      desc: `案例拆解 · ${c.name}（${c.cn}）：${c.summary}`,
    },
  ]),
) as Record<string, { title: string; desc: string }>

/**
 * 构建期预渲染入口：把每条路由的首屏 DOM 直接写进对应的 index.html。
 * 首屏因此不等 JS，也就不需要加载页。
 */
export function render(route: RoutePath = '/') {
  return renderToString(<App route={route} />)
}
