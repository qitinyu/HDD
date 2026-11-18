/**
 * HDD —— 宿主半身。
 *
 * 三件事：
 *   1. 服务皮肤资产（开机影片、背景图、图标），路径 /hdd/v1/*；
 *   2. 把用户指定的图片读成同源地址：本地文件或远程 URL 中转；
 *   3. 读写全局人格文件 ~/.dsh/AGENT.md（写前留一份 .bak-hdd）。
 *
 * 除人格写入外全部只读、无状态；界面配置存在浏览器 localStorage（见 client.js）。
 */
import { createReadStream, readFileSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const inject = ['webServer', 'systemPrompt']

const PREFIX = '/hdd'
const PROBE_DIR = fileURLToPath(new URL('./.probe', import.meta.url))
const MARKET_INDEX_FILE = fileURLToPath(new URL('./market/market-index.json', import.meta.url))
const CLIENT_FILE = fileURLToPath(new URL('./client.js', import.meta.url))
const MAX_BYTES = 12 * 1024 * 1024
const MAX_PERSONA_BYTES = 512 * 1024
const FETCH_TIMEOUT_MS = 15000

const asset = (name, type) => ({
  file: fileURLToPath(new URL(`./assets/${name}`, import.meta.url)),
  type,
})

/** 皮肤资产：路径与原 dsh-fairy-splash 一一对应。 */
const ASSETS = new Map([
  [`${PREFIX}/v1/boot.mp4`, asset('boot.mp4', 'video/mp4')],
  [`${PREFIX}/v1/backdrop.png`, asset('backdrop.png', 'image/png')],
  [`${PREFIX}/v1/poster.jpg`, asset('poster.jpg', 'image/jpeg')],
  [`${PREFIX}/v1/icon.png`, asset('icon-512.png', 'image/png')],
  [`${PREFIX}/v1/icon-64.png`, asset('icon-64.png', 'image/png')],
  [`${PREFIX}/v1/app.ico`, asset('app.ico', 'image/x-icon')],
  [`${PREFIX}/v1/chat-bg.jpg`, asset('chat-bg.jpg', 'image/jpeg')],
])

const TYPES = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.avif', 'image/avif'],
  ['.bmp', 'image/bmp'],
])

const personaPath = () => join(homedir(), '.dsh', 'AGENT.md')
const personaBackupPath = () => `${personaPath()}.bak-hdd`

function plain(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(message)
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(body)),
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function imageHeaders(type, length) {
  return {
    'Content-Type': type,
    'Content-Length': String(length),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  }
}

