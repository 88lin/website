# SEO / GEO 实施与上线说明

正式网址：`https://dev.88lin.eu.org/`。本轮是站内基础优化，不把代码检查通过等同于搜索收录或 AI 引用。

## 方法与范围

参考 [geo-book-skill 的入口](https://github.com/88lin/geo-book-skill/blob/main/geo-playbook/SKILL.md)、[可引用内容](https://github.com/88lin/geo-book-skill/blob/main/geo-playbook/references/capabilities/citable-content-spec.md)、[抓取与 llms.txt](https://github.com/88lin/geo-book-skill/blob/main/geo-playbook/references/capabilities/ai-crawler-access.md)，结合 seo-audit、ai-seo、schema：

- 先保证访问与发现，再整理身份、服务和案例证据。
- 品牌与答案前置，摘要脱离首页仍能读懂；数字继续使用原有快照与出处。
- 不套用书内的引擎引用比例、字数评分或行业结论；这些不是本站实测。
- 按现有真实服务覆盖「AI Agent 开发」「工作流自动化」「网站定制」「GitHub 项目跑通与二次开发」等意图，没有做搜索量调查，也没有编造热门问题或客户口碑。
- 保留七章、全部 H1、案例路由、项目链接、联系方式与主要动效，不扩建低信息量关键词页。
- `llms.txt` 只是精简内容索引。没有证据证明豆包、元宝、Kimi 或 DeepSeek 必然读取它；它不替代 HTML、robots 或 sitemap。

## 维护入口

| 文件 | 用途 |
|---|---|
| `src/content/site-url.json` | 唯一正式网址配置 |
| `src/content/seo.ts` | 首页/案例标题、摘要、canonical、分享元数据、JSON-LD 与 llms 索引，共用既有内容源 |
| `src/components/PageMetadata.tsx`、`src/App.tsx` | 站内导航和浏览器前进后退时更新 head，避免页面内容变了、元数据还留在上一页 |
| `index.html`、`src/entry-server.tsx`、`scripts/prerender.mjs` | 由统一来源写入每条路由的完整 HTML 与独立 head，每次 build 生成发现文件 |
| `public/robots.txt`、`sitemap.xml`、`llms.txt`、`CNAME` | 生成产物，不手改。通用 UA 保持放行，sitemap 覆盖 7 个正式 URL |
| `src/content/site.ts`、`cases.ts` | 品牌/服务介绍、两个章节标题、三条合作问答；保留原有事实与 H1 |
| `src/sections/Services.tsx`、`src/pages/CasePage.tsx` | 服务锚点、原生问答；案例摘要、作者、源码入口、面包屑、三段 H2 |
| `src/styles/sections.css`、`case.css` | 新文字与问答的少量排版，沿用现有令牌和折叠样式 |
| `scripts/static.mjs`、`public/404.html` | 重建分享图（本次图片内容未产生差异）；404 标记 noindex，深层错误路径也能返回正式首页 |
| `scripts/chars/*.txt`、`public/fonts/*.woff2` | 根据实际新增文字重建字表和三个字体子集 |
| `scripts/lib/serve.mjs`、`scripts/preview.mjs`、`vite.config.ts` | 预览默认使用正式域名的根路径，保留子路径兼容；静态服务器返回真实 404 |
| `scripts/verify.mjs`、`scripts/verify-seo.mjs`、`package.json`、`.github/workflows/deploy.yml` | 更新既有验收，增加 SEO 产物/导航回归，并接入部署工作流 |
| `README.md`、`PRODUCT.md`、本文件 | 同步正式域名、构建流程与上线边界 |

普通构建也会更新发现文件；改动可见文字后，使用完整流程重建字体与分享图：

```sh
npx tsc --noEmit
node scripts/build-pages.mjs
npm run verify:seo
npm run verify
git diff --check
```

`sitemap` 暂不输出 `lastmod`：没有逐页实质内容的修改日期时，不能用 GitHub / 博客快照日或构建日代替。案例 JSON-LD 不把该日期冒充文章发布日期或全文审核日期。新服务、联系方式或案例事实仍应先改原始内容源。

首页摘要先给出仓库数与 Star，再补充作品集包含的实现过程、技术取舍、源码出处与快照日。案例搜索及分享摘要来自 `cases.ts` 中的 `seoDescription`，概括当前正文事实；可见的完整介绍仍使用 `summary`，不再要求 meta 逐字包含它。全部正式页面都检查摘要独立性和 100 字符维护预算。这不是 Google 或百度的固定截断规则，也不保证搜索引擎采用该摘要。

服务与案例导语保留中文“六”，统一由 `verify:seo` 检查实际列表数量及可见导语；增删条目时应同步中文文案和数量约束。品牌、所在地和身份链接检查的是发布产物与当前内容源的一致性，不将这些内容永久锁定。身份链接由各渠道的 `isProfile` 显式声明，群聊不算人物身份页。正式网址必须使用 HTTPS、以 `/` 结尾，且不含查询参数、片段或登录信息，否则构建报错。

`public/` 保留发现文件的版本副本，`dist/` 用于发布。同一输入重复构建不会仅因写入动作产生 Git 内容差异；快照或文案真正变化时，生成文件出现差异属于正常同步。

## 未知路径与预览约定

- 客户端从入口模块所在目录确定部署根目录，支持正式根路径和 `/website/` 子路径。模块 URL 位于真实部署目录时，未知地址显示「页面不存在」，输出 `noindex, follow` 并移除 canonical、OG 和 JSON-LD。
- 预渲染根节点用 `data-route` 标记路由；`verify:seo` 在禁用 JavaScript 的上下文中逐页检查该属性，缺失或与路由不符都会失败，避免客户端重建页面掩盖预渲染契约断裂。托管方若将未知地址回退到首页 HTML，且入口脚本与样式地址配置正确，客户端会直接渲染缺失态，避免拿首页正文水合错误地址。本仓库采用相对资源路径，不能把原始首页 HTML 直接当成任意深层地址的 fallback，否则脚本也会请求到错误目录。即使服务器把错误深层资源 URL 内部映射到根目录文件，只要浏览器看到的模块 URL 仍在错误目录，部署根仍会被误判；仅保证根目录资源可取到并不足够。生产静态托管应使用独立 `404.html` 并返回 HTTP 404；客户端无法改变服务器已发送的 HTTP 状态，也无法替无 JS 的 SPA fallback 修正首页 HTML。
- 独立 `404.html` 保持不依赖 JavaScript，回首页和图标明确指向正式域名。这也意味着旧子路径预览的 404 会离开本地预览；这是有意保留的恢复行为，由回归检查覆盖。正式域名或图标版本改动后运行完整构建流程重新生成 404。
- 人物地址复用公开的 `profile.location` 文本；`Service.serviceType` 使用实际服务名称，`knowsAbout` 仅使用两条主线的可见主题（含 MCP、RAG、WebGL 等），服务范围由独立 `Service` 节点表达。
- 静态预览拒绝路径中的编码斜杠与反斜杠（`%2F` / `%5C`），返回 HTTP 404，避免服务器与客户端识别成不同页面；正常的字母编码（如 `%72epair`）仍可打开案例。根路径与 `/website/` 的服务器响应、客户端缺失态均有回归覆盖。

## 主要标题对照

| 位置 | 修改前 | 修改后 | 理由 |
|---|---|---|---|
| 首页 title | 茉灵智库 · 88lin ｜ AI Agent 工程 × 创意前端 | 茉灵智库 · 88lin｜AI Agent 开发、自动化与网站定制 | 两个名号并列不做主次，后半句改用可提供的服务品类 |
| 服务 H2 | 我能接什么活 | 开发与自动化服务 | 独立摘取标题也能理解服务主题 |
| 案例 H2 | 凭什么信我 | 开源项目与工程案例 | 明确证据类型，不暗示商业客户背书 |
| video_vip title | video_vip ｜ 在会员视频页上挂一枚按钮，换一个能播的播放器 · 茉灵智库 | video_vip｜全网 VIP 视频解析脚本案例 · 茉灵智库 | 用项目名和实际用途描述页面 |
| workbuddy title | workbuddy-auto-signin ｜ 把每天那几下点击，交给一个不花 token 的本地脚本 · 茉灵智库 | workbuddy-auto-signin｜WorkBuddy 签到自动化案例 · 茉灵智库 | 直接对应产品与自动化用途 |
| repair title | Computer Repair Skill ｜ 先取证，再判断；先计划，再修改 · 茉灵智库 | Computer Repair Skill｜跨平台电脑维修 Agent 案例 · 茉灵智库 | 补足原口号中缺失的项目主题 |
| lofi title | Lofi Radio Web ｜ 打开网页就出声，不用注册，也不用下载 · 茉灵智库 | Lofi Radio Web｜专注场景的网页电台案例 · 茉灵智库 | 说明产品类型与适用场景 |
| geo-book title | geo-book-skill ｜ 书读完就忘，能力卡能被 Agent 当场调用 · 茉灵智库 | geo-book-skill｜一本书蒸馏成的 Agent Skill 案例 · 茉灵智库 | 说明知识转化与 Skill 项目性质 |
| facetmark title | facetmark ｜ 四条索引逐维实测，赢的留、输的关 · 茉灵智库 | facetmark｜本地书签检索引擎案例 · 茉灵智库 | 让未看过首页的人知道它是什么 |

首页 H1「把前沿 AI 变成可交付、可维护的工程结果。」和六个案例 H1 保留，继续承载个人表达；案例中的「背景 / 卡在哪 / 怎么解」文字不变，从普通段落改为 H2。

## 上线后仍需完成

1. 将 `dev` 的 DNS 指向实际托管方。如果继续使用本仓库的 GitHub Pages，将 `dev` CNAME 指向 `88lin.github.io`，在仓库 Settings → Pages 设置自定义域名 `dev.88lin.eu.org`，证书就绪后启用 HTTPS。Actions 部署中的 `public/CNAME` 不能代替控制台设置。
2. 部署完整 `dist/`。核验首页、6 个案例、`/robots.txt`、`/sitemap.xml` 均能通过 HTTPS 获取；不存在路径应返回 HTTP 404。检查 CDN/WAF 没有强制登录、验证码或额外的 `X-Robots-Tag: noindex`。本地通过不能证明大陆不同网络的可达性。
3. 核验原 `https://88lin.github.io/website/` 及每个旧案例地址是否逐页跳到新地址；不要把全部旧案例都跳到首页。迁移行为由托管配置决定，本轮没有修改远端设置。
4. 在各平台验证网站所有权，按当前账号可用能力提交 `https://dev.88lin.eu.org/sitemap.xml` 或首页/案例 URL：[百度搜索资源平台](https://ziyuan.baidu.com/)、[Bing Webmaster Tools](https://www.bing.com/webmasters/)、[搜狗站长平台](https://zhanzhang.sogou.com/)、[360 站长平台](https://zhanzhang.so.com/)。入口、提交方式及账号资格以各后台当前界面为准。本轮没有这些平台的验证材料，没有提交或伪造验证代码。
5. 如 Bing 后台开放 IndexNow，可在实际部署后按官方流程配置所有权密钥并提交更新 URL。本轮没有生成一个无法验证的占位密钥，也没有向站内注入提交脚本。
6. 在你控制的 GitHub 简介、博客、导航和公众号资料中逐步统一「茉灵智库（88lin）」与正式官网链接。本轮只修改当前网站仓库，没有代发外部内容。

## 如何判断有没有实际效果

搜索侧记录提交日期、发现 URL 数、已收录数、抓取错误和品牌/服务查询展示。`site:` 搜索只能辅助观察，不能作为完整收录计数。

AI 侧以两周为一轮，在豆包、元宝、Kimi、DeepSeek 的独立新对话中保持相同提问与联网设置，记录日期、模式、原始回答和来源链接。先测「茉灵智库 88lin 提供哪些开发服务？」和「88lin 的 computer-repair-skill 是做什么的，有哪些技术取舍？」这类可与本站事实核对的问题，再测服务类发现问题。它们是本轮建议的核验问题，不是搜索量调查结果。

分开记录：提到品牌 / 引用本站链接 / 正确转述本站事实 / 实际产生咨询。没有联网、没有链接或没有访问本站证据的回答，不能算作本站被引用。不要把优化后的本地检查数量换算成收录率或引用率。

## 最新验证报告

审计结论、已修复问题及最新验证结果统一记录在 [网站深入检查报告](../artifacts/audit-deep-recheck-2026-10-02.md)。本文件保留长期维护与上线说明。
