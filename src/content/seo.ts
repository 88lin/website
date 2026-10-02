/** 页面与构建共用元数据；事实仍来自 site.ts / cases.ts。 */
import siteUrl from './site-url.json'
import {
  AS_OF, CONTACT_EMAIL, contact, hero, metric, profile, profileLabel, profileTitleLabel,
  services, servicesFlow, trackA, trackB,
} from './site'
import { cases } from './cases'

export const SITE_URL = siteUrl.url
const siteAddress = new URL(SITE_URL)
if (
  siteAddress.protocol !== 'https:' || !SITE_URL.endsWith('/') ||
  siteAddress.search || siteAddress.hash || siteAddress.username || siteAddress.password
) {
  throw new Error('site-url.json: url 必须是以 / 结尾的 HTTPS 网址，且不含查询参数、片段或登录信息。')
}

export const HOME_TITLE = `${profileTitleLabel}｜AI Agent 开发、自动化与网站定制`
// 摘要补充标题之外的证据与内容；100 字符是本站预算，不是搜索引擎截断规则。
export const HOME_DESC = `${metric('repos').value} 个原创仓库、${metric('stars').value} Star。` +
  `独立开发者的开源作品集，展示 AI Agent、自动化与网站开发中的实现过程、技术取舍及源码出处。数据更新于 ${AS_OF}。`
const personId = `${SITE_URL}#person`
const websiteId = `${SITE_URL}#website`

export function pageMeta(route: string) {
  const c = cases.find((item) => route === `/case/${item.slug}/`)
  const missing = route !== '/' && !c
  const title = c
    ? `${c.name}｜${c.cn}${/[a-z0-9]$/i.test(c.cn) ? ' ' : ''}案例 · ${profile.name}`
    : missing ? `页面不存在 · ${profile.name}` : HOME_TITLE
  const description = c
    ? c.seoDescription
    : missing ? '这个地址没有对应的页面。' : HOME_DESC
  return {
    title,
    description,
    url: new URL(route.replace(/^\//, ''), SITE_URL).href,
    type: c ? 'article' : 'website',
    missing,
    c,
  }
}

function structuredData(route: string) {
  const { c, url, title, description } = pageMeta(route)
  const person = {
    '@type': 'Person',
    '@id': personId,
    name: profile.name,
    alternateName: profile.handle,
    url: SITE_URL,
    jobTitle: profile.role,
    email: CONTACT_EMAIL,
    address: profile.location,
    knowsAbout: [...new Set([
      ...trackA.items.map((item) => item.title),
      ...trackB.items.map((item) => item.title),
    ])],
    sameAs: contact.channels.filter((item) => item.isProfile).map((item) => item.href),
  }
  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    name: profile.name,
    alternateName: profile.handle,
    url: SITE_URL,
    inLanguage: 'zh-CN',
    publisher: { '@id': personId },
  }
  const graph: Record<string, unknown>[] = [person, website]
  if (c) {
    graph.push({
      '@type': 'TechArticle',
      '@id': `${url}#article`,
      url,
      name: title,
      headline: c.claim,
      description,
      inLanguage: 'zh-CN',
      author: { '@id': personId },
      isPartOf: { '@id': websiteId },
      mainEntityOfPage: url,
      about: {
        '@type': 'SoftwareSourceCode',
        name: c.name,
        description: c.cn,
        codeRepository: c.repo,
      },
      citation: c.repo,
    }, {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: `${profile.name}首页`, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: c.name, item: url },
      ],
    })
  } else {
    graph.push({
      '@type': 'ProfilePage',
      '@id': `${url}#page`,
      url,
      name: title,
      description,
      inLanguage: 'zh-CN',
      isPartOf: { '@id': websiteId },
      mainEntity: { '@id': personId },
      about: services.map((s) => ({ '@id': `${SITE_URL}#service-${s.id}` })),
    })
    // 服务内容与首页逐项一致，不虚构价格、客户评价或企业身份。
    for (const s of services) graph.push({
      '@type': 'Service',
      '@id': `${SITE_URL}#service-${s.id}`,
      url: `${SITE_URL}#service-${s.id}`,
      name: s.title,
      description: `${s.body} 交付：${s.deliver}。适合：${s.fit}。`,
      serviceType: s.title,
      provider: { '@id': personId },
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

export type SeoTag = {
  tag: 'title' | 'meta' | 'link' | 'script'
  attrs?: Record<string, string>
  text?: string
}

/** 同一套标签同时用于预渲染和客户端路由切换。 */
export function seoTags(route: string): SeoTag[] {
  const meta = pageMeta(route)
  const tags: SeoTag[] = [
    { tag: 'title', text: meta.title },
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    { tag: 'meta', attrs: { name: 'author', content: profileLabel } },
    {
      tag: 'meta',
      attrs: {
        name: 'robots',
        content: meta.missing ? 'noindex, follow' : 'index, follow, max-image-preview:large',
      },
    },
  ]
  if (meta.missing) return tags
  const openGraph = {
    type: meta.type,
    locale: 'zh_CN',
    site_name: profile.name,
    title: meta.title,
    description: meta.description,
    url: meta.url,
    image: `${SITE_URL}og.png`,
    'image:alt': `${profile.name} · ${profile.role}`,
  }
  tags.push(
    { tag: 'link', attrs: { rel: 'canonical', href: meta.url } },
    ...Object.entries(openGraph).map(([name, content]): SeoTag => ({
      tag: 'meta', attrs: { property: `og:${name}`, content },
    })),
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
    {
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      text: JSON.stringify(structuredData(route)).replace(/</g, '\\u003c'),
    },
  )
  return tags
}

/** llms.txt 只是辅助阅读索引；发现与收录仍依靠 HTML 链接和 sitemap。 */
export function llmsText() {
  return `# ${profileLabel}

> ${hero.sub}

本站是独立开发者的个人官网与开源作品集。案例用于说明工程方法，不代表商业客户背书。
GitHub / 博客数字快照：${AS_OF}；这不是全部内容的修改日期。

## 服务

${services.map((s) => `- [${s.title}](${SITE_URL}#service-${s.id}): ${s.deliver}。适合：${s.fit}。`).join('\n')}

## 案例与实现过程

${cases.map((c) => `- [${c.name}：${c.cn}](${SITE_URL}case/${c.slug}/): ${c.claim}。`).join('\n')}

## 合作

${servicesFlow.map((s, i) => `${i + 1}. ${s.title}：${s.body}`).join('\n')}

- [联系${profile.name}](${SITE_URL}#contact): 邮箱 ${CONTACT_EMAIL}，页面提供微信二维码。

## Optional

- [博客](https://blog.88lin.eu.org/): 工具、教程与实践记录。
- [GitHub](https://github.com/88lin): 原始仓库与可核验证据。
`
}
