/**
 * 博客文章清单 —— 机器生成，勿手改。
 *
 * 来源：blog.88lin.eu.org/archive 的 __NEXT_DATA__（博客数据库原始记录）。
 * 重新生成：scripts/gen-writing.py，步骤见 README「数据刷新」。
 * 快照时间 2026-08-08，共 55 篇。
 */

export type Post = {
  slug: string
  title: string
  /** 博客里的分类。有 1 篇在数据库里就是空的，保持为空，不臆造。 */
  cat: string
  date: string
  icon: string
}

export const BLOG = 'https://blog.88lin.eu.org'
export const postHref = (slug: string) => `${BLOG}/article/${slug}`

export const posts: Post[] = [
  { slug: '52', title: '一篇关于亲密关系中信任与判断的深度笔记', cat: '', date: '2026-06-23', icon: '💓' },
  { slug: '58', title: '正念减压之父：风靡全球的减压方法，到底是什么？', cat: '学习思考', date: '2026-06-23', icon: '🧘' },
  { slug: '16', title: '创新灭蚊方法研究', cat: '学术研究', date: '2026-06-23', icon: '🦟' },
  { slug: '43', title: '眼镜是妥协的艺术：挑框、验光、网配蔡司的避坑指南', cat: '避坑指南', date: '2026-06-21', icon: '👓' },
  { slug: '35', title: '度盘免费高清视频倍速播放教程：脚本安装与使用方法', cat: '技术教程', date: '2026-04-24', icon: '💡' },
  { slug: 'TI84', title: '免费TI84在线计算器：图形计算器网页版', cat: '软件工具', date: '2025-12-17', icon: '🤩' },
  { slug: '31', title: '人体系统调优指南：健康长寿的生活与学习习惯', cat: '碎片杂文', date: '2025-11-07', icon: '❤️‍🔥' },
  { slug: '26', title: '科学与人工智能精选资源导航', cat: '人工智能', date: '2025-10-15', icon: '🪄' },
  { slug: '50', title: '实用生活指南：必备经验与高效技巧分享', cat: '生活妙招', date: '2025-06-02', icon: '🍃' },
  { slug: '37', title: '35个实用省钱技巧：餐饮购物全攻略', cat: '极客省钱术', date: '2024-09-18', icon: '🪄' },
  { slug: '29', title: '名企求职资料包：网申笔试题库与简历模板', cat: '求职经验', date: '2024-08-30', icon: '🥪' },
  { slug: '47', title: '装修避坑指南：预算控制与选材经验清单', cat: '避坑指南', date: '2024-08-22', icon: '🏡' },
  { slug: 'wechat', title: 'iOS 微信双开教程：通过 AltStore 实现 iPhone 微信双开', cat: '技术教程', date: '2024-07-03', icon: '🤖' },
  { slug: '41', title: '移动光猫破解教程：解除限速与禁用远程控制', cat: '技术教程', date: '2024-06-12', icon: '💄' },
  { slug: '21', title: 'Notion表格功能详解：创建、筛选、计算与多视图应用', cat: '技术教程', date: '2024-04-30', icon: '🎨' },
  { slug: '15', title: '沉浸式翻译教程：免费调用DeepLX与OpenAI', cat: '技术教程', date: '2024-04-17', icon: '🎨' },
  { slug: '34', title: '免费AI大模型网站汇总', cat: '人工智能', date: '2024-03-10', icon: '🎨' },
  { slug: 'literature', title: '学术论文电子书资源大全：科研文献免费下载工具', cat: '学习思考', date: '2024-01-10', icon: '✨' },
  { slug: '46', title: '全网VIP视频免费看教程：短剧电视剧白嫖指南', cat: '技术教程', date: '2024-01-01', icon: '👀' },
  { slug: '48', title: '考研国考四六级资源汇总：备考资料大全', cat: '考研资料', date: '2023-12-20', icon: '📝' },
  { slug: '18', title: 'Adobe全家桶不限速下载指南', cat: '软件工具', date: '2023-12-18', icon: '🗂️' },
  { slug: '56', title: '艾宾浩斯遗忘曲线记忆法：高效背诵全攻略', cat: '学习思考', date: '2023-12-01', icon: '🧊' },
  { slug: '60', title: '浏览器F12开发者工具使用技巧', cat: '技术教程', date: '2023-11-08', icon: '🪄' },
  { slug: '53', title: '注册公司要避开的5个大坑：创业避雷指南', cat: '避坑指南', date: '2023-09-14', icon: '🪄' },
  { slug: '57', title: '生活用品选购指南', cat: '选购指南', date: '2023-08-22', icon: '💄' },
  { slug: '59', title: 'Mac快捷键大全：提升效率的必备组合键与隐藏技巧', cat: '技术教程', date: '2023-08-01', icon: '🏷️' },
  { slug: '32', title: 'ChatGPT提示工程指南：如何获得高质量答案', cat: '人工智能', date: '2023-05-28', icon: '💎' },
  { slug: '54', title: '北大ChatExcel：用文字指令自动处理表格神器', cat: '软件工具', date: '2023-03-08', icon: '🥙' },
  { slug: '33', title: 'Z-Library 镜像入口汇总：电子书获取与替代站点指南', cat: '学习思考', date: '2023-01-30', icon: '📚' },
  { slug: '51', title: '学生优惠权益大全', cat: '福利指南', date: '2023-01-28', icon: '👩‍💻' },
  { slug: '45', title: 'JetBrains全家桶激活教程', cat: '软件激活', date: '2023-01-20', icon: '🧑‍💻' },
  { slug: '28', title: 'Notion实用指南：打造个人知识库与高效管理', cat: '技术教程', date: '2023-01-05', icon: '✍️' },
  { slug: '3', title: 'Microsoft Edge官方离线安装包下载（最新版）', cat: '软件工具', date: '2023-01-01', icon: '🎨' },
  { slug: '24', title: '家庭常备药箱清单：新冠预防与治疗用药指南', cat: '碎片杂文', date: '2022-12-28', icon: '💊' },
  { slug: '8', title: '美区 Apple ID 注册教程', cat: '技术教程', date: '2022-12-23', icon: '📌' },
  { slug: '39', title: '论文写作工具合集：语法检查、降重润色、AI写作推荐', cat: '学习思考', date: '2022-12-19', icon: '🎏' },
  { slug: '38', title: '免费论文查重降重网站推荐：知网/维普替代方案', cat: '学习思考', date: '2022-12-19', icon: '🪄' },
  { slug: '25', title: 'Hammer PDF：北京理工 AI 学术文献智能阅读器', cat: '软件工具', date: '2022-12-08', icon: '🗂️' },
  { slug: '44', title: 'Windows系统问题排查与修复：电脑故障解决手册', cat: 'Windows', date: '2022-11-30', icon: '💻' },
  { slug: '42', title: '圣诞节祝福网页特效', cat: '碎片杂文', date: '2022-11-30', icon: '💫' },
  { slug: '19', title: 'Edge下载慢？开启多线程下载加速教程', cat: 'Windows', date: '2022-11-30', icon: '🪶' },
  { slug: '17', title: 'PDF处理工具推荐', cat: '软件工具', date: '2022-11-28', icon: '📕' },
  { slug: '14', title: 'Windows实用教程：常见问题解决与系统优化指南', cat: 'Windows', date: '2022-11-18', icon: '🤖' },
  { slug: '13', title: '脱发怎么办？从成因到改善：洗护、药物与生活方式科学指南', cat: '碎片杂文', date: '2022-11-11', icon: '🎨' },
  { slug: '12', title: '一键屏蔽流氓软件：Windows 防火墙/Hosts/DNS 组合屏蔽教程', cat: 'Windows', date: '2022-11-08', icon: '🌿' },
  { slug: '11', title: 'GitHub 上大学：国内外 Top 高校课程资源汇总', cat: '学习思考', date: '2022-10-08', icon: '💡' },
  { slug: '22', title: '《皮肤的秘密》读书笔记：关于皮肤的科普指南', cat: '碎片杂文', date: '2022-09-30', icon: '🍃' },
  { slug: '10', title: 'C盘清理详细教程：Windows系统一键瘦身', cat: 'Windows', date: '2022-09-16', icon: '🧹' },
  { slug: '9', title: '彻底卸载360和2345等流氓软件！', cat: 'Windows', date: '2022-09-10', icon: '🧋' },
  { slug: '23', title: '石墨文档一键导出工具', cat: '软件工具', date: '2022-09-10', icon: '🧰' },
  { slug: '5', title: '电脑蓝屏终极解决办法：Windows系统崩溃修复指南', cat: 'Windows', date: '2022-08-10', icon: '🖥️' },
  { slug: '4', title: '科学减脂指南：热量缺口计算与饮食策略', cat: '碎片杂文', date: '2022-07-20', icon: '🪄' },
  { slug: 'notion', title: 'Notion快捷键大全：从入门到构建高效工作流', cat: '技术教程', date: '2022-07-02', icon: '📋' },
  { slug: '1', title: 'AutoCAD快捷键大全：新手到高手必备的50+命令技巧', cat: '学习思考', date: '2022-05-23', icon: '💎' },
  { slug: '27', title: '简化生活的 75 个灵感：断舍离、时间管理与数字极简实践', cat: '碎片杂文', date: '2022-05-21', icon: '🌊' },
]

/** 分类与计数，直接取博客自己的 categoryOptions，不是我数出来的。 */
export const postCategories: { name: string; count: number }[] = [
  { name: '技术教程', count: 11 },
  { name: '学习思考', count: 8 },
  { name: '碎片杂文', count: 7 },
  { name: '软件工具', count: 7 },
  { name: 'Windows', count: 7 },
  { name: '避坑指南', count: 3 },
  { name: '人工智能', count: 3 },
  { name: '选购指南', count: 1 },
  { name: '生活妙招', count: 1 },
  { name: '福利指南', count: 1 },
  { name: '考研资料', count: 1 },
  { name: '软件激活', count: 1 },
  { name: '求职经验', count: 1 },
  { name: '极客省钱术', count: 1 },
  { name: '学术研究', count: 1 },
]

/** 按年份的产出分布，用于左栏条形。 */
export const postYears: { year: string; count: number }[] = [
  { year: '2026', count: 5 },
  { year: '2025', count: 4 },
  { year: '2024', count: 10 },
  { year: '2023', count: 14 },
  { year: '2022', count: 22 },
]

export const postCount = 55
export const yearMax = 22
