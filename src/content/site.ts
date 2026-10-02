/* 全站唯一数据源。 */

import { AS_OF, blog, formatCount, github, repositoryStats } from './activity'
export { AS_OF } from './activity'

/* ---------------------------------------------------------------- 章节 */

export type Tone = 'paper' | 'alt'
/* 七族柔彩，量自 go.88lin.eu.org/2。blue/yellow/coral/teal 是旧名，
   在 palettes.css 里与 blue/cream/rose/sage 同义，留着是为了不动案例数据。
   分配规矩只有一条：**同屏相邻的两块不许同族**（含两栏网格的左右与上下邻居）。 */
export type Tint = 'blue' | 'lav' | 'rose' | 'sage' | 'cream' | 'peach' | 'aqua' | 'yellow' | 'coral'
export type ChapterId = 'hero' | 'services' | 'cases' | 'work' | 'craft' | 'notes' | 'contact'
export type Chapter = { id: ChapterId; label: string; tone: Tone; no: string; tint: Tint | 'teal' }

/** 地面色两档交替；tint 染章头那个巨号编号与章名药丸，七章七族、一族不重。 */
export const chapters: Chapter[] = [
  { id: 'hero', label: '开场', tone: 'paper', no: '00', tint: 'blue' },
  { id: 'services', label: '服务', tone: 'alt', no: '01', tint: 'rose' },
  { id: 'cases', label: '案例', tone: 'paper', no: '02', tint: 'lav' },
  { id: 'work', label: '作品', tone: 'alt', no: '03', tint: 'cream' },
  { id: 'craft', label: '主线', tone: 'paper', no: '04', tint: 'sage' },
  { id: 'notes', label: '写作', tone: 'alt', no: '05', tint: 'peach' },
  { id: 'contact', label: '联系', tone: 'paper', no: '06', tint: 'aqua' },
]

/* ---------------------------------------------------------------- 身份 */

export const profile = {
  name: '茉灵智库',
  handle: '88lin',
  role: 'AI Agent 工程实践者 · 独立开发者',
  latinTagline: 'Turning frontier AI into shipped, maintainable engineering.',
  location: '中国 · 浙江',
  since: '2022',
  githubSince: '2022-08-13',
}

export const profileLabel = `${profile.name}（${profile.handle}）`

/**
 * 标题里的品牌写法：两个名号并列，不做主次。
 * 正文用 profileLabel（茉灵智库（88lin）），标题单独用这个——
 * 并列的「·」让 88lin 看起来是同等的名号，而不是括号里的注解。
 */
export const profileTitleLabel = `${profile.name} · ${profile.handle}`

export const hero = {
  line1: '把前沿 AI 变成',
  line2Pre: '可',
  line2Mark: '交付',
  line2Mid: '、可',
  line2Circle: '维护',
  line3: '的工程结果。',
  sub: `${profileLabel}是独立开发者，提供 AI Agent 开发、工作流自动化、网站定制与 GitHub 项目二次开发。下面六项服务写清交付物，开源案例提供源码与数字出处，方便你判断是否适合合作。`,
  latin: '88LIN · WORK THAT SHIPPED',
  primaryCta: '说说你的需求',
  secondaryCta: '看能接什么活',
}

export const CTA_LABEL = '说说你的需求'
export const CONTACT_EMAIL = '431761794@qq.com'
export const CONTACT_HREF = 'mailto:431761794@qq.com?subject=%E5%90%88%E4%BD%9C%E5%92%A8%E8%AF%A2'

/** 导航站。那批小站只留这一枚入口，不在官网再抄一份目录。 */
export const hub = {
  href: 'https://go.88lin.eu.org/',
  label: 'go.88lin.eu.org',
  title: '数字花园导航',
  blurb: '这些年做的小页面、工具与节日特效都收在那儿，按用途分了十类。',
}

/* ---------------------------------------------------------------- 读数 */

export type Metric = {
  /** 页面按 id 取值，不按数组下标 —— 下标一动就会取错一格。 */
  id: 'stars' | 'forks' | 'repos' | 'followers' | 'posts' | 'tags'
  value: string
  unit?: string
  label: string
  sub: string
  source: string
}

