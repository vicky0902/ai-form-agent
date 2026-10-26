import { reactive, ref } from 'vue'
import type { AnySchema } from '../types'
import { streamChat, type ChatMessage } from '../api/llm'
import { extractJson } from '../core/extract'
import { normalizeAny } from '../core/normalize'
import { buildSystemPrompt, VISION_INVENTORY_PROMPT } from '../core/prompt'
import { validateAny } from '../core/validate'

export interface ChatItem {
  id: number
  role: 'user' | 'ai'
  text: string
  hasImage?: boolean
  /** ai：流式原始输出 */
  raw?: string
  status: 'streaming' | 'ok' | 'fail' | 'aborted'
  note?: string
}

const MAX_RETRIES = 2
const HISTORY_MESSAGES = 4

let uid = 0

export function useChat(handlers: { onSchema: (s: AnySchema, prompt: string) => void }) {
  const items = ref<ChatItem[]>([])
  const generating = ref(false)
  const currentSchema = ref<AnySchema | null>(null)
  let history: ChatMessage[] = []
  let ac: AbortController | null = null

  function pushUser(text: string, hasImage = false) {
    // 必须 reactive：后续对流式字段的直接赋值才能触发视图更新（原始对象赋值不会）
    items.value.push(reactive({ id: ++uid, role: 'user', text, hasImage, status: 'ok' } as ChatItem))
  }

  function pushAI(): ChatItem {
    const item = reactive({
      id: ++uid,
      role: 'ai',
      text: '',
      status: 'streaming',
      note: '正在生成…',
    } as ChatItem)
    items.value.push(item)
    return item
  }

  /** 生成 → 解析 → 校验 → 失败带错误回灌自动修复，最多 MAX_RETRIES 次 */
  async function generate(baseMessages: ChatMessage[], item: ChatItem): Promise<AnySchema> {
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
          onRetry: (attempt) => {
            item.note =
              attempt === 1
                ? '服务休眠中，正在唤醒（约 10 秒）…'
                : '仍在唤醒服务，请稍候…'
          },
        })
      } catch (err) {
        if (ac.signal.aborted) {
          item.status = 'aborted'
          item.note = '已中断'
          throw err
        }
        item.status = 'fail'
        item.note =
          (err as Error).message.includes('冷启动') || (err as Error).message.includes('50')
            ? '服务暂时不可用（可能在冷启动），请 1 分钟后重试'
            : (err as Error).message
        throw err
      }

      let parsed: unknown
      try {
        // 先做确定性修复（中文字段名/结构反转/引用错位），修不了的才走模型重试
        parsed = normalizeAny(extractJson(raw))
      } catch (err) {
        item.note = `输出解析失败，自动修复中（第 ${attempt + 1} 次）…`
        convo = withRetryTurn(convo, raw, [(err as Error).message])
        continue
      }
      const result = validateAny(parsed)
      if (!result.ok) {
        item.note = `校验发现 ${result.errors.length} 个问题，自动修复中（第 ${attempt + 1} 次）…`
        convo = withRetryTurn(convo, raw, result.errors)
        continue
      }
      item.status = 'ok'
      item.note = attempt
        ? `✓ Schema 校验通过（自动修复 ${attempt} 次后）`
        : '✓ Schema 校验通过'
      return parsed as AnySchema
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

  let lastPrompt = ''
  async function send(text: string, images?: string[]) {
    const clean = text.trim().slice(0, 500)
    if (generating.value || !clean) return
    lastPrompt = clean
    pushUser(clean, !!images)
    const item = pushAI()
    generating.value = true
    try {
      // 带图片 = 两段式：视觉模型逐字提取控件清单 → 文本模型按清单生成配置
      const fresh = !!images
      let inventory = ''
      if (images?.length) {
        const inventories: string[] = []
        for (let bi = 0; bi < images.length; bi++) {
          item.note =
            images.length > 1
              ? `正在识别图片（第 ${bi + 1}/${images.length} 段）…`
              : '正在识别图片中的字段…'
          item.raw = ''
          ac = new AbortController()
          const bandTip =
            images.length > 1
              ? `\n本图是长截图的第 ${bi + 1}/${images.length} 段，只提取本段内完整可见的控件；边缘被截断一半的控件也要提取并在末尾标注"(截断)"。`
              : ''
          const inv = await streamChat({
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: images[bi] } },
                { type: 'text', text: VISION_INVENTORY_PROMPT + bandTip },
              ],
            }],
            signal: ac.signal,
            onDelta: (d) => {
              item.raw = (item.raw ?? '') + d
            },
          })
          inventories.push(inv)
        }
        inventory = inventories.join('\n\n')
        item.note = '识别完成，正在生成配置…'
      }
      const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(fresh ? null : currentSchema.value) },
        ...history.slice(-HISTORY_MESSAGES),
        {
          role: 'user',
          content: images
            ? `以下是从一张表单截图逐字提取的控件清单。请严格按清单生成配置：字段标签与清单逐字一致、不得遗漏清单中的控件、不得新增清单外的字段；清单中"选项不可见"的下拉，选项生成两条 {"label":"待补充1","value":"tbd1"}；子表格/附件按规范映射。用户补充要求：${clean}

【控件清单】
${inventory}`
            : clean,
        },
      ]
      const schema = await generate(messages, item)
      currentSchema.value = schema
      history = [
        ...history.slice(-HISTORY_MESSAGES),
        { role: 'user', content: clean },
        { role: 'assistant', content: JSON.stringify(schema) },
      ]
      handlers.onSchema(schema, lastPrompt)
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

  /** 从历史记录加载一份已生成的配置（可直接继续修改） */
  function loadSchema(schema: AnySchema) {
    currentSchema.value = schema
  }

  /** 清空会话与当前表单，回到初始状态 */
  function reset() {
    if (generating.value) return
    items.value = []
    currentSchema.value = null
    history = []
  }

  return { items, generating, currentSchema, send, stop, reset, loadSchema }
}
