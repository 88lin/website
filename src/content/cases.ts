/**
 * 四个深度案例。首页 04 通道用 `summary` + `results`，案例子页用全部字段。
 *
 * 写法规矩：每个案例只讲清楚一件事，按「背景 / 卡在哪 / 怎么解」三段走，
 * 结果只放能被第三方核到的数字，并在 `provenance` 里逐条写明出处。
 * 没有客户证言、没有营收、没有奖项——这些我没有，就不写。
 */

import type { Tint } from './site'

export type CaseSection = { label: string; body: string }
/**
 * 一条实测。label 必须是**名词短语**，量词不要写在开头。
 * 首页那张账目表是「标签 …… 数值」的排法（目录/发票那种），
 * 写成「路解析接口」就会读成「路解析接口 … 18」，语序是反的。
 * 量词省掉不丢信息：中文里「解析接口 18」本来就读得通。
 */
export type CaseResult = { value: string; label: string }
export type Provenance = { value: string; from: string }

export type CaseStudy = {
  slug: string
  no: string
  name: string
  cn: string
  /** 一句话论点，首页卡片上最大的那行 */
  claim: string
  tint: Tint
  year: string
  role: string
  stackLine: string
  /** 首页卡片用的短摘要 */
  summary: string
  sections: CaseSection[]
  /** 子页专属：关键取舍，写清楚放弃了什么 */
  tradeoffs: { title: string; body: string }[]
  results: CaseResult[]
  provenance: Provenance[]
  link?: string
  linkLabel?: string
  repo: string
}

export const casesIntro = {
  headline: '怎么做的',
  body: '四个项目，各写清楚一件事：背景、卡在哪、最后怎么解。数字都是仓库里能查到的。',
}

