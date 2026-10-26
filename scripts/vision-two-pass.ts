/**
 * 两段式视觉生成评测：
 * 第一段（glm-4v-flash）：图片 → 逐字控件清单（禁止编造）
 * 第二段（glm-4-flash-250414）：清单 → 按 schema 规范生成配置
 * 运行：pnpm tsx scripts/vision-two-pass.ts <图片路径>
 */
import fs from 'node:fs'
import { buildSystemPrompt } from '../src/core/prompt'
import { extractJson } from '../src/core/extract'
import { normalizeAny } from '../src/core/normalize'
import { validateAny } from '../src/core/validate'

const KEY = process.env.LLM_API_KEY
const BASE = process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
const imgPath = process.argv[2] || '/Users/mac/Downloads/ui_新增首报@1x.png'
const b64 = fs.readFileSync(imgPath).toString('base64')

async function call(messages: any[]): Promise<string> {
  const vision = messages.some((m) => Array.isArray(m.content))
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: vision ? 'glm-4v-flash' : 'glm-4-flash-250414',
      messages,
      stream: false,
      temperature: 0.3,
      ...(vision ? {} : { thinking: { type: 'disabled' } }),
    }),
  })
  const j: any = await res.json()
  if (j.error) throw new Error(JSON.stringify(j.error))
  return j.choices?.[0]?.message?.content ?? ''
}

console.log('—— 第一段：图像识别（glm-4v-flash）——')
const INVENTORY_PROMPT = `请逐字提取这张图片中表单包含的每一个控件，输出为清单，每行一条，格式：
标签 | 控件类型(输入框/下拉/单选/多选/日期/多行文本/上传/子表格) | 下拉或单选的全部选项文本(逐字抄写；若图中看不到选项内容写"选项不可见") | 是否必填(图中有红星为"必填"，否则"选填")
同时列出：页面标题、面包屑路径、分组/区块标题、底部按钮。
要求：不要遗漏任何一行控件；不要编造图中不存在的控件或选项；分组归属照图片标注。`
const inventory = await call([
  { role: 'user', content: [
    { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
    { type: 'text', text: INVENTORY_PROMPT },
  ] },
])
console.log('清单长度:', inventory.length)
console.log(inventory.slice(0, 600))

console.log('\n—— 第二段：结构化生成（glm-4-flash-250414）——')
const pass2 = await call([
  { role: 'system', content: buildSystemPrompt(null) },
  { role: 'user', content: `以下是从一张表单截图逐字提取的控件清单。请严格按清单生成配置：字段标签与清单逐字一致、不得遗漏清单中的控件、不得新增清单外的字段；清单中"选项不可见"的下拉，选项生成两条 {"label":"待补充1","value":"tbd1"}；子表格/附件按规范映射。\n\n【控件清单】\n${inventory}` },
])
const parsed = normalizeAny(extractJson(pass2))
const r = validateAny(parsed)
console.log(r.ok ? '✅ 校验通过' : '❌ 校验失败: ' + r.errors.join(' | '))
const anyS: any = parsed
console.log('pageType:', anyS.pageType ?? 'form', '| 标题:', anyS.formTitle ?? anyS.pageTitle)
console.log('字段数:', anyS.fields?.length, '| 字段标签:', anyS.fields?.map((f: any) => f.title).join(' / '))
