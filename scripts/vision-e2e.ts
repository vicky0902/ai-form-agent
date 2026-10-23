/**
 * 视觉链路端到端测试：真实表单截图 → 线上中转 → glm-4v-flash → 校验
 * 运行：pnpm tsx scripts/vision-e2e.ts <图片路径>
 */
import fs from 'node:fs'
import { buildSystemPrompt } from '../src/core/prompt'
import { extractJson } from '../src/core/extract'
import { normalizeAny } from '../src/core/normalize'
import { validateAny } from '../src/core/validate'

const RELAY = process.env.RELAY_URL || 'https://ai-form-agent-relay-333671-11-1304975205.sh.run.tcloudbase.com'
const imgPath = process.argv[2] || '/tmp/form-shot.png'
const b64 = fs.readFileSync(imgPath).toString('base64')

const messages = [
  { role: 'system', content: buildSystemPrompt(null) },
  {
    role: 'user',
    content: [
      { type: 'text', text: '请根据图片中的表单样式生成对应配置' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
    ],
  },
]

console.log('发送到线上中转…')
const res = await fetch(`${RELAY}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
})
console.log('http', res.status)
if (!res.ok) {
  console.log(await res.text())
  process.exit(1)
}
const reader = res.body!.getReader()
const dec = new TextDecoder()
let buf = '', raw = ''
for (;;) {
  const { done, value } = await reader.read()
  if (done) break
  buf += dec.decode(value, { stream: true })
  let i: number
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const frame = buf.slice(0, i)
    buf = buf.slice(i + 2)
    for (const line of frame.split('\n')) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const d = t.slice(5).trim()
      if (d === '[DONE]') continue
      try {
        const c = JSON.parse(d).choices?.[0]?.delta?.content
        if (c) raw += c
      } catch {}
    }
  }
}
console.log('原始输出长度:', raw.length)
const parsed = normalizeAny(extractJson(raw))
const r = validateAny(parsed)
console.log(r.ok ? '✅ 校验通过' : '❌ 校验失败: ' + r.errors.join(' | '))
if (r.ok) {
  const anyS = parsed as any
  console.log('pageType:', anyS.pageType ?? 'form', '| 标题:', anyS.formTitle ?? anyS.pageTitle, '| 字段数:', anyS.fields?.length)
}
