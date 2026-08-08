// 本地静态服务器：故意挂在 /website/ 子路径下，并且开启 gzip。
// GitHub Pages 默认对文本资源做 gzip/brotli，本地不压就会让 Lighthouse
// 报出一条并不存在的 "uses-text-compression"，把 FCP/LCP 也一起拖坏。
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

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

export async function serveDist({ dist, port, prefix = '/website/' }) {
  const gzCache = new Map()
  const server = createServer(async (req, res) => {
    let rel = decodeURIComponent((req.url || '/').split('?')[0])
    if (!rel.startsWith(prefix)) {
      res.writeHead(302, { Location: prefix })
      return res.end()
    }
    rel = rel.slice(prefix.length)
    if (rel === '' || rel.endsWith('/')) rel += 'index.html'
    const file = path.join(dist, rel)
    try {
      const s = await stat(file)
      if (!s.isFile()) throw new Error('dir')
      const ext = path.extname(file)
      const buf = await readFile(file)
      const headers = { 'content-type': MIME[ext] || 'application/octet-stream' }
      const wantsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))
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
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end('404')
    }
  })
  await new Promise((r) => server.listen(port, r))
  return { server, url: `http://127.0.0.1:${port}${prefix}` }
}