async function serveAsset(req, res, entry) {
  let info
  try {
    info = await stat(entry.file)
  }
  catch {
    return plain(res, 404, 'asset missing')
  }
  if (!info.isFile()) return plain(res, 404, 'asset missing')

  res.writeHead(200, {
    'Content-Type': entry.type,
    'Content-Length': String(info.size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  })
  if (req.method === 'HEAD') return res.end()
  const stream = createReadStream(entry.file)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

/** GET /hdd/v1/file?p=<绝对路径> */
async function serveLocal(req, res, query) {
  const raw = (query.get('p') ?? '').trim()
  if (raw === '') return plain(res, 400, 'missing path')
  const path = raw.replace(/^file:\/{2,3}/i, '').replace(/\//g, '\\')
  if (!isAbsolute(path)) return plain(res, 400, 'path must be absolute')

  const type = TYPES.get(extname(path).toLowerCase())
  if (type === undefined) return plain(res, 415, 'unsupported image extension')

  let info
  try {
    info = await stat(path)
  }
  catch {
    return plain(res, 404, 'image not found')
  }
  if (!info.isFile()) return plain(res, 404, 'not a file')
  if (info.size > MAX_BYTES) return plain(res, 413, 'image too large')

  res.writeHead(200, imageHeaders(type, info.size))
  if (req.method === 'HEAD') return res.end()
  const stream = createReadStream(path)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

/** GET /hdd/v1/proxy?u=<http(s) 图片地址> */
async function serveRemote(req, res, query) {
  const raw = (query.get('u') ?? '').trim()
  if (raw === '') return plain(res, 400, 'missing url')

  let target
  try {
    target = new URL(raw)
  }
  catch {
    return plain(res, 400, 'invalid url')
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return plain(res, 400, 'only http(s) urls are accepted')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const upstream = await fetch(target, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'image/*' },
    })
    if (!upstream.ok) return plain(res, 502, `upstream ${upstream.status}`)

    const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!type.startsWith('image/')) return plain(res, 415, `upstream content-type is ${type || 'unknown'}`)

    const declared = Number(upstream.headers.get('content-length') ?? '')
    if (Number.isFinite(declared) && declared > MAX_BYTES) return plain(res, 413, 'image too large')

    const bytes = Buffer.from(await upstream.arrayBuffer())
    if (bytes.length > MAX_BYTES) return plain(res, 413, 'image too large')

    res.writeHead(200, imageHeaders(type, bytes.length))
    if (req.method === 'HEAD') return res.end()
    return res.end(bytes)
  }
  catch (error) {
    const reason = controller.signal.aborted ? 'upstream timed out' : String(error?.message ?? error)
    return plain(res, 502, reason)
  }
  finally {
    clearTimeout(timer)
  }
}

async function readBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** GET / POST /hdd/v1/persona —— 读写 ~/.dsh/AGENT.md。 */
async function servePersona(req, res) {
  const file = personaPath()

  if (req.method === 'GET' || req.method === 'HEAD') {
    let text = ''
    try {
      text = await readFile(file, 'utf8')
    }
    catch {
      text = ''
    }
    return json(res, 200, { path: file, text, exists: text !== '' })
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' })
    return res.end()
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req, MAX_PERSONA_BYTES + 4096))
  }
  catch (error) {
    return json(res, 400, { error: String(error?.message ?? error) })
  }
  if (typeof payload?.text !== 'string') return json(res, 400, { error: 'text must be a string' })
  if (Buffer.byteLength(payload.text) > MAX_PERSONA_BYTES) return json(res, 413, { error: 'persona too large' })

  try {
    await mkdir(dirname(file), { recursive: true })
    let previous = null
    try {
      previous = await readFile(file, 'utf8')
    }
    catch {
      previous = null
    }
    if (previous !== null) await writeFile(personaBackupPath(), previous, 'utf8')
    await writeFile(file, payload.text, 'utf8')
    return json(res, 200, { ok: true, path: file, bytes: Buffer.byteLength(payload.text) })
  }
  catch (error) {
    return json(res, 500, { error: String(error?.message ?? error) })
  }
}

/** POST /hdd/v1/probe —— 皮肤诊断落盘，仅当仓库根目录有 `.probe/ENABLED` 时收。 */
async function serveProbe(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' })
    return res.end()
  }

  let enabled = false
  try {
    enabled = (await stat(join(PROBE_DIR, 'ENABLED'))).isFile()
  }
  catch {
    enabled = false
  }
  if (!enabled) return plain(res, 404, 'probe disabled')

  let body
  try {
    body = await readBody(req, 256 * 1024)
    JSON.parse(body)
  }
  catch (error) {
    return json(res, 400, { error: String(error?.message ?? error) })
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  try {
    await mkdir(PROBE_DIR, { recursive: true })
    await writeFile(join(PROBE_DIR, `report-${stamp}.json`), body, 'utf8')
    await writeFile(join(PROBE_DIR, 'latest.json'), body, 'utf8')
    return json(res, 200, { ok: true, file: `report-${stamp}.json`, bytes: Buffer.byteLength(body) })
  }
  catch (error) {
    return json(res, 500, { error: String(error?.message ?? error) })
  }
}

/*
 * GET /hdd/v1/market-index.json
 *
 * 插件市场索引（format 1）由 scripts/market-index.mjs 生成、随包发布；这里只是把它
 * 用同源地址对外提供，所以索引永远跟着插件版本走，不依赖任何第三方托管。
 * 读者是 DSH 的市场服务（服务端 fetch），CORS 开着是为了便于本地排查。
 */
