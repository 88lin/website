/**
 * 把几个方向分支各自构建一遍，产物拷进 .shots/preview/<分支短名>/，
 * 供 npm run preview:all 一次对照。
 *
 * 跑法：npm run preview:build
 *
 * 为什么是「构建后拷贝」而不是四个 dev server / 四个 git worktree：
 *  · 产物用 base: './'，同一份 dist 挂在任何子路径下都成立，一个静态服务器就够
 *  · worktree 要各装一份 node_modules，几百 MB，只为看四张首屏不值
 *  · 顺带真验了一遍子路径部署（GitHub Pages 就是子路径）
 *
 * 它会切分支。跑之前先把手上的改动提交掉 —— 有未提交改动时直接退出，不硬切。
 */

import { execFileSync } from 'node:child_process'
import { cp, mkdir, rm, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = path.join(ROOT, '.shots/preview')

/** 要对照的分支。短名同时是 URL 里的那一段。 */
const BRANCHES = [
  ['v18', 'v18-modern'],
  ['v13', 'v13-dualread'],
  ['v15', 'v15-ridge'],
  ['v16', 'v16-spread'],
  ['v17', 'v17-blueprint'],
]

const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim()

/* 有未提交改动就停手：这个脚本会来回切分支，硬切会把改动带得到处都是 */
const dirty = git('status', '--porcelain')
if (dirty) {
  console.error('preview:build 会切分支，但工作区还有未提交的改动：\n')
  console.error(dirty)
  console.error('\n先提交或 stash 再跑。')
  process.exit(1)
}

const back = git('rev-parse', '--abbrev-ref', 'HEAD')
const existing = new Set(git('branch', '--format=%(refname:short)').split('\n'))

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

let built = 0
try {
  for (const [short, branch] of BRANCHES) {
    if (!existing.has(branch)) {
      console.log(`跳过 ${short}：没有分支 ${branch}`)
      continue
    }
    git('checkout', '-q', branch)
    console.log(`构建 ${short}（${branch}）…`)
    execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' })
    await cp(path.join(ROOT, 'dist'), path.join(OUT, short), { recursive: true })
    built++
  }
} finally {
  git('checkout', '-q', back)
}

/* 字体样张那一页是手写的静态页，不属于任何分支，单独留着 */
const specimen = path.join(ROOT, '.shots/type-specimen')
try {
  await readdir(specimen)
  await cp(specimen, path.join(OUT, 'type'), { recursive: true })
  console.log('带上 type 字体样张')
} catch {
  /* 没有就没有，索引页里那一条会 404，不影响其它 */
}

console.log(`\n${built} 个分支已构建到 .shots/preview/，回到了 ${back}。`)
console.log('接着跑：npm run preview:all')
