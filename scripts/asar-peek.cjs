#!/usr/bin/env node
/*
 * asar-peek —— 在 DSH 的 app.asar 里找类名、查样式。改皮肤时的取证工具。
 *
 * 为什么需要它：宿主的 CSS Module 类名带构建哈希（`_composerSeat` 前面那串会变），
 * 软件式 DSH 又开不了 F12，只能直接从安装包里翻源码。稳定的是 `data-*` 属性，
 * 不是类名——看到 `[data-composer-seat]` 这种就优先用它。
 *
 * 用法：
 *   node scripts/asar-peek.cjs scan    <app.asar> <关键字> [关键字...]
 *   node scripts/asar-peek.cjs extract <app.asar> <输出目录> <扩展名> [扩展名...]
 *
 * 例：
 *   node scripts/asar-peek.cjs scan "C:/.../app.asar" composerSeat "data-composer-seat"
 *   node scripts/asar-peek.cjs extract "C:/.../app.asar" .tmp-asar .css
 *
 * scan 直接在原始字节里搜 UTF-8 串，不需要解包（asar 里的文件是原样存放的）；
 * extract 读 asar 头（offset 4 = headerSize，offset 12 = header 字符串长度，
 * JSON 从 offset 16 开始，正文基址 = 8 + headerSize），只解指定扩展名，避免
 * 把两百兆的包摊开。
 */
const fs = require('fs')
const path = require('path')

const CTX = 400
const MAX_HITS = 40

function scan(asar, needles) {
  const buf = fs.readFileSync(asar)
  console.log(`asar ${asar}\nsize ${buf.length}\n`)

  for (const needle of needles) {
    const nb = Buffer.from(needle, 'utf8')
    const seen = new Set()
    let from = 0
    let hits = 0
    while (hits < MAX_HITS) {
      const at = buf.indexOf(nb, from)
      if (at < 0) break
      from = at + 1
      hits++
      const start = Math.max(0, at - CTX)
      const end = Math.min(buf.length, at + CTX)
      const ctx = buf.subarray(start, end).toString('utf8').replace(/\u0000/g, '·')
      const key = ctx.slice(0, 80)
      if (seen.has(key)) continue
      seen.add(key)
      console.log(`=== ${needle} @${at} (${hits}) ===`)
      console.log(ctx, '\n')
    }
    console.log(`### ${needle}: ${hits} hit(s)\n`)
  }
}

function extract(asar, outDir, exts) {
  const want = new Set(exts.map(e => (e.startsWith('.') ? e : `.${e}`).toLowerCase()))
  const fd = fs.openSync(asar, 'r')
  const head = Buffer.alloc(16)
  fs.readSync(fd, head, 0, 16, 0)

  const headerSize = head.readUInt32LE(4)
  const headerStringSize = head.readUInt32LE(12)
  const hb = Buffer.alloc(headerStringSize)
  fs.readSync(fd, hb, 0, headerStringSize, 16)

  const header = JSON.parse(hb.toString('utf8').replace(/\u0000+$/g, ''))
  const base = 8 + headerSize

  const picked = []
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const p = prefix ? `${prefix}/${name}` : name
      if (entry.files) walk(entry, p)
      else if (entry.link) continue
      else if (want.has(path.extname(name).toLowerCase())) picked.push({ p, entry })
    }
  }
  walk(header, '')

  console.log(`matched ${picked.length} file(s) -> ${outDir}`)
  for (const { p, entry } of picked) {
    const dest = path.join(outDir, p.replace(/[:*?"<>|]/g, '_'))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const buf = Buffer.alloc(entry.size)
    fs.readSync(fd, buf, 0, entry.size, base + Number(entry.offset))
    fs.writeFileSync(dest, buf)
    console.log(String(entry.size).padStart(9), p)
  }
  fs.closeSync(fd)
}

const [mode, asar, ...rest] = process.argv.slice(2)
if (!mode || !asar || rest.length === 0) {
  console.error('usage: asar-peek.cjs scan|extract <app.asar> ...')
  process.exit(1)
}
if (!fs.existsSync(asar)) {
  console.error(`not found: ${asar}`)
  process.exit(1)
}

if (mode === 'scan') scan(asar, rest)
else if (mode === 'extract') extract(asar, rest[0], rest.slice(1))
else {
  console.error(`unknown mode: ${mode}`)
  process.exit(1)
}