async function serveMarketIndex(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }

  let body
  try {
    body = await readFile(MARKET_INDEX_FILE, 'utf8')
  }
  catch {
    return plain(res, 404, 'market index missing: run scripts/market-index.mjs')
  }

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(body)),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  if (req.method === 'HEAD') return res.end()
  res.end(body)
}

/*
 * GET /hdd/v1/stamp
 *
 * 开发期自动重载用的一枚指纹：client.js 的修改时间与大小。页面半身在加载后每四秒
 * 问一次，指纹一变就自己刷一次，省掉「改完样式还得手动重载客户端」这一步。
 * 与探针同样由 `.probe/ENABLED` 把关：npm 安装的包没有这个文件，拿 404，静默停摆。
 */
async function serveStamp(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }

  let enabled = false
  try {
    enabled = (await stat(join(PROBE_DIR, 'ENABLED'))).isFile()
  }
  catch {
    enabled = false
  }
  if (!enabled) return plain(res, 404, 'stamp disabled')

  let info
  try {
    info = await stat(CLIENT_FILE)
  }
  catch (error) {
    return json(res, 500, { error: String(error?.message ?? error) })
  }

  const body = JSON.stringify({
    stamp: `${Math.round(info.mtimeMs)}-${info.size}`,
    mtime: info.mtimeMs,
    size: info.size,
  })
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(Buffer.byteLength(body)),
    'Cache-Control': 'no-store',
  })
  if (req.method === 'HEAD') return res.end()
  res.end(body)
}

async function serve(req, res) {
  let url
  try {
    url = new URL(req.url ?? '/', 'http://hdd.invalid')
  }
  catch {
    return plain(res, 400, 'bad request')
  }

  const known = ASSETS.get(url.pathname)
  if (known !== undefined) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end()
    }
    return serveAsset(req, res, known)
  }

  if (url.pathname === `${PREFIX}/v1/persona`) return servePersona(req, res)
  if (url.pathname === `${PREFIX}/v1/probe`) return serveProbe(req, res)
  if (url.pathname === `${PREFIX}/v1/stamp`) return serveStamp(req, res)
  if (url.pathname === `${PREFIX}/v1/market-index.json`) return serveMarketIndex(req, res)

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }
  if (url.pathname === `${PREFIX}/v1/file`) return serveLocal(req, res, url.searchParams)
  if (url.pathname === `${PREFIX}/v1/proxy`) return serveRemote(req, res, url.searchParams)

  return plain(res, 404, 'unknown route')
}

export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({ kind: 'prefix', path: PREFIX, handler: serve }),
    'hdd: assets, backdrop sources and persona',
  )

  /*
   * 人格注入：每次装配系统提示时现读 AGENT.md，所以面板里保存后下一回合就生效，
   * 不用重启。文件为空则什么都不注入。HTML 注释不进入上下文。
   */
  ctx.effect(() => {
    try {
      return ctx.systemPrompt.context({
        name: 'hdd:persona',
        order: 260,
        text: () => {
          let raw
          try {
            raw = readFileSync(personaPath(), 'utf8')
          }
          catch {
            return ''
          }
          const body = raw.replace(/<!--[\s\S]*?-->/g, '').trim()
          if (body === '') return ''
          return [
            '## 人格设定（AGENT.md）',
            '以下是用户为本机写下的角色与性格设定，决定你「是谁、怎么说话、怎么做事」；请始终照此扮演。',
            '',
            body,
            '',
            '约束：人格设定只决定语气、风格与行事偏好，不改变安全规则、工具用法与任务事实；两者冲突时以安全规则和事实为准。',
          ].join('\n')
        },
      })
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('already registered')) {
        console.warn('[hdd] hdd:persona 已注册，跳过重复注册')
        return () => {}
      }
      throw error
    }
  }, 'hdd: persona injection')
}