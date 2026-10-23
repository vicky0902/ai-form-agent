/**
 * 模型×提示词质量快速评测：对同一需求跑真实生成，校验输出，选最优组合
 * 运行：pnpm tsx scripts/try-model.ts [模型名]
 */
import { readFileSync } from 'node:fs'
import { buildSystemPrompt } from '../src/core/prompt'
import { extractJson } from '../src/core/extract'
import { validateFormSchema } from '../src/core/validate'

const KEY = process.env.LLM_API_KEY
const BASE = process.env.LLM_BASE_URL
const models = process.argv[2] ? [process.argv[2]] : ['glm-4.5-flash', 'glm-4-flash-250414', 'glm-4-flash']
const NEED = '做一个设备报修工单表单：设备编号、故障类型（下拉：硬件/软件/网络/其他）、故障等级（单选：一般/紧急/危急）、报修人、现场照片（上传最多3张）、故障描述（多行）。字段多于8个才分组。'

async function run(model: string, thinking: boolean) {
  const t0 = Date.now()
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(null) },
        { role: 'user', content: NEED },
      ],
      temperature: 0.3,
      ...(thinking ? {} : { thinking: { type: 'disabled' } }),
    }),
  })
  const j: any = await res.json()
  if (!res.ok || j.error) { console.log(`[${model}${thinking ? "" : " +无思考"}] ❌ API错误: ${JSON.stringify(j).slice(0, 150)}`); return }
  const text = j.choices?.[0]?.message?.content ?? ""
  let result = '解析/校验失败'
  try {
    const v = validateFormSchema(extractJson(text))
    result = v.ok ? `✅ 一次通过` : `❌ ${v.errors.length} 错: ${v.errors[0]}`
  } catch (e) {
    result = `❌ ${(e as Error).message.slice(0, 60)}`
  }
  console.log(`[${model}${thinking ? '' : ' +无思考'}] ${((Date.now() - t0) / 1000).toFixed(1)}s ${result}`)
  if (!result.includes('✅')) console.log('   原文前200字:', text.slice(0, 200).replace(/\n/g, ' '))
}

for (const m of models) {
  try { await run(m, false) } catch (e) { console.log(`[${m}] 异常: ${(e as Error).message.slice(0, 80)}`) }
}