export const metrics: Metric[] = [
  {
    id: 'stars',
    value: formatCount(github.stars),
    label: '累计 Star',
    sub: `${github.originals} 个原创仓库合计`,
    source: 'GET /users/88lin/repos → Σ stargazers_count (fork=false)',
  },
  {
    id: 'repos',
    value: String(github.originals),
    label: '原创仓库',
    sub: `另有 ${github.forkedRepos} 个 fork，共 ${github.publicRepos} 个公开仓库`,
    source: 'GET /users/88lin/repos → count(fork=false)',
  },
  {
    id: 'forks',
    value: formatCount(github.forks),
    label: '被 Fork',
    sub: '有人真的拿去改了',
    source: 'GET /users/88lin/repos → Σ forks_count (fork=false)',
  },
  {
    id: 'followers',
    value: formatCount(github.followers),
    label: '关注者',
    sub: `没有互关任务，只有 ${github.following} 个 following`,
    source: 'GET /users/88lin → followers',
  },
  {
    id: 'posts',
    value: String(blog.posts),
    label: '博客文章',
    sub: '工具、教程、资源，写完就能抄走用',
    source: 'blog.88lin.eu.org 首页统计条',
  },
  {
    id: 'tags',
    value: String(blog.tagTotal),
    label: '文章标签',
    sub: '一篇可挂多个，所以合计比文章数大',
    source: 'blog.88lin.eu.org 首页标签云条目数',
  },
]

export const metric = (id: Metric['id']): Metric => {
  const hit = metrics.find((m) => m.id === id)
  if (!hit) throw new Error(`metrics 里没有「${id}」`)
  return hit
}

/* ---------------------------------------------------------------- 能接什么活 */

export type Service = {
  id: string
  no: string
  title: string
  body: string
  /** 关键词条：客户按这些词对号入座，页面上这一行最重 */
  does: string[]
  deliver: string
  fit: string
  tint: Tint
}

export const servicesIntro = {
  headline: '开发与自动化服务',
  body: '六件可以直接开工的事。每件都写了具体能做什么、交付什么、适合谁 —— 你对着找自己那一条就行。',
  priceLabel: '按需求报价',
  priceNote: '先聊清楚再开工。说明问题、判断可行性这一段不收费，做不了会直接说做不了。',
}

export const services: Service[] = [
  {
    id: 'repo',
    no: '01',
    title: 'GitHub 项目跑通与二次开发',
    body: `拿到一个开源仓库装不起来、跑到一半报错、或者想改成自己要的样子，都可以直接丢过来。我自己维护着 ${github.originals} 个原创仓库，踩环境的坑踩得够多。`,
    does: ['代码复现', '环境部署', '依赖报错', 'Git 冲突', '二次开发', '前端美化', 'Bug 排查', '功能修改'],
    deliver: '能跑起来的环境、一份从零开始的复现步骤、改动说明',
    fit: '手上有 repo 但装不起来，或者需要在别人的代码上继续改的人',
    tint: 'lav',
  },
  {
    id: 'oss',
    no: '02',
    title: '开源贡献协助（Issue / PR）',
    body: '带你在万星级仓库完成一次真实、可追溯的开源贡献，最后出现在仓库的 Contributor 列表里。可以指定仓库，也可以由我按你的方向推荐。',
    does: ['选仓库', '找 Issue', '写 PR', '应对 Review', 'Bug Fix', '文档与国际化', '新功能'],
    deliver: '一次被合并的贡献、Contributor 身份、一段能写进简历的说明',
    fit: '想丰富简历、补一段真实开源经历的同学与开发者',
    tint: 'blue',
  },
  {
    id: 'skill',
    no: '03',
    title: '把一本书蒸馏成 AI Skill',
    body: '把一本书、一套方法论或一摊内部经验，压成 Agent 能直接调用的 Skill：能力卡、触发条件、检查清单一应俱全，导入任意 Agent 就能用。',
    does: ['书籍蒸馏', '方法论建卡', 'Skill 打包', '多宿主适配', '教程编写', '流水线自检'],
    deliver: '可导入的 Skill 目录、使用教程、一条自己会报错的校验流水线',
    fit: '想把知识变成随时能调用的能力，而不是又一个收藏夹的人',
    tint: 'cream',
  },
  {
    id: 'agent',
    no: '04',
    title: 'Agent 工作流与自动化',
    body: '把一件反复做的事变成 Agent 自己能跑完的流程。接你现有的仓库、文档与部署链路，跑完能看见改动，不是只会给建议。',
    does: ['Agent Skill', 'MCP 工具接入', '知识库与 RAG', '定时任务', '网页采集', '接口对接', '批量处理'],
    deliver: '能跑的工作流、部署方式、出错时该看哪里',
    fit: '已经在用 AI，但一直停在「问答」这一步的团队和个人',
    tint: 'sage',
  },
  {
    id: 'front',
    no: '05',
    title: '网站开发与创意前端',
    body: '有视觉主张的页面：品牌站、产品发布页、交互叙事；也接已有站点的功能增加与页面修改。你正在看的这一页就是同一套手艺做的。',
    does: ['整站设计与开发', 'Three.js / WebGL', '滚动编排', '设计系统与令牌', '性能与可访问性', '旧站改版'],
    deliver: '可维护的代码、一套自己能改下去的设计令牌与文档、性能预算达标',
    fit: '已经有内容、但页面撑不起内容的项目',
    tint: 'aqua',
  },
  {
    id: 'fix',
    no: '06',
    title: '程序定制与疑难杂症',
    body: 'Python / JavaScript 的小工具定制，已有程序的 Bug 修复、调试与性能优化。往下一层的系统、服务器到电脑本身的毛病也能看 —— 我为这件事专门写过一个 Agent Skill。',
    does: ['脚本与小工具', 'Bug 修复', '性能优化', '数据处理', 'Windows / macOS / Linux', '服务器与部署', '电脑维修'],
    deliver: '能用的东西、源码、以及怎么自己继续改',
    fit: '需求不大没人愿意接，或者已经被别人做砸了的活',
    tint: 'rose',
  },
]

