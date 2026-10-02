import { test } from 'node:test'
import assert from 'node:assert/strict'
import { request } from 'node:http'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { serveDist } from './lib/serve.mjs'

const get = (base, pathname, options = {}) => new Promise((resolve, reject) => {
  const req = request({ hostname: '127.0.0.1', port: new URL(base).port, path: pathname, ...options }, (res) => {
    const chunks = []
    res.on('data', (chunk) => chunks.push(chunk)).on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }))
  })
  req.on('error', reject).end()
})

test('static preview confines paths, survives malformed URLs and preserves HTTP semantics', async (t) => {
  const temporary = await realpath(tmpdir())
  const fixture = await mkdtemp(path.join(temporary, 'website-serve-'))
  const dist = path.join(fixture, 'dist')
  const outside = path.join(fixture, 'outside')
  await mkdir(path.join(dist, 'case', 'repair'), { recursive: true })
  await mkdir(outside)
  await writeFile(path.join(outside, 'sentinel.txt'), 'PRIVATE TEST FIXTURE')
  await writeFile(path.join(dist, 'index.html'), '<h1>HOME</h1>')
  await writeFile(path.join(dist, '404.html'), '<h1>NOT FOUND</h1>')
  await writeFile(path.join(dist, 'case', 'repair', 'index.html'), '<h1>CASE</h1>')
  await symlink(outside, path.join(dist, 'escape'), process.platform === 'win32' ? 'junction' : 'dir')
  try {
    await t.test('missing build directory gives an actionable error', async () => {
      await assert.rejects(serveDist({ dist: path.join(fixture, 'missing'), port: 0 }), (error) => {
        assert.match(error.message, /先运行 npm run build/, '缺少发布目录时须给出构建提示')
        assert.equal(error.cause?.code, 'ENOENT', '包装错误须保留原始文件系统错误')
        return true
      })
    })
    for (const prefix of ['/', '/website/']) {
      const { server, url } = await serveDist({ dist, port: 0, prefix })
      try {
        await t.test(`${prefix} encoded separators never serve a different route`, async () => {
          for (const payload of ['case%2Frepair/', 'case%2frepair/', 'case%5Crepair/']) {
            const response = await get(url, prefix + payload)
            assert.equal(response.status, 404)
            assert.equal(response.body.toString(), '<h1>NOT FOUND</h1>')
          }
        })
        await t.test(`${prefix} rejects directory traversal and symlink escape`, async () => {
          for (const payload of ['..%2Foutside/sentinel.txt', '%2e%2e%5Coutside%5Csentinel.txt', 'escape/sentinel.txt']) {
            const response = await get(url, prefix + payload)
            assert.ok(response.status >= 400, `${payload}: ${response.status}`)
            assert.ok(!response.body.includes('PRIVATE TEST FIXTURE'))
          }
        })
        await t.test(`${prefix} malformed URLs do not stop the server`, async () => {
          for (const payload of ['%', '%E0%A4%A', '%00']) assert.equal((await get(url, prefix + payload)).status, 400)
          assert.equal((await get(url, prefix)).status, 200)
        })
        await t.test(`${prefix} redirects preserve all query parameters`, async () => {
          const response = await get(url, prefix + 'case/repair?utm_source=test&next=a?b')
          assert.equal(response.status, 301)
          assert.equal(response.headers.location, prefix + 'case/repair/?utm_source=test&next=a?b')
          if (prefix !== '/') {
            const bare = await get(url, prefix.slice(0, -1) + '?from=test')
            assert.equal(bare.status, 301)
            assert.equal(bare.headers.location, prefix + '?from=test')
          }
        })
        await t.test(`${prefix} HEAD, gzip negotiation and 404`, async () => {
          const head = await get(url, prefix, { method: 'HEAD' })
          assert.equal(head.status, 200)
          assert.equal(head.body.length, 0)
          const plain = await get(url, prefix, { headers: { 'accept-encoding': 'gzip;q=0, *;q=1' } })
          assert.equal(plain.headers['content-encoding'], undefined)
          assert.equal(plain.headers.vary, 'accept-encoding')
          const zipped = await get(url, prefix, { headers: { 'accept-encoding': 'gzip' } })
          assert.equal(zipped.headers['content-encoding'], 'gzip')
          assert.equal(gunzipSync(zipped.body).toString(), '<h1>HOME</h1>')
          assert.equal((await get(url, prefix + 'missing/')).status, 404)
          for (const payload of ['', 'case%2Frepair/', 'case%5Crepair/', '%']) {
            const post = await get(url, prefix + payload, { method: 'POST' })
            assert.equal(post.status, 405, `POST ${prefix}${payload} 必须优先拒绝方法`)
            assert.equal(post.headers.allow, 'GET, HEAD')
          }
        })
      } finally { await new Promise((resolve) => server.close(resolve)) }
    }
  } finally {
    // 临时测试目录必须保持在系统临时目录内；rm 删除链接本身，不递归跟随它。
    assert.equal(path.dirname(fixture), temporary)
    assert.ok(path.basename(fixture).startsWith('website-serve-'))
    await rm(fixture, { recursive: true, force: true })
  }
})
