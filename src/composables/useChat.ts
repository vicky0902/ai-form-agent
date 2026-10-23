import { ref } from 'vue'
import type { FormSchema } from '../types'
import { streamChat, type ChatMessage } from '../api/llm'
import { extractJson } from '../core/extract'
import { buildSystemPrompt } from '../core/prompt'
import { validateFormSchema } from '../core/validate'

export interface ChatItem {
  id: number
  role: 'user' | 'ai'
  text: string
  /** ai：流式原始输出 */
  raw?: string
  status: 'streaming' | 'ok' | 'fail' | 'aborted'
  note?: string
}

const MAX_RETRIES = 2
const HISTORY_MESSAGES = 4

let uid = 0

export function useChat(handlers: { onSchema: (s: FormSchema) => void }) {
  const items = ref<ChatItem[]>([])
  const generating = ref(false)
  const currentSchema = ref<FormSchema | null>(null)
  let history: ChatMessage[] = []
  let ac: AbortController | null = null

  function pushUser(text: string) {
    items.value.push({ id: ++uid, role: 'user', text, status: 'ok' })
  }

  function pushAI(): ChatItem {
    const item: ChatItem = { id: ++uid, role: 'ai', text: '', status: 'streaming', note: '正在生成…' }
    items.value.push(item)
    return item
  }

  /** 生成 → 解析 → 校验 → 失败带错误回灌自动修复，最多 MAX_RETRIES 次 */
  async function generate(baseMessages: ChatMessage[], item: ChatItem): Promise<FormSchema> {
    let convo = baseMessages
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      ac = new AbortController()
      let raw = ''
      try {
        raw = await streamChat({
          messages: convo,
          signal: ac.signal,
          onDelta: (d) => {
            item.raw = (item.raw ?? '') + d
          },
        })
      } catch (err) {
        if (ac.signal.aborted) {
          item.status = 'aborted'
          item.note = '已中断'
          throw err
        }
        item.status = 'fail'
        item.note = (err as Error).message
        throw err
      }

      let parsed: unknown
      try {
        parsed = extractJson(raw)
      } catch (err) {
        item.note = `输出解析失败，自动修复中（第 ${attempt + 1} 次）…`
        convo = withRetryTurn(convo, raw, [(err as Error).message])
        continue
      }
      const result = validateFormSchema(parsed)
      if (!result.ok) {
        item.note = `校验发现 ${result.errors.length} 个问题，自动修复中（第 ${attempt + 1} 次）…`
        convo = withRetryTurn(convo, raw, result.errors)
        continue
      }
      item.status = 'ok'
      item.note = attempt
        ? `✓ Schema 校验通过（自动修复 ${attempt} 次后）`
        : '✓ Schema 校验通过'
      return parsed as FormSchema
    }
    item.status = 'fail'
    item.note = `连续 ${MAX_RETRIES + 1} 次输出未通过校验，已停止`
    throw new Error('生成失败')
  }

  function withRetryTurn(convo: ChatMessage[], raw: string, errors: string[]): ChatMessage[] {
    return [
      ...convo,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content:
          `你上一次的输出未通过校验（${errors.length} 个错误）：\n` +
          errors.map((e, i) => `${i + 1}. ${e}`).join('\n') +
          '\n请修复全部错误，重新输出修改后的完整 JSON 配置，只输出 JSON。' +
          '\n再次提醒：每个 field 必须是英文小驼峰（如 photos、faultLevel），绝不能是中文。',
      },
    ]
  }

  async function send(text: string) {
    const clean = text.trim().slice(0, 500)
    if (generating.value || !clean) return
    pushUser(clean)
    const item = pushAI()
    generating.value = true
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(currentSchema.value) },
        ...history.slice(-HISTORY_MESSAGES),
        { role: 'user', content: clean },
      ]
      const schema = await generate(messages, item)
      currentSchema.value = schema
      history = [
        ...history.slice(-HISTORY_MESSAGES),
        { role: 'user', content: clean },
        { role: 'assistant', content: JSON.stringify(schema) },
      ]
      handlers.onSchema(schema)
    } catch {
      /* 错误信息已写在 item 上 */
    } finally {
      generating.value = false
      ac = null
    }
  }

  function stop() {
    ac?.abort()
  }

  return { items, generating, currentSchema, send, stop }
}
