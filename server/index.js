import express from 'express'
import { Readable } from 'node:stream'

const app = express()
app.use(express.json({ limit: '64kb' })) // system prompt 含完整规范摘要，远超 2kb

// 静态托管域名与云托管域名不同源，允许任意来源调用（BYOK 头一并放行）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-llm-base-url, x-llm-api-key, x-llm-model')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

const BASE = process.env.LLM_BASE_URL
const KEY = process.env.LLM_API_KEY
const MODEL = process.env.LLM_MODEL || 'glm-4.6'
if (!BASE || !KEY) {
  console.error('[server] 缺少 LLM_BASE_URL / LLM_API_KEY 环境变量')
  process.exit(1)
}

// 每 IP 每分钟 5 次（演示站止损用，够正常体验）
const hits = new Map()
function rateLimited(ip) {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  rec.count += 1
  return rec.count > 5
}

// 自带 Key（BYOK）：请求头里的用户配置优先于服务端内置配置。
// 头部值做长度与格式校验，绝不写入日志。
const HEADER_LIMITS = { 'x-llm-base-url': 200, 'x-llm-api-key': 200, 'x-llm-model': 100 }
function userOverride(req) {
  const out = {}
  for (const [name, max] of Object.entries(HEADER_LIMITS)) {
    const v = req.headers[name]
    if (typeof v === 'string' && v.length > 0 && v.length <= max) {
      out[name.slice('x-llm-'.length).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v
    }
  }
  if (out.baseUrl && !/^https?:\/\//.test(out.baseUrl)) delete out.baseUrl
  return out.apiKey ? out : null
}

function upstreamConfig(req) {
  const env = { baseUrl: BASE, apiKey: KEY, model: MODEL }
  return { ...env, ...userOverride(req) }
}

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/api/verify', async (req, res) => {
  const cfg = upstreamConfig(req)
  try {
    const r = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: 'ok' }],
        max_tokens: 4,
        thinking: { type: 'disabled' },
      }),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      let msg = `HTTP ${r.status}`
      try {
        const j = JSON.parse(text)
        if (j?.error?.message) msg = j.error.message
      } catch {}
      return res.json({ ok: false, error: msg })
    }
    const j = await r.json().catch(() => null)
    return res.json({ ok: true, model: j?.model })
  } catch {
    return res.json({ ok: false, error: '无法连接该模型服务，请检查 Base URL' })
  }
})

app.post('/api/chat', async (req, res) => {
  if (rateLimited(req.ip ?? 'unknown')) {
    return res.status(429).json({ error: '请求太频繁，请一分钟后再试' })
  }

  const { messages } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
    return res.status(400).json({ error: '参数不合法' })
  }
  for (const m of messages) {
    const roleOk = m && (m.role === 'user' || m.role === 'assistant' || m.role === 'system')
    if (!roleOk || typeof m.content !== 'string' || m.content.length > 6000) {
      return res.status(400).json({ error: '消息格式不合法' })
    }
  }

  // 客户端中断时同步中止上游请求。
  // 注意：不能挂在 req 的 'close' 上——请求体读完它就会触发（Node ≥16 行为变化），
  // 会导致上游还没建立连接就被 abort。挂 res 并排除正常结束的情况。
  const ac = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) ac.abort()
  })

  const cfg = upstreamConfig(req)
  let upstream
  try {
    upstream = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        stream: true,
        temperature: 0.3,
        thinking: { type: 'disabled' },
      }),
      signal: ac.signal,
    })
  } catch (err) {
    if (ac.signal.aborted) return res.end()
    return res.status(502).json({ error: '无法连接模型服务' })
  }

  res.status(upstream.status)
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    let msg = '模型服务返回错误'
    try {
      const j = JSON.parse(text)
      if (j?.error?.message) msg = j.error.message
    } catch {}
    if (upstream.status === 401) msg = '模型 Key 无效'
    if (upstream.status === 429) msg = '额度或频率受限，请稍后再试'
    return res.json({ error: msg })
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  Readable.fromWeb(upstream.body)
    .on('error', () => res.end())
    .pipe(res)
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => console.log(`[server] listening on :${port}`))
