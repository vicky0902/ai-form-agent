import type { FormSchema } from '../types'
import { ALLOWED_FIELD_PROPS, OPTION_TYPES, type FieldType } from '../types'
import { formatAjvErrors, validateStructure } from './schema'

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

const CAMEL_RE = /^[a-z][a-zA-Z0-9]*$/

/** 语义层检查：结构层（Ajv）+ 业务规则，错误信息面向 LLM 回灌，必须具体可执行 */
export function validateFormSchema(data: unknown): ValidationResult {
  const ok = validateStructure(data)
  const errors = formatAjvErrors(validateStructure.errors)
  if (!ok) return { ok: false, errors }

  const schema = data as FormSchema
  const seen = new Set<string>()

  schema.fields.forEach((f, i) => {
    const at = `第 ${i + 1} 个字段（${f.field || f.title || '未命名'}）`
    if (!CAMEL_RE.test(f.field)) {
      errors.push(`${at} 的 field 必须是小驼峰英文（如 leaveType），不能是中文或有空格`)
    }
    if (seen.has(f.field)) errors.push(`${at} 的 field「${f.field}」重复`)
    seen.add(f.field)

    const type = f.type as FieldType
    if (OPTION_TYPES.includes(type) && (!f.options || f.options.length === 0)) {
      errors.push(`${at} 是 ${type} 类型，必须提供 options 数组`)
    }
    for (const key of Object.keys(f)) {
      const generic = ['type', 'field', 'title', 'required', 'placeholder', 'span', 'options', 'defaultValue']
      const allowed = [...generic, ...(ALLOWED_FIELD_PROPS[type] ?? [])]
      if (!allowed.includes(key)) {
        errors.push(`${at} 的属性「${key}」不是 ${type} 类型允许的属性，请删除`)
      }
    }
    if (type === 'datePicker' && !f.dateType) {
      // 用户提到起止/区间时必须用 daterange；这里只在字段名含 range/start/end 时提醒
      if (/range|start|end|from|to/i.test(f.field)) {
        errors.push(`${at} 看起来是日期区间，请设置 dateType: "daterange"，不要拆成两个字段`)
      }
    }
  })

  for (const g of schema.groups ?? []) {
    for (const name of g.fields) {
      if (!seen.has(name)) {
        errors.push(`分组「${g.title}」引用了不存在的字段「${name}」，groups.fields 必须使用 fields 中已有的 field 名`)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

/** 供自动修复重试时构造错误回灌文本 */
export function formatErrorsForRetry(errors: string[]): string {
  return errors.map((e, i) => `${i + 1}. ${e}`).join('\n')
}
