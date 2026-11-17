#!/usr/bin/env node
/**
 * 校验 assets/ 里的素材是否齐全。
 *
 * 素材随仓库分发，但仍可能被替换成自有图，装之前跑一次：
 *   node scripts/check-assets.mjs
 * 有缺失时退出码 1，并逐项点名。
 */
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const here = fileURLToPath(new URL('..', import.meta.url))
const dir = join(here, 'assets')

/** 必需项；index.js 里的路由按这些文件名取值。 */
const REQUIRED = [
  ['boot.mp4', '冷启动开机影片'],
  ['poster.jpg', '影片封面'],
  ['backdrop.png', '新会话页背景'],
  ['chat-bg.jpg', '对话区默认背景'],
  ['icon-512.png', '应用图标（大）'],
  ['icon-64.png', '应用图标（小）'],
  ['app.ico', 'Windows 窗口图标'],
]

/** 可选：路由没用，但换图标时会顺手放进来。 */
const OPTIONAL = [
  ['icon-256.png', '应用图标（中）'],
  ['tray.ico', '托盘图标'],
]

let missing = 0
let total = 0

const rows = []
async function check([name, note], required) {
  const file = join(dir, name)
  try {
    const info = await stat(file)
    if (!info.isFile()) throw new Error('not a file')
    if (info.size === 0) throw new Error('empty')
    total += info.size
    rows.push(['OK', name, `${(info.size / 1024).toFixed(1)} KB`, note])
  }
  catch (error) {
    if (required) missing++
    rows.push([required ? 'MISSING' : 'absent', name, '-', `${note}（${error.message}）`])
  }
}

for (const entry of REQUIRED) await check(entry, true)
for (const entry of OPTIONAL) await check(entry, false)

const width = Math.max(...rows.map((r) => r[1].length))
for (const [status, name, size, note] of rows) {
  console.log(`${status.padEnd(8)} ${name.padEnd(width)}  ${size.padEnd(10)} ${note}`)
}

if (missing > 0) {
  console.log(`\n缺 ${missing} 个必需素材。按 assets/README.md 放进去，或用你自己的图，文件名不变。`)
  process.exit(1)
}
console.log(`\n素材齐全：${REQUIRED.length} 个必需项，共 ${(total / 1024 / 1024).toFixed(1)} MB。`)