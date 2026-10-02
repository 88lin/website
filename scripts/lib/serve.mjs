// 本地静态服务器：默认使用正式域名的根路径；prefix 可用于子路径回归。
// GitHub Pages 默认对文本资源做 gzip/brotli，本地不压就会让 Lighthouse
// 报出一条并不存在的 "uses-text-compression"，把 FCP/LCP 也一起拖坏。
import { createServer } from 'node:http'
import { readFile, realpath, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import siteUrl from '../../src/content/site-url.json' with { type: 'json' }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.xml', '.txt'])

export async function serveDist({ dist, port, prefix = new URL(siteUrl.url).pathname }) {
  const root = await realpath(dist).catch((error) => {
    if (error.code === 'ENOENT') throw new Error(`serveDist: 发布目录不存在（${dist}），请先运行 npm run build。`, { cause: error })
    throw error
  })
  const insideRoot = (file) => {
    const relative = path.relative(root, file)
    return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
  }
  const notFound = async (res) => {
    const body = await realpath(path.join(root, '404.html'))
      .then((file) => insideRoot(file) ? readFile(file) : '404').catch(() => '404')
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(body)
  }
  const gzCache = new Map()
  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end()
    }
    const [rawPath, ...query] = (req.url || '/').split('?')
    const search = query.length ? '?' + query.join('?') : ''
    // 编码分隔符不能变成目录边界；客户端也将这类地址判为缺失页。
    if (/%(?:2f|5c)/i.test(rawPath)) return notFound(res)
    let rel
    try { rel = decodeURIComponent(rawPath) } catch {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('Bad Request')
    }
    // 拒绝 Windows 分隔符、NUL 与可形成站外重定向的双斜杠。
    if (!rel.startsWith('/') || rel.startsWith('//') || /[\\\0]/.test(rel)) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('Bad Request')
    }
    if (prefix !== '/' && rel === prefix.slice(0, -1)) {
      res.writeHead(301, { Location: prefix + search })
      return res.end()
    }
    if (!rel.startsWith(prefix)) {
      // 只有裸根路径才跳进子路径。别的（/robots.txt、/favicon.ico 之类）一律 404，
      // 跟 GitHub Pages 一致——之前一股脑 302 到首页，Lighthouse 会拿到一份 HTML
      // 当成 robots.txt 解析，然后报一条并不存在的 SEO 失败。
      if (rel === '/' || rel === '') {
        res.writeHead(302, { Location: prefix + search })
        return res.end()
      }
      res.writeHead(404, { 'content-type': 'text/plain' })
      return res.end('404')
    }
    rel = rel.slice(prefix.length)
    if (rel === '' || rel.endsWith('/')) rel += 'index.html'
    const file = path.resolve(root, rel)
    if (!insideRoot(file)) return notFound(res)
    try {
      // 同时校验真实路径，避免发布目录里的符号链接越过根目录。
      const resolved = await realpath(file)
      if (!insideRoot(resolved)) return notFound(res)
      const s = await stat(resolved)
      if (s.isDirectory()) {
        res.writeHead(301, { Location: rawPath + '/' + search })
        return res.end()
      }
      if (!s.isFile()) throw new Error('not a file')
      const ext = path.extname(file)
      const buf = await readFile(resolved)
      const headers = { 'content-type': MIME[ext] || 'application/octet-stream' }
      const accepted = String(req.headers['accept-encoding'] || '').split(',').map((entry) => {
        const [name, ...params] = entry.trim().toLowerCase().split(';')
        const quality = params.find((param) => param.trim().startsWith('q='))
        return { name, quality: quality ? Number(quality.trim().slice(2)) : 1 }
      })
      const wantsGzip = (accepted.find((entry) => entry.name === 'gzip') || accepted.find((entry) => entry.name === '*'))?.quality > 0
      if (COMPRESSIBLE.has(ext)) headers.vary = 'accept-encoding'
      if (wantsGzip && COMPRESSIBLE.has(ext)) {
        let gz = gzCache.get(file)
        if (!gz) {
          gz = gzipSync(buf, { level: 9 })
          gzCache.set(file, gz)
        }
        headers['content-encoding'] = 'gzip'
        headers['content-length'] = String(gz.length)
        headers.vary = 'accept-encoding'
        res.writeHead(200, headers)
        return res.end(gz)
      }
      headers['content-length'] = String(buf.length)
      res.writeHead(200, headers)
      res.end(buf)
    } catch {
      return notFound(res)
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, () => { server.off('error', reject); resolve() })
  })
  return { server, url: `http://127.0.0.1:${server.address().port}${prefix}` }
}
