import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { collectGithub, parseBlog, refreshData, request, shanghaiDate } from './refresh-data.mjs'

const repo = (name, fork = false, stars = 2) => ({ name, fork, private: false, owner: { login: '88lin' }, stargazers_count: stars, forks_count: 1 })
const user = (public_repos) => ({ login: '88lin', public_repos, followers: 191, following: 7 })
const props = () => ({ postCount: 1, tagOptions: [{ name: '工具', count: 1 }], latestPosts: [{ title: '更新 & 测试', href: '/article/test', lastEditedDay: '2026-9-30', publishDay: '2021-1-1' }] })
const html = (p = props()) => `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: p } })}</script>`

test('paginates beyond 100 repositories; aggregate excludes forks, individual stats retain zero', async () => {
  const pages = [Array.from({ length: 100 }, (_, i) => repo(`repo-${i}`)), [repo('forked', true, 1000), repo('zero', false, 0)]]
  const calls = []
  const stats = await collectGithub(async (path) => { calls.push(path); return path.includes('?') ? pages[Number(new URL(`https://api.github.com${path}`).searchParams.get('page')) - 1] : user(102) }, ['zero'])
  assert.equal(stats.stars, 200)
  assert.equal(stats.forks, 101)
  assert.equal(stats.originals, 101)
  assert.equal(stats.forkedRepos, 1)
  assert.equal(stats.repositories.zero.stars, 0)
  assert.equal(stats.repositories.forked.stars, 1000)
  assert.equal(calls.length, 3)
})

test('incomplete, duplicate, missing featured repositories and invalid counters fail', async () => {
  for (const [account, repos, required] of [[user(2), [repo('a')], []], [user(2), [repo('a'), repo('a')], []], [user(1), [repo('a')], ['missing']], [user(1), [repo('a', false, null)], []]]) {
    await assert.rejects(collectGithub(async (path) => path.includes('?') ? repos : account, required))
  }
})

test('blog uses edited date and permanent URLs, validates payload and unsafe links', () => {
  const blog = parseBlog(html())
  assert.deepEqual(blog.latest[0], { title: '更新 & 测试', date: '2026-09-30', href: 'https://blog.88lin.eu.org/article/test' })
  assert.equal(blog.tagTotal, 1)
  assert.throws(() => parseBlog('<html>Maintenance</html>'))
  const invalid = props(); invalid.latestPosts[0].href = 'https://example.com/article/test'
  assert.throws(() => parseBlog(html(invalid)))
  const duplicate = props(); duplicate.tagOptions.push(duplicate.tagOptions[0])
  assert.throws(() => parseBlog(html(duplicate)))
  const incomplete = props(); incomplete.postCount = 6
  assert.throws(() => parseBlog(html(incomplete)))
})

test('Shanghai date changes at UTC 16:00', () => {
  assert.equal(shanghaiDate(new Date('2026-09-30T15:59:59Z')), '2026-09-30')
  assert.equal(shanghaiDate(new Date('2026-09-30T16:00:00Z')), '2026-10-01')
})

test('token is sent only to GitHub; 403 is a hard failure', async () => {
  const calls = []
  const fetcher = async (url, options) => { calls.push({ url, ...options }); return new Response('{}') }
  await request('https://api.github.com/users/88lin', { token: 'test-token', fetcher })
  await request('https://blog.88lin.eu.org', { token: 'test-token', fetcher })
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token')
  assert.equal(calls[1].headers.Authorization, undefined)
  let attempts = 0
  await assert.rejects(request('https://api.github.com/users/88lin', { fetcher: async () => { attempts++; return new Response('', { status: 403 }) } }), /403/)
  assert.equal(attempts, 1)
})

test('failed refresh leaves the previous snapshot byte-for-byte intact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'website-data-test-'))
  const output = pathToFileURL(join(dir, 'activity.json'))
  try {
    await writeFile(output, 'previous snapshot\n')
    await assert.rejects(refreshData({ output, getText: async () => { throw new Error('API unavailable') } }), /API unavailable/)
    assert.equal(await readFile(output, 'utf8'), 'previous snapshot\n')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('refresh commits both sources together; a later blog failure cannot replace it', async () => {
  const baseline = JSON.parse(await readFile(new URL('../src/content/generated/activity.json', import.meta.url), 'utf8'))
  const repos = Object.keys(baseline.github.repositories).map((name) => repo(name))
  const getText = async (url) => {
    if (url === 'https://blog.88lin.eu.org') return html()
    if (!url.includes('?')) return JSON.stringify(user(repos.length))
    const page = Number(new URL(url).searchParams.get('page'))
    return JSON.stringify(repos.slice((page - 1) * 100, page * 100))
  }
  const dir = await mkdtemp(join(tmpdir(), 'website-refresh-test-'))
  const output = pathToFileURL(join(dir, 'activity.json'))
  try {
    const now = new Date('2026-09-30T16:00:00Z')
    const snapshot = await refreshData({ output, getText, now })
    assert.equal(snapshot.asOf, '2026-10-01')
    assert.equal(snapshot.github.stars, repos.length * 2)
    assert.equal(snapshot.blog.posts, 1)
    const saved = await readFile(output, 'utf8')
    assert.deepEqual(JSON.parse(saved), snapshot)
    await refreshData({ output, getText, now })
    assert.equal(await readFile(output, 'utf8'), saved)
    await assert.rejects(refreshData({ output, now, getText: async (url) => url === 'https://blog.88lin.eu.org' ? '<html>maintenance</html>' : getText(url) }), /__NEXT_DATA__/)
    assert.equal(await readFile(output, 'utf8'), saved)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