export const cases: CaseStudy[] = [
  {
    slug: 'lofi',
    no: '01',
    name: 'Lofi Radio Web',
    cn: '专注场景的网页电台',
    claim: '打开网页就出声，不用注册，也不用下载',
    tint: 'blue',
    year: '2026',
    role: '独立设计与开发',
    stackLine: 'Next.js 16 · TypeScript · PWA · MIT',
    summary:
      'Lofi 低保真音乐常被用来做专注时的背景音。这个站把它做成打开即听：21 个精选电台，macOS 灵动岛式播放器可以拖到屏幕任意位置，五个单键快捷键，专注计时只在播放时累计，睡眠定时从 15 分钟到 8 小时。没有账号，没有推荐流。',
    sections: [
      {
        label: '背景',
        body: '专注时的背景音需求很稳定，但主流音乐应用都要登录、有推荐流、有社交入口，注意力反而被抢走。目标是一个打开就出声、之后不再打扰你的电台页。',
      },
      {
        label: '卡在哪',
        body: '音源全部是外部的 —— B 站的 Lofi Girl 直播流，加上 Lofi Cafe、SomaFM、Code Radio、Swiss Classic 这些公开电台，可用性并不一致，直播流还会换协议。播放器又必须小到不占视线，同时得能被随手挪走、能纯键盘操作、桌面和手机都成立。',
      },
      {
        label: '怎么解',
        body: 'B 站直播源准备 HLS 与 FLV 两套候选并做故障回退，切台一键换源。播放器取 macOS 灵动岛的形态，可自由拖到屏幕任意位置；黑胶唱片的旋转动画兼作「正在播」的状态指示，不用额外文字。Space / ← / → / M / T 五个单键覆盖播放、切台、静音与主题，暗亮主题跟随系统。专注计时只在播放时累计、数据只存本地、每天自动重置 —— 它是个习惯工具，不该变成又一处要登录的地方。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了账号与收藏',
        body: '一旦有收藏就要有账号，接着是历史、同步、推荐，一路滑回主流音乐应用。宁可少一个功能，也不引入第一个需要登录的理由。',
      },
      {
        title: '放弃了自定义音源',
        body: '让用户填 URL 会把「打开即听」变成「先配置」。21 路是挑过的，可用性由我负责，挂了由我换。',
      },
    ],
    results: [
      { value: '90', label: 'GitHub Star' },
      { value: '23', label: 'Fork' },
      { value: '21', label: '精选电台' },
      { value: '0', label: '注册步骤' },
    ],
    provenance: [
      { value: '90 Star / 23 Fork', from: 'GitHub API：GET /repos/88lin/lofi-radio-web，2026-08-23' },
      { value: '21 精选电台', from: 'README 功能特性表：涵盖 Lofi / Chillhop / Jazz / Classical / Hip-Hop / Ambient' },
      { value: '5 个单键快捷键', from: 'README 快捷键表：Space / ← / → / M / T' },
      { value: '0 注册步骤', from: 'lofi.88lin.eu.org 无账号体系，打开即播' },
    ],
    link: 'https://lofi.88lin.eu.org',
    linkLabel: '在线体验',
    repo: 'https://github.com/88lin/lofi-radio-web',
  },
  {
    slug: 'repair',
    no: '02',
    name: 'Computer Repair Skill',
    cn: '跨平台电脑维修 Agent',
    claim: '先取证，再判断；先计划，再修改',
    tint: 'yellow',
    year: '2026',
    role: '技能设计与实现',
    stackLine: 'Agent Skill · Python · Markdown · AGPL-3.0',
    summary:
      '一个能装进 Codex / Claude Code / OpenClaw 的跨平台电脑维修 Skill。C 盘爆满、卡顿、流氓软件、弹窗广告、网络问题这些直接用自然语言说，Agent 按平台与风险挑一条 Playbook 走。62 个 Playbook 按需加载，覆盖 Windows / macOS / Linux。标题那句是它写在 README 第一行的规矩。',
    sections: [
      {
        label: '背景',
        body: 'C 盘爆满、系统卡顿、流氓软件、数据恢复，这类问题用自然语言描述很容易，但通用 Agent 常常跳过取证直接给命令。在别人的真机上执行，这是有破坏性的。',
      },
      {
        label: '卡在哪',
        body: '既要覆盖 Windows / macOS / Linux 三套完全不同的排查路径，又不能把所有知识一次性塞进上下文。塞进去就会互相干扰，Agent 会在 Windows 的问题上引用 Linux 的命令。同时必须区分只读诊断与写操作，让删除、提权、分区、服务修改这类动作永远先经过人确认。',
      },
      {
        label: '怎么解',
        body: '把知识拆成 62 个专项 Playbook，通过一张路由索引按问题按需加载，无关内容不进上下文。执行层设两条硬规则：证据优先，先读系统状态、日志与硬件事实，再建立候选原因；只读优先，任何改变状态的操作都必须先给出影响面、回滚方案与验证步骤。技能资源以 Markdown 为主，不绑定桌面程序，装进你已经在用的 Agent 就行；仓库带 CI，每次改动都校验 Skill 结构与 Playbook 索引，保证 62 个文件的路由表永远对得上。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了「一句话修好」的体验',
        body: '确认步骤会让流程变慢。但这是维修，不是补全代码。一次误删的代价远高于多按一次回车。慢是设计出来的。',
      },
      {
        title: '放弃了桌面客户端',
        body: '做成客户端就要处理签名、更新、权限弹窗与三套安装包。以文本资源为主的 Skill 可以被任何支持 Agent Skill 的宿主直接读，迁移成本接近零。',
      },
    ],
    results: [
      { value: '62', label: '专项 Playbook' },
      { value: '3', label: '覆盖操作系统' },
      { value: 'CI', label: '结构校验' },
      { value: '0', label: '需装桌面端' },
    ],
    provenance: [
      { value: '62 专项 Playbook', from: '仓库 playbooks 目录文件数与路由索引条目数' },
      { value: '3 覆盖操作系统', from: 'README 声明的 Windows / macOS / Linux 三条排查路径' },
      { value: 'CI 结构校验', from: '仓库 GitHub Actions 工作流：路由表与 Playbook 结构校验' },
      { value: '8 Star / 1 Fork', from: 'GitHub API：GET /repos/88lin/computer-repair-skill，2026-08-23' },
    ],
    link: 'https://repair.88lin.eu.org',
    linkLabel: '官方网站',
    repo: 'https://github.com/88lin/computer-repair-skill',
  },
  {
    slug: 'facetmark',
    no: '03',
    name: 'facetmark',
    cn: '本地书签检索引擎',
    claim: '四条索引逐维实测，赢的留、输的关',
    tint: 'coral',
    year: '2026',
    role: '独立设计与开发',
    stackLine: 'Python · SQLite FTS5 · RRF · Local-first',
    summary:
      '书签搜索只匹配标题，但你记得的是「为什么存」。我给每条书签建四条索引（字面、内容、意图、上下文），用 RRF 融合，然后逐维跑对照实验：融合组输给了最简配置 5.4 个百分点，于是输掉的维度默认关闭，负面结果写进 README。',
    sections: [
      {
        label: '背景',
        body: '八个月前存过一个页面。你记得为什么存（「帖子里有人讲 Postgres 索引类型的那个」），也记得大概什么时候存的。唯独不记得标题，而浏览器书签搜索只匹配标题。',
      },
      {
        label: '卡在哪',
        body: '直觉的解法是「索引越多越好」：字面匹配、语义向量、LLM 生成的意图查询、收藏时的上下文，四路召回用 RRF 一融合，听上去就是答案。但每多一路索引，构建成本、存储、查询延迟都在涨，而「多一定比少好」从来没有人真量过。',
      },
      {
        label: '怎么解',
        body: '把每条索引当成一个可证伪的假设：四套索引全部建出来，配 RRF 融合，再写一个 eval 命令对 20 余种配置逐个跑同一组查询集。结果发表在 README 里：融合组输给了最简的内容向量配置 5.4 个百分点，加字面索引再掉 5.4pp。于是出厂默认只开赢的那一路，输掉的保留开关但默认关闭。检索之外的一切刻意从简：单文件 SQLite、本地优先、对浏览器书签库永远只读。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了「融合一定更强」的卖点',
        body: '多路融合在 demo 里更好看，但实测更差。把负面结果写进 README 会让项目显得「没那么强」，但这就是测量的意义：数字约束项目能宣称什么。',
      },
      {
        title: '放弃了云端同步与账号体系',
        body: '本地单文件意味着换机器要自己搬数据。但书签是隐私数据，「什么都不上传」这条承诺比同步便利性更值钱。',
      },
    ],
    results: [
      { value: '4', label: '索引假设' },
      { value: '1,524', label: '测试用例' },
      { value: '5.4pp', label: '融合组实测负增益' },
      { value: '1', label: 'SQLite 文件' },
    ],
    provenance: [
      { value: '1,524 测试用例', from: 'facetmark README Tests 徽章与 tests/ 目录，2026-08-23' },
      { value: '融合 -5.4pp', from: 'README「What Is Actually Measured」：配置 B 对配置 A 的 W1 查询集实测' },
      { value: '4 条索引 / RRF 融合', from: 'README「How It Works」：lex_tri / lex_seg / content / intent + context' },
      { value: '0 Star / 1 Fork', from: 'GitHub API：GET /repos/88lin/facetmark，2026-08-23' },
    ],
    link: 'https://88lin.github.io/facetmark/',
    linkLabel: '项目主页',
    repo: 'https://github.com/88lin/facetmark',
  },
  {
    slug: 'video-vip',
    no: '04',
    name: 'video_vip',
    cn: '全网 VIP 视频解析脚本',
    claim: '在会员视频页上挂一枚按钮，换一个能播的播放器',
    tint: 'coral',
    year: '2023 起持续维护',
    role: '独立开发与长期维护',
    stackLine: 'JavaScript · 油猴脚本 · v3.1.15',
    summary:
      '2023 年写的用户脚本，现在 4,686 star，是我维护时间最长的一个。它做的事很朴素：在视频站的播放页左上角挂一枚可拖动的悬浮按钮，点开选一路解析源，把当前播放地址交给它，换回一个能播的播放器容器，并按站点各自的规则清掉会员遮罩与弹层。',
    sections: [
      {
        label: '背景',
        body: '解析接口全部收集自互联网，能返回可播地址。但每个视频站的播放器容器、会员遮罩节点都不一样，手动折腾一次只解决一个站、一次访问。写成油猴脚本是为了把这件重复劳动固化下来：装一次，之后打开支持的页面就有那枚按钮。',
      },
      {
        label: '卡在哪',
        body: '三件事都不在「怎么解析」上。一是每个站的 DOM 都不同，22 条站点适配要分别写清播放器容器选择器与要清掉的遮罩/弹层节点，桌面与移动端还是两套；二是解析接口是别人的服务，随时会下线、变慢或插广告，脚本控制不了画质也控制不了广告；三是使用门槛根本不在脚本里 —— 大量用户卡在装脚本管理器、或者装了没开「允许用户脚本」。',
      },
      {
        label: '怎么解',
        body: '解析源做成一张可切换的清单（当前 16 路），失效就换一路、跟着版本更新，不绑死一家；脚本自己不判断谁快谁好，判断权交给此刻能播的那一路。站点适配不用通用选择器，22 条各写一份自己的 container 与 displayNodes / cleanupNodes，改一个站不牵动其余。入口用 35 条 @include 同时覆盖桌面与移动端域名。按钮可以右键拖到任意位置，因为不同站点的控制条位置不一样，固定坐标注定挡住某个站。另外提供一个不装脚本也能用的网页版。README 里篇幅最长的一节不是实现，是「怎么装、为什么不生效、建议配 AdGuard」—— 一个 4,686 star 的脚本，长期成本主要花在兼容性与用户支持上，这一点写在明面上比藏起来有用。',
      },
    ],
    tradeoffs: [
      {
        title: '放弃了自建解析',
        body: '自建能控制画质，但要碰版权与带宽，也不是我能长期维护的东西。用第三方就必须接受画质与广告不可控 —— README 把这句写在最前面，并建议配 AdGuard，不含糊过去。',
      },
      {
        title: '放弃了「自动挑最快的接口」',
        body: '探活得真去请求每一路，慢、吵、还容易被限流。让人一秒切换比让程序猜可靠，代价是用户偶尔要多点一次。',
      },
    ],
    results: [
      { value: '4,686', label: 'GitHub Star' },
      { value: '476', label: 'Fork' },
      { value: '16', label: '解析源' },
      { value: '22', label: '站点适配' },
    ],
    provenance: [
      { value: '4,686 Star / 477 Fork', from: 'GitHub API：GET /repos/88lin/video_vip，2026-08-23' },
      { value: '16 路解析源', from: 'video_vip.user.js v3.1.15 里 ?url= 形式的解析地址计数' },
      { value: '22 条站点适配', from: '同一文件的 host 配置条目数，覆盖 13 个独立域名，含桌面与移动端' },
      { value: '35 条 @include', from: '同一文件脚本头，覆盖桌面与移动端入口' },
    ],
    link: 'https://88lin.github.io/vip/',
    linkLabel: '网页版',
    repo: 'https://github.com/88lin/video_vip',
  },
]

