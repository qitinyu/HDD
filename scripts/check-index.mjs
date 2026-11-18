/*
 * 用「本机装的 DSH 里的真校验器」验证 market/market-index.json。
 *
 * 为什么要这一支：市场索引的字段约束只有校验器说得准（README 只讲行为），而 schema
 * 陷阱不会自己报错——比如 engines.dsh 写成 ">=0.2.0"，semver 默认语义下
 * 0.2.2-rc.3 反而不满足，市场会显示「需要更新 DSH」，可 install 又照样能过。
 * 那种错只能靠把真校验器跑一遍才看得见。
 *
 * 校验器和它依赖的 semver 都直接从 app.asar 里读，不需要 npm install。
 *
 * 用法：
 *   node scripts/check-index.mjs                     # 自动找 app.asar
 *   node scripts/check-index.mjs "D:/path/app.asar"  # 指定安装包
 *   DSH_ASAR=... node scripts/check-index.mjs
 * 找不到安装包时打印一行说明并以 0 退出（不是本机就没有，别把 CI 弄红）。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const INDEX_PATH = path.join(REPO, 'market', 'market-index.json')

const CANDIDATES = [
  'D:/AI/DSHS/resources/app.asar',
  process.env.LOCALAPPDATA === undefined ? null : path.join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek', 'resources', 'app.asar'),
  '/Applications/DeepSeek.app/Contents/Resources/app.asar',
]

const asar = process.argv[2] ?? process.env.DSH_ASAR ?? CANDIDATES.find((p) => p !== null && fs.existsSync(p))
if (asar === undefined || asar === null || !fs.existsSync(asar)) {
  console.log('skip: 找不到 app.asar（用 `node scripts/check-index.mjs <app.asar>` 指定）')
  process.exit(0)
}

if (!fs.existsSync(INDEX_PATH)) {
  throw new Error(`缺 ${INDEX_PATH}，先跑 node scripts/market-index.mjs`)
}

const buf = fs.readFileSync(asar)
const headerSize = buf.readUInt32LE(4)
const jsonSize = buf.readUInt32LE(12)
const header = JSON.parse(buf.subarray(16, 16 + jsonSize).toString('utf8'))
const base = 8 + headerSize

/** 把头部树摊平成 [路径, 条目] 列表。 */
function flatten(node, prefix = '') {
  const rows = []
  for (const [name, value] of Object.entries(node.files ?? {})) {
    const full = prefix === '' ? name : `${prefix}/${name}`
    if (value.files !== undefined) rows.push(...flatten(value, full))
    else rows.push([full, value])
  }
  return rows
}

const rows = flatten(header)
const validatorRow = rows.find(([full]) => full.endsWith('dsh-plugin-market-index/lib/index.js'))
if (validatorRow === undefined) throw new Error('app.asar 里没有 dsh-plugin-market-index/lib/index.js')
const semverRows = rows.filter(([full]) => full.endsWith('/semver/package.json') || full.includes('/node_modules/semver/'))

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hdd-index-check-'))
try {
  const read = ([, entry]) => buf.subarray(base + Number(entry.offset), base + Number(entry.offset) + Number(entry.size))
  const validatorPath = path.join(work, 'validator.mjs')
  fs.writeFileSync(validatorPath, read(validatorRow))

  /* 校验器 import 了 semver，把它原样摊到 node_modules 下让 ESM 自己解析。 */
  let extracted = 0
  for (const [full, entry] of semverRows) {
    const idx = full.indexOf('node_modules/semver/')
    if (idx === -1) continue
    const target = path.join(work, 'node_modules', 'semver', full.slice(idx + 'node_modules/semver/'.length))
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, read([full, entry]))
    extracted += 1
  }
  if (extracted === 0) throw new Error('app.asar 里没找到 semver，无法加载校验器')

  const { parseMarketIndex, marketInstallTarget, MAX_INLINE_ICON_BYTES } = await import(pathToFileURL(validatorPath).href)
  const raw = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'))
  const indexUrl = 'http://127.0.0.1:44112/hdd/v1/market-index.json'
  const parsed = parseMarketIndex(raw, indexUrl)

  console.log(`OK: ${path.relative(REPO, INDEX_PATH)} 通过 format 1 校验（app.asar ${(buf.length / 1048576).toFixed(0)} MB，内联图标上限 ${MAX_INLINE_ICON_BYTES} B）`)
  for (const plugin of parsed.plugins) {
    console.log(`plugin ${plugin.name} — ${plugin.versions.length} 个版本`)
    for (const version of plugin.versions) {
      const target = marketInstallTarget(plugin.name, version)
      console.log(`  ${version.version}  engines ${JSON.stringify(version.engines ?? {})}  →  ${JSON.stringify(target)}`)
    }
  }
}
finally {
  fs.rmSync(work, { recursive: true, force: true })
}
