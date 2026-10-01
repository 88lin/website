/** Actions / 本地共用：完整采集并校验后才替换快照，失败不覆盖旧数据。 */
import { readFile, writeFile, rename, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = new URL('../', import.meta.url)
const OWNER = '88lin'
const BLOG = 'https://blog.88lin.eu.org'

const count = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${label}`)
  return value
}
const nonempty = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid ${label}`)
  return value
}

export function shanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export async function request(url, { token, fetcher = fetch } = {}) {
  const headers = { 'User-Agent': '88lin-website-refresh' }
  if (new URL(url).hostname === 'api.github.com') {
    headers.Accept = 'application/vnd.github+json'
    headers['X-GitHub-Api-Version'] = '2022-11-28'
    if (token) headers.Authorization = `Bearer ${token}`
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, { headers, signal: AbortSignal.timeout(30_000) })
      if (!response.ok) {
        const error = new Error(`${new URL(url).hostname}: HTTP ${response.status}`)
        error.retry = response.status >= 500 || response.status === 429
        throw error
      }
      return await response.text()
    } catch (error) {
      if (attempt === 2 || error.retry === false) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}

export async function collectGithub(getJson, requiredRepos) {
  const user = await getJson(`/users/${OWNER}`)
  if (user.login?.toLowerCase() !== OWNER) throw new Error('Unexpected GitHub account')
  const publicRepos = count(user.public_repos, 'public_repos')
  const repos = []
  for (let page = 1; ; page++) {
    const batch = await getJson(`/users/${OWNER}/repos?type=owner&per_page=100&sort=full_name&page=${page}`)
    if (!Array.isArray(batch)) throw new Error('Unexpected repository payload')
    repos.push(...batch)
    if (batch.length < 100) break
    if (page >= 100) throw new Error('GitHub pagination did not finish')
  }
  const repositories = {}
  let stars = 0, forks = 0, originals = 0
  for (const repo of repos) {
    const name = nonempty(repo.name, 'repository name').toLowerCase()
    if (repo.owner?.login?.toLowerCase() !== OWNER || repo.private !== false || typeof repo.fork !== 'boolean') {
      throw new Error(`Unexpected repository: ${name}`)
    }
    if (Object.hasOwn(repositories, name)) throw new Error(`Duplicate repository: ${name}`)
    const stats = { stars: count(repo.stargazers_count, `${name} stars`), forks: count(repo.forks_count, `${name} forks`) }
    repositories[name] = stats
    if (!repo.fork) {
      originals++
      stars += stats.stars
      forks += stats.forks
    }
  }
  if (repos.length !== publicRepos) throw new Error(`Incomplete GitHub snapshot: ${repos.length}/${publicRepos}; retry later`)
  for (const name of requiredRepos) {
    if (!Object.hasOwn(repositories, name.toLowerCase())) throw new Error(`Missing featured repository: ${name}`)
  }
  return {
    stars, forks, originals, publicRepos, forkedRepos: publicRepos - originals,
    followers: count(user.followers, 'followers'), following: count(user.following, 'following'),
    repositories: Object.fromEntries(Object.entries(repositories).sort(([a], [b]) => a.localeCompare(b, 'en'))),
  }
}

export function parseBlog(html) {
  const match = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error('Blog: __NEXT_DATA__ missing')
  const props = JSON.parse(match[1]).props?.pageProps
  if (!Array.isArray(props?.tagOptions) || !Array.isArray(props?.latestPosts)) throw new Error('Blog: unexpected pageProps')
  const posts = count(props.postCount, 'blog postCount')
  const tags = props.tagOptions.map((tag) => ({ name: nonempty(tag.name, 'tag name'), count: count(tag.count, 'tag count') }))
  if (new Set(tags.map((tag) => tag.name)).size !== tags.length) throw new Error('Blog: duplicate tags')
  const latest = props.latestPosts.slice(0, 6).map((post) => {
    const href = new URL(nonempty(post.href || post.slug, 'post URL'), `${BLOG}/`)
    if (href.origin !== BLOG || !href.pathname.startsWith('/article/')) throw new Error('Blog: unexpected article URL')
    // latestPosts 按最近编辑排序；日期也用 lastEditedDay，不能冒充发布日期。
    const day = nonempty(post.lastEditedDay, 'lastEditedDay').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (!day) throw new Error('Blog: invalid article date')
    const date = `${day[1]}-${day[2].padStart(2, '0')}-${day[3].padStart(2, '0')}`
    if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Blog: invalid calendar date')
    return { title: nonempty(post.title, 'post title'), date, href: href.href }
  })
  if (latest.length !== Math.min(posts, 6) || new Set(latest.map((post) => post.href)).size !== latest.length) {
    throw new Error('Blog: incomplete or duplicate recent articles')
  }
  if (posts > 0 && !tags.length) throw new Error('Blog: empty tags')
  return { posts, tagTotal: tags.length, tags: tags.slice(0, 13), latest }
}

export async function refreshData({ output = new URL('src/content/generated/activity.json', ROOT), getText = request, token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN, now = new Date() } = {}) {
  const sources = await Promise.all(['site.ts', 'cases.ts'].map((file) => readFile(new URL(`src/content/${file}`, ROOT), 'utf8')))
  const required = [...new Set(Array.from(sources.join('\n').matchAll(/https:\/\/github\.com\/88lin\/([\w.-]+)/g), (m) => m[1]))]
  const github = await collectGithub(async (path) => JSON.parse(await getText(`https://api.github.com${path}`, { token })), required)
  const blog = parseBlog(await getText(BLOG))
  const snapshot = { asOf: shanghaiDate(now), github, blog }
  const content = JSON.stringify(snapshot, null, 2) + '\n'
  let previous
  try { previous = await readFile(output, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (content === previous) {
    console.log(`Data already current (${snapshot.asOf})`)
    return snapshot
  }
  const temp = `${fileURLToPath(output)}.tmp`
  try {
    await writeFile(temp, content)
    await rename(temp, output)
  } finally {
    await rm(temp, { force: true })
  }
  console.log(`Refreshed ${snapshot.asOf}: ${github.stars} stars, ${github.forks} forks, ${github.originals} original repos, ${github.followers} followers; ${blog.posts} posts, ${blog.tagTotal} tags`)
  return snapshot
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  refreshData().catch((error) => { console.error(`refresh-data: ${error.message}`); process.exitCode = 1 })
}