/** 合作前的常见问题，答案只描述当前实际流程。 */
export const cooperationQuestions = [
  {
    question: 'GitHub 项目跑不起来，联系前要准备什么？',
    answer: '先发仓库地址、报错日志或截图，并说明你想实现的功能。不需要先写完整需求文档；我会先判断能否处理、怎么处理和大概多久。',
  },
  {
    question: '开发和自动化服务怎么报价？',
    answer: '按需求报价。说明问题与判断可行性不收费，能做再确认范围与报价；交付前先验收，不满意的地方按确认的范围修改。',
  },
  {
    question: '这些案例能证明哪些能力？',
    answer: '这些是我的开源项目与工程实践，用于展示实现方法、技术取舍和维护经验。可以查看源码与数字出处自行核验；它们不代表商业客户评价，也不保证其他项目有相同结果。',
  },
]

/** 三步流程。作用是降低第一封信的门槛，写清哪一步不要钱。 */
export const servicesFlow = [
  {
    no: '01',
    title: '说清楚你要解决什么',
    body: '贴仓库地址、截图、报错日志都行，不需要先整理成需求文档。',
  },
  {
    no: '02',
    title: '我回一份可执行的判断',
    body: '能不能做、打算怎么做、大概多久。做不了会直接说做不了。这一步不收费。',
  },
  {
    no: '03',
    title: '确认范围与报价，开工',
    body: '范围写在明面上，交付前你先验，不满意的地方当场改。',
  },
]

/* ---------------------------------------------------------------- 两条主线 */

export type Track = { id: string; title: string; body: string }

export const tracksIntro = {
  headline: '两条主线，一个交点',
  body: '上面那些活都长在这两条线上。左边这条负责让 AI 真的能改到线上，右边这条负责让人愿意看、看得懂、用得下去。',
  /* 拆三段是为了给中间那截压一枚实心黄块（.mark）——
     参照站的大句子都是这个读法：墨字 + 一块黄，不是整块黄底。 */
  thesis: { before: '交点是同一件事：把不确定的能力，接进', mark: '确定的工程约束', after: '里。' },
}