/**
 * video_vip 当前的 16 路解析源，名字与顺序照 video_vip.user.js v3.1.15 的
 * videoParseList 抄的。数量会随版本变（v3.1.10 是 18 路），所以改这里之前先读源码。
 */
export const vipInterfaces = [
  'TXNQ解析',
  '虾米解析',
  '剖元解析',
  'playm3u8',
  '789解析',
  '七哥解析',
  'fongmi解析',
  '冰豆解析',
  '七七云解析',
  'CK解析',
  'HLS解析',
  '极速解析',
  '花旗解析',
  'Player-JY',
  '邦宁云解析',
  'Yparse',
]

/** 22 条站点适配，按域名字母序，与 v3.1.15 源码一致（覆盖桌面与移动端）。 */
export const vipHosts = [
  'film.sohu.com',
  'm.bilibili.com',
  'm.iqiyi.com',
  'm.mgtv.com',
  'm.v.qq.com',
  'm.youku.com',
  'tv.sohu.com',
  'v.pptv.com',
  'v.qq.com',
  'v.youku.com',
  'video.tudou.com',
  'vip.1905.com',
  'vip.pptv.com',
  'w.mgtv.com',
  'www.1905.com',
  'www.acfun.cn',
  'www.bilibili.com',
  'www.iq.com',
  'www.iqiyi.com',
  'www.le.com',
  'www.mgtv.com',
  'www.wasu.cn',
]

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug)
