export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
    headers: { 'Content-Type': 'application/json' },
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
