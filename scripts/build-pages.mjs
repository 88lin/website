/** 从现有快照构建发现文件 → 采字与重建字体 → 再构建 → OG / 404 → 数据验收。 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { serveDist } from './lib/serve.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed: ${code}`)))
})
const build = () => process.platform === 'win32'
  ? run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run build'])
  : run('npm', ['run', 'build'])

await build()
const { server, url } = await serveDist({ dist: fileURLToPath(new URL('../dist/', import.meta.url)), port: 0 })
try {
  await run(process.execPath, ['scripts/fonts.mjs', `--base=${url.replace(/\/$/, '')}`])
} finally {
  await new Promise((resolve) => server.close(resolve))
}
await build()
await run(process.execPath, ['scripts/static.mjs'])
await run(process.execPath, ['scripts/verify.mjs', '--data-only'])
