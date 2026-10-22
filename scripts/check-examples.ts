/**
 * Phase B 验收脚本：三份手写示例必须全部通过「结构层 + 语义层」校验
 * 运行：pnpm tsx scripts/check-examples.ts
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateFormSchema } from '../src/core/validate'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = ['leave.json', 'repair.json', 'supplier.json']

let failed = false
for (const name of files) {
  const raw = JSON.parse(readFileSync(join(root, 'examples', name), 'utf-8'))
  const result = validateFormSchema(raw)
  if (result.ok) {
    console.log(`✓ ${name} 通过（${raw.fields.length} 个字段）`)
  } else {
    failed = true
    console.error(`✗ ${name} 未通过：`)
    for (const e of result.errors) console.error(`   - ${e}`)
  }
}

// 反例必须被拦截：反例通过 = 校验器失效
const bad = {
  formTitle: '反例',
  fields: [{ type: 'dropdown', field: '类型', title: '类型' }],
}
const badResult = validateFormSchema(bad)
if (badResult.ok) {
  failed = true
  console.error('✗ 反例未被拦截——校验器失效！')
} else {
  console.log(`✓ 反例被正确拦截（${badResult.errors.length} 条错误）`)
}

process.exit(failed ? 1 : 0)
