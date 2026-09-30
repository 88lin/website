/*
  本地预览：npm run serve（要先 npm run build）

  用 lib/serve.mjs 而不是 vite preview —— 它把产物挂在 /website/ 子路径下并开
  gzip，跟 GitHub Pages 的行为一致，所以看到的是真正要发出去的那份东西。
  子路径这件事踩过坑（base 写死绝对路径会 404），预览时就该按线上形态看。

  监听 0.0.0.0，同时打印局域网地址：视觉问题基本都得在真机上看，
  模拟器的字体渲染和触摸手感都不作数。
*/

import os from 'node:os'
import path from 'node:path'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { serveDist } from './lib/serve.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 4178)

try {
  await stat(path.join(DIST, 'index.html'))
} catch {
  console.error('preview: 没有 dist/index.html，先跑 npm run build')
  process.exit(1)
}

const { server, url } = await serveDist({ dist: DIST, port: PORT })

/** 局域网地址，给手机用。回环和内部接口不算。 */
const lan = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => i.address)
  // 169.254.x 是没拿到 DHCP 的自配地址，给了也连不上
  .filter((a) => !a.startsWith('169.254.'))

const prefix = new URL(url).pathname
console.log('\n  本机    ' + url)
for (const a of lan) console.log(`  手机    http://${a}:${PORT}${prefix}`)
console.log('\n  案例子页 ' + url + 'case/repair/')
console.log('\n  Ctrl+C 停止\n')

const bye = () => {
  server.close()
  process.exit(0)
}
process.on('SIGINT', bye)
process.on('SIGTERM', bye)