export const trackA = {
  id: 'A',
  title: 'AI Agent 工程',
  items: [
    {
      id: 'agent',
      title: 'Agent 工程化',
      body: 'Codex / Claude Code / OpenClaw 多智能体协同：代码阅读、开发实现、测试验证、Code Review 与 GitHub 长期维护。',
    },
    {
      id: 'mcp',
      title: 'MCP 与工具链',
      body: '打通浏览器、GitHub、Notion、文档与部署工具，让 Agent 真的能改到线上，而不是只会写建议。',
    },
    {
      id: 'rag',
      title: '知识库与 RAG',
      body: '把项目文档、Issue、FAQ 与设计规范沉淀为可检索知识库，让答案有出处、可复核。',
    },
  ] as Track[],
}

export const trackB = {
  id: 'B',
  title: '创意前端',
  items: [
    {
      id: 'webgl',
      title: 'WebGL 与实时渲染',
      body: 'Three.js 场景、自定义着色器、GPGPU 粒子与色散折射。用一块画布承载整页叙事，而不是堆插件。',
    },
    {
      id: 'system',
      title: '交互与视觉系统',
      body: '令牌化的色彩、字体与间距，滚动编排与状态反馈成体系，改一处不会崩全站。',
    },
    {
      id: 'perf',
      title: '性能与可访问性',
      body: '预算先行：LCP、CLS、包体积、对比度与减弱动效降级，全部在构建期用脚本卡住。',
    },
  ] as Track[],
}

/* ---------------------------------------------------------------- 装备 */

export const stack = {
  headline: '手上有什么',
  body: '不是徽章墙，是这两年交付项目时真正反复用到的那一批。下面十个仓库的技术栈全在里面。',
  clusters: [
    {
      id: 'ai',
      title: 'AI 与 Agent',
      items: ['OpenAI', 'Anthropic Claude', 'Gemini', 'Ollama', 'MCP', 'Agent Skills', 'RAG', 'Hugging Face', 'PyTorch'],
    },
    {
      id: 'front',
      title: '前端与图形',
      items: ['TypeScript', 'React', 'Vue', 'Next.js', 'Astro', 'Three.js', 'GSAP', 'Tailwind', 'Vite', 'PWA'],
    },
    {
      id: 'back',
      title: '服务端与数据',
      items: ['Node.js', 'Python', 'Java / Spring', 'Go', 'PostgreSQL', 'MySQL', 'Redis', 'MongoDB', 'SQLite'],
    },
    {
      id: 'ops',
      title: '工程与交付',
      items: ['Git', 'GitHub Actions', 'Docker', 'Kubernetes', 'Nginx', 'Cloudflare', 'ESLint', 'Playwright'],
    },
  ],
}

/* ---------------------------------------------------------------- 作品 */

export type ProjectState = 'live' | 'maintained' | 'archived'

export type Project = {
  slug: string
  name: string
  cn: string
  year: string
  /** 品类。不要写成状态 —— state 也会渲在同一行，撞了就重复一个词。 */
  kind: string
  blurb: string
  stack: string[]
  stars: number
  forks: number
  state: ProjectState
  live?: string
  repo: string
  tint: Tint
}

export const worksIntro = {
  headline: '做过的东西',
  body: '十个还在维护的仓库，横着滑。每张卡写清它解决什么、用什么做的、现在什么状态，点卡里的按钮可以直接打开或看源码。star 与 fork 来自 GitHub API，更新日期见页脚。',
}

/* 首屏叠卡的门槛：star 少于这个数的不进叠卡。 */
export const DECK_MIN_STARS = 10

