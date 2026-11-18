/*
 * 生成插件市场索引（format 1）。
 *
 * DSH 的「发现」页（@deepseek-ai/dsh-experimental-plugin-market-bundle）读的是一份
 * JSON：标题、展示字段、以及每个版本从哪装。dsh-hdd 自己就对外提供这份文件
 * （/hdd/v1/market-index.json），所以索引永远跟着插件版本走，不需要第三方托管。
 *
 * 用法：
 *   node scripts/market-index.mjs              # 用 market/publish-times.json 里的时间戳
 *   node scripts/market-index.mjs --now        # 缺失的时间戳用当前时间（发布会用）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const TIMES_PATH = path.join(REPO, 'market', 'publish-times.json')
const OUT_PATH = path.join(REPO, 'market', 'market-index.json')

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const pkg = readJson(path.join(REPO, 'package.json'))
const times = fs.existsSync(TIMES_PATH) ? readJson(TIMES_PATH) : {}
const useNow = process.argv.includes('--now')

/** 版本按 SemVer 降序：索引里最新的排前面，读的人一眼看到当前版本。 */
const compare = (a, b) => {
  const parse = (v) => v.split(/[.+-]/).map((part) => Number.parseInt(part, 10)).filter((n) => Number.isFinite(n))
  const left = parse(a)
  const right = parse(b)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0)
    if (diff !== 0) return diff
  }
  return b.localeCompare(a)
}

const known = new Set([pkg.version, ...Object.keys(times)])
const stamps = {}
for (const version of known) {
  if (typeof times[version] === 'number') stamps[version] = times[version]
  else if (useNow) stamps[version] = Math.floor(Date.now() / 1000)
  else throw new Error(`market/publish-times.json 缺 ${version} 的时间戳（或用 --now）`)
}

const iconPath = path.join(REPO, 'assets', 'icon-64.png')
const icon = 'data:image/png;base64,' + fs.readFileSync(iconPath).toString('base64')
if (Buffer.from(icon.split(',')[1], 'base64').length > 32 * 1024) {
  throw new Error('内联图标超过 32 KiB 上限')
}

const versions = [...known]
  .sort(compare)
  .map((version) => ({
    version,
    publishTimestamp: stamps[version],
    /* 发布到 npm 的包：pnpm 直接用 name@version 装，市场也靠这个判断能否更新。 */
    source: { type: 'npm' },
    engines: { dsh: '>=0.2.0-0' },
  }))

const index = {
  format: 1,
  title: {
    en: 'H.D.D. — Fairy console skin for DeepSeek',
    zh: 'H.D.D. —— DeepSeek 的 Fairy 界面',
  },
  description: {
    en: 'Boot film, holographic cores, a full-height conversation backdrop, a glass input capsule and AGENT.md persona editing — all in one HDD panel.',
    zh: '开机影片、全息核心、铺满到底的对话区背景、玻璃输入胶囊，加上 AGENT.md 人格编辑，全在一个 HDD 面板里。',
  },
  metadata: {
    categories: {
      appearance: { title: { en: 'Appearance', zh: '外观' } },
    },
    labels: {
      skin: { title: { en: 'Skin', zh: '皮肤' } },
      persona: { title: { en: 'Persona', zh: '人格' } },
    },
  },
  plugins: [
    {
      name: pkg.name,
      title: { en: 'H.D.D.', zh: 'H.D.D. 界面' },
      description: {
        en: 'Fairy console skin: boot film, three holographic cores, conversation backdrop, glass input capsule, persona editor.',
        zh: 'Fairy 控制台界面：开机影片、三颗全息核心、对话区背景、玻璃输入胶囊、人格编辑器。',
      },
      icon,
      author: typeof pkg.author === 'string' ? pkg.author : 'YuQi',
      homepage: 'https://github.com/qitinyu/HDD',
      repository: { url: 'https://github.com/qitinyu/HDD' },
      metadata: {
        category: 'appearance',
        keywords: ['skin', 'theme', 'fairy', 'zzz', 'hdd', 'backdrop', 'persona'],
        labels: ['skin', 'persona'],
      },
      versions,
    },
  ],
}

fs.writeFileSync(OUT_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log(`market/market-index.json ← ${pkg.name}@${pkg.version}（${versions.length} 个版本）`)
