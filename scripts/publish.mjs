/*
 * 发布到 npm，并顺手把市场索引更新到新版本。
 *
 * 用法：
 *   node scripts/publish.mjs --dry-run          # 只打包 + 自检，不联网、不需要 token
 *   NPM_TOKEN=xxxx node scripts/publish.mjs     # 真正发布
 *
 * token 只经一个临时 npmrc 传给子进程（0644 → 立刻删除），不进命令行参数、不落进仓库。
 * 发布成功后把本版本的发布时间写进 market/publish-times.json 并重建 market/market-index.json。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const TIMES_PATH = path.join(REPO, 'market', 'publish-times.json')
const REGISTRY = 'https://registry.npmjs.org/'
const dryRun = process.argv.includes('--dry-run')

const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'))
const run = (cmd, args, extraEnv = {}) => {
  const result = spawnSync(cmd, args, {
    cwd: REPO,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  })
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} 退出码 ${result.status}`)
}

// 1. 自检：语法 + 素材 + 索引可重新生成
run('node', ['--check', 'index.js'])
run('node', ['--check', 'client.js'])
run('node', ['--check', 'scripts/market-index.mjs'])
run('node', ['scripts/check-assets.mjs'])

if (dryRun) {
  /*
   * npm publish --dry-run 在没有登录态时也会退出码 1（"requires you to be logged in"），
   * 所以 dry-run 走 npm pack --dry-run：它能给出真实的文件清单与体积，且不需要凭证。
   */
  console.log(`\n[dry-run] 将发布 ${pkg.name}@${pkg.version} 到 ${REGISTRY}`)
  run('npm', ['pack', '--dry-run'])
  process.exit(0)
}

const token = process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN ?? ''
if (token.trim() === '') {
  console.error('缺 NPM_TOKEN：Automation token 只能经环境变量传入。')
  process.exit(2)
}

// 2. 一次性 npmrc：只给这次 publish 用，退出即删
const npmrc = path.join(os.tmpdir(), `dsh-hdd-publish-${process.pid}-${Date.now()}.npmrc`)
fs.writeFileSync(npmrc, `registry=${REGISTRY}\n//registry.npmjs.org/:_authToken=${token.trim()}\n`, { mode: 0o600 })
try {
  run('npm', ['publish', '--access', 'public', `--registry=${REGISTRY}`, `--userconfig=${npmrc}`])
}
finally {
  fs.rmSync(npmrc, { force: true })
  console.log('临时 npmrc 已删除')
}

// 3. 记时间戳 + 重建索引
const times = fs.existsSync(TIMES_PATH) ? JSON.parse(fs.readFileSync(TIMES_PATH, 'utf8')) : {}
times[pkg.version] = Math.floor(Date.now() / 1000)
fs.writeFileSync(TIMES_PATH, JSON.stringify(times, null, 2) + '\n', 'utf8')
run('node', ['scripts/market-index.mjs'])

console.log(`
已发布 ${pkg.name}@${pkg.version}。
下一步：
  1) git add market/ && git commit -m "market: 记录 ${pkg.version} 发布时间"
  2) 客户端里装 npm 版：plugin_manager action=install_bundle target=${pkg.name}@${pkg.version}
     （先 remove_bundle 掉现在的 link: 安装，link 与 registry 是两种来源，不能原地升级）
  3) 「设置 → 插件」里就会出现版本区块与「更新」按钮。
`)