const projectContent: Omit<Project, 'stars' | 'forks'>[] = [
  {
    slug: 'video_vip',
    name: 'video_vip',
    cn: '多平台视频解析脚本',
    year: '2023',
    kind: '用户脚本',
    blurb:
      '我 star 最多的仓库，也是维护时间最长的一个。在视频站播放页挂一枚可拖动的按钮，把播放地址交给第三方解析源换回能播的播放器。当前 16 路解析源随时可切，22 条站点适配各写自己的容器与遮罩清理规则。',
    stack: ['JavaScript', '油猴脚本', '多端适配'],
    state: 'maintained',
    live: 'https://88lin.github.io/vip/',
    repo: 'https://github.com/88lin/video_vip',
    tint: 'lav',
  },
  {
    slug: 'workbuddy-auto-signin',
    name: 'workbuddy-auto-signin',
    cn: 'WorkBuddy 签到自动化',
    year: '2026',
    kind: '自动化工具',
    blurb:
      '把每日签到、成长任务、盲盒、连登兑换与断登补签全接管掉。零依赖纯 Python，Windows / macOS 定时任务，配置可以直接交给 AI 一句话生成，之后静默跑着不花 token。',
    stack: ['Python', '零依赖', '定时任务', 'MIT'],
    state: 'maintained',
    repo: 'https://github.com/88lin/workbuddy-auto-signin',
    tint: 'blue',
  },
  {
    slug: 'computer-repair-skill',
    name: 'computer-repair-skill',
    cn: '跨平台电脑维修 Agent',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '让 Agent 像一名谨慎的维修工程师：64 个按需加载的 Playbook，覆盖 Windows / macOS / Linux 的诊断、清理、性能、网络与安全维护。先取证，再计划，确认后修改。',
    stack: ['Agent Skill', 'Python', 'Markdown', 'AGPL-3.0'],
    state: 'live',
    live: 'https://repair.88lin.eu.org',
    repo: 'https://github.com/88lin/computer-repair-skill',
    tint: 'rose',
  },
  {
    slug: 'lofi-radio-web',
    name: 'Lofi Radio Web',
    cn: '专注场景的网页电台',
    year: '2026',
    kind: '创意前端',
    blurb:
      'macOS 灵动岛式播放器可拖到任意位置，21 个精选电台，打开即听，不用注册也不用下载。五个单键快捷键、专注计时、睡眠定时 15 分钟到 8 小时，支持 PWA 安装。',
    stack: ['Next.js 16', 'React', 'TypeScript', 'PWA'],
    state: 'live',
    live: 'https://lofi.88lin.eu.org',
    repo: 'https://github.com/88lin/lofi-radio-web',
    tint: 'sage',
  },
  {
    slug: 'agentrouter-auto-signin',
    name: 'agentrouter-auto-signin',
    cn: 'AgentRouter 额度自动领取',
    year: '2026',
    kind: '自动化工具',
    blurb:
      '每日签到额度自动领，支持多账号与余额换算，错过了会自动补签。纯 Python 本地静默运行，Windows / macOS / Linux 三套定时任务都给了现成配置。',
    stack: ['Python', '多账号', 'cron', 'MIT'],
    state: 'maintained',
    repo: 'https://github.com/88lin/agentrouter-auto-signin',
    tint: 'cream',
  },
  {
    slug: 'react-ai-orb',
    name: 'react-ai-orb',
    cn: 'AI 界面的发光球体组件',
    year: '2026',
    kind: '前端组件',
    blurb:
      '给 AI 助手与聊天机器人做的动画球体：纯 CSS 动画、零运行时依赖，内置 8 套调色板与 8 个预设，装上就能用。React 19 与 TypeScript 类型都带着。',
    stack: ['React 19', 'TypeScript', 'CSS 动画', 'MIT'],
    state: 'live',
    live: 'https://88lin.github.io/react-ai-orb',
    repo: 'https://github.com/88lin/react-ai-orb',
    tint: 'peach',
  },
  {
    slug: 'facetmark',
    name: 'facetmark',
    cn: '本地书签检索引擎',
    year: '2026',
    kind: '检索工程',
    blurb:
      '给书签建四条索引（字面、内容、意图、上下文），RRF 融合之后逐维实测，赢的留、输的关。负面结果写进 README，不藏。本地单文件 SQLite，1,524 个测试。',
    stack: ['Python', 'SQLite FTS5', 'RRF', 'Local-first'],
    state: 'live',
    live: 'https://88lin.github.io/facetmark/',
    repo: 'https://github.com/88lin/facetmark',
    tint: 'aqua',
  },
  {
    slug: 'textmark',
    name: 'textmark',
    cn: '文字隐形水印',
    year: '2026',
    kind: '浏览器工具',
    blurb:
      '用 Unicode 变体选择符给任意一段文字埋一层看不见的水印，带 Reed-Solomon 纠错与可选的 AES-GCM-256 加密，另配一条 AI 读得懂的 emoji 签名。纯浏览器本地运行，零网络请求，编码规范完全公开。',
    stack: ['JavaScript', 'Unicode', 'Reed-Solomon', '纯前端'],
    state: 'live',
    live: 'https://88lin.github.io/textmark/',
    repo: 'https://github.com/88lin/textmark',
    tint: 'lav',
  },
  {
    slug: 'geo-book-skill',
    name: 'geo-book-skill',
    cn: '一本书蒸馏成的 Skill',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '把《从 SEO 到 GEO》整本书压成 13 张方法论能力卡，讲的是怎么让内容被 AI 搜索引用。适配 Claude Code / Codex / Cursor 等宿主，带教程与全流水线审计 —— 「蒸馏一本书」那项服务的样板。',
    stack: ['Agent Skill', 'GEO', 'Python', 'MIT'],
    state: 'maintained',
    repo: 'https://github.com/88lin/geo-book-skill',
    tint: 'blue',
  },
  {
    slug: 'gzh-design-skill',
    name: 'gzh-design-skill',
    cn: '公众号排版技能',
    year: '2026',
    kind: 'Agent 工程',
    blurb:
      '把 Markdown 一键排成能直接粘进公众号编辑器的 HTML。6 套精选主题加一个主题生成器，样式全内联不掉格式，两道脚本关卡校验。',
    stack: ['Agent Skill', 'HTML', 'Python Lint'],
    state: 'live',
    live: 'https://88lin.github.io/gzh-design-skill/docs/gallery/index.html',
    repo: 'https://github.com/88lin/gzh-design-skill',
    tint: 'rose',
  },
]

