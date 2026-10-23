import { loadByok } from '../composables/useByok'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 自带 Key（BYOK）：请求头透传给中转服务，中转优先使用 */
function byokHeaders(): Record<string, string> {
  const cfg = loadByok()
  if (!cfg?.apiKey) return {}
  const h: Record<string, string> = { 'x-llm-api-key': cfg.apiKey }
  if (cfg.baseUrl) h['x-llm-base-url'] = cfg.baseUrl
  if (cfg.model) h['x-llm-model'] = cfg.model
  return h
}

/**
 * 调用中转服务，流式接收 LLM 输出。
 * SSE 按 "\n\n" 分帧（TCP 分包可能截断帧，必须缓冲拼接，不能按 chunk 直接 parse）。
 * 只拼接 delta.content——上游思考模型的 reasoning_content 不进入正文。
 */
export async function streamChat(opts: {
  messages: ChatMessage[]
  signal: AbortSignal
  onDelta: (delta: string) => void
}): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...byokHeaders() },
    body: JSON.stringify({ messages: opts.messages }),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    let msg = `请求失败（${res.status}）`
    try {
      const j = (await res.json()) as { error?: string }
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      for (const line of frame.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return full
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[]
          }
          const delta = json.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta) {
            full += delta
            opts.onDelta(delta)
          }
        } catch {
          // 单帧解析失败直接跳过，流继续
        }
      }
    }
  }
  return full
}

/** 验证自带 Key 是否可用（走中转 /api/verify，发一个 max_tokens=1 的最小请求） */
export async function verifyKey(cfg: {
  baseUrl?: string
  apiKey: string
  model?: string
}): Promise<{ ok: boolean; model?: string; error?: string }> {
  const headers: Record<string, string> = { 'x-llm-api-key': cfg.apiKey }
  if (cfg.baseUrl) headers['x-llm-base-url'] = cfg.baseUrl
  if (cfg.model) headers['x-llm-model'] = cfg.model
  try {
    const res = await fetch('/api/verify', { method: 'POST', headers })
    const j = (await res.json()) as { ok: boolean; model?: string; error?: string }
    return j
  } catch {
    return { ok: false, error: '网络异常，无法连接中转服务' }
  }
}
