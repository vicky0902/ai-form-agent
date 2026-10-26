/**
 * 三场景规范下的表单质量回归：跑一组典型 prompt，统计一次通过率
 * 运行：LLM_BASE_URL=... LLM_API_KEY=... pnpm tsx scripts/form-regression.ts
 */
import { buildSystemPrompt } from '../src/core/prompt'
import { extractJson } from '../src/core/extract'
import { normalizeAny } from '../src/core/normalize'
import { validateAny } from '../src/core/validate'

const KEY = process.env.LLM_API_KEY
const BASE = process.env.LLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'

const PROMPTS = [
  '议案表单',
  '做一个Demo页面',
  '设备报修工单：设备编号、故障类型、故障等级（单选）、报修人、照片、描述',
  '活动报名表：姓名、手机号、日期、人数、饮食偏好',
  '做一个问卷：满意度（单选）、评分（1-10）、建议（多行）',
]

async function run(prompt: string) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'glm-4-flash-250414',
      messages: [
        { role: 'system', content: buildSystemPrompt(null) },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      thinking: { type: 'disabled' },
    }),
  })
  const j: any = await res.json()
  const raw = j.choices?.[0]?.message?.content ?? ''
  try {
    const r = validateAny(normalizeAny(extractJson(raw)))
    if (r.ok) console.log(`✅ 「${prompt.slice(0, 14)}」通过`)
    else console.log(`❌ 「${prompt.slice(0, 14)}」${r.errors.length}错: ${r.errors.slice(0, 2).join('；')}`)
  } catch (e) {
    console.log(`❌ 「${prompt.slice(0, 14)}」解析失败: ${(e as Error).message.slice(0, 60)} | 原文: ${raw.slice(0, 80).replace(/\n/g, ' ')}`)
  }
}

let pass = 0
for (const p of PROMPTS) {
  try { const ok = await run(p); } catch (e) { console.log('异常', (e as Error).message.slice(0, 60)) }
}