export const projects: Project[] = projectContent.map((project) => ({
  ...project,
  ...repositoryStats(project.slug),
}))

/* ---------------------------------------------------------------- 写作 */

export const writing = {
  headline: '写下来的部分',
  body: '博客写的是能直接抄走用的东西：软件资源、AI 工具、效率方法、学习资料。不追热点，追可复用。下面是标签计数，一篇文章可以挂多个标签，所以合计比文章数大。',
  href: 'https://blog.88lin.eu.org',
  hrefLabel: 'blog.88lin.eu.org',
  posts: blog.posts,
  /** 按本次快照年份计算，避免跨年水合差异。 */
  years: Number(AS_OF.slice(0, 4)) - 2021,
  since: '2021',
  tags: blog.tags,
  tagTotal: blog.tagTotal,
  latest: blog.latest,
}

/* ---------------------------------------------------------------- 联系 */

export type ContactChannel = {
  id: string
  label: string
  value: string
  href: string
  /** 是否代表作者的身份页；群聊邀请等联系入口不是 sameAs。 */
  isProfile: boolean
}

export const contact = {
  headline: '有想做的东西？',
  body: '把你要解决的问题说清楚就行 —— 贴仓库地址、截图、报错日志都可以。我会回一份可执行的判断：能不能做、怎么做、大概多久，做不了会直接说。这一步不收费。',
  primary: { label: '邮箱', value: CONTACT_EMAIL, href: CONTACT_HREF },
  /** 微信是二维码不是链接，行为和其它渠道不一样，所以单开一块。 */
  wechat: {
    label: '微信',
    hint: '扫码加我，备注来意',
    src: './wechat-qr.png',
  },
  channels: [
    { id: 'github', label: 'GitHub', value: '@88lin', href: 'https://github.com/88lin', isProfile: true },
    { id: 'qq', label: 'QQ 群', value: '进群聊', href: 'https://qm.qq.com/q/Q46OjlCcY8', isProfile: false },
    { id: 'wechat-mp', label: '公众号', value: '茉灵智库', href: 'https://go.88lin.eu.org/gzh', isProfile: true },
    { id: 'blog', label: '博客', value: 'blog.88lin.eu.org', href: 'https://blog.88lin.eu.org', isProfile: true },
    { id: 'bilibili', label: '哔哩哔哩', value: 'Hathaway', href: 'https://space.bilibili.com/1412014683', isProfile: true },
    { id: 'hub', label: '导航站', value: 'go.88lin.eu.org', href: hub.href, isProfile: true },
  ] satisfies ContactChannel[],
}

export const footer = {
  copyright: '© 2023-2026 茉灵智库 · 88lin',
  note: '本站由 Vite + React + GSAP 构建，页面上每个数字都来自公开接口，写了出处，可以自己去核。',
  asOf: AS_OF,
}
