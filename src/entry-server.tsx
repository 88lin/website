import { renderToString } from 'react-dom/server'
import App from './App'
import { ROUTES, type RoutePath } from './router'
import { AS_OF, metric, profile, projects, services } from './content/site'
import { cases } from './content/cases'

export { ROUTES }

/* 首页的 description / og:description。 */
export const HOME_DESC =
  `${profile.name}（@${profile.handle}）个人主页 · ${profile.role}。承接 ${services
    .slice(0, 3)
    .map((s) => s.title)
    .join('、')}等 ${services.length} 类活。` +
  `GitHub ${metric('repos').value} 个原创仓库、累计 ${metric('stars').value} star、${projects.length} 个在线项目，` +
  `GitHub / 博客数据更新于 ${AS_OF}。`

/* 各条案例子页的 title / description，同样现算（条数随 cases 走，不写死）。 */
export const CASE_META = Object.fromEntries(
  cases.map((c) => [
    `/case/${c.slug}/`,
    {
      title: `${c.name} ｜ ${c.claim} · ${profile.name}`,
      desc: `案例拆解 · ${c.name}（${c.cn}）：${c.summary}`,
    },
  ]),
) as Record<string, { title: string; desc: string }>

/* 构建期预渲染入口：把每条路由的首屏 DOM 直接写进对应的 index.html。 */
export function render(route: RoutePath = '/') {
  return renderToString(<App route={route} />)
}
