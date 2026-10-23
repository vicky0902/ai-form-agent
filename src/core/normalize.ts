import type { FieldOption, FormField } from '../types'

const CAMEL = /^[a-z][a-zA-Z0-9]*$/

/** 按场景分发的确定性修复 */
export function normalizeAny(input: unknown): unknown {
  const pageType = (input as { pageType?: string })?.pageType
  if (pageType === 'list') return normalizeList(input)
  if (pageType === 'detail') return input
  return normalizeFormSchema(input)
}

/** 列表页修复：prop 非法/重复、label 缺省、searchFields 溢出裁剪 */
function normalizeList(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const obj = { ...(input as Record<string, unknown>) }
  const seen = new Set<string>()
  let n = 0
  if (Array.isArray(obj.columns)) {
    obj.columns = (obj.columns as Record<string, unknown>[])
      .slice(0, 8)
      .map((c) => {
        if (!c || typeof c !== 'object') return { prop: `col${++n}`, label: '列' }
        const raw = typeof c.prop === 'string' ? c.prop.trim() : ''
        let prop = CAMEL.test(raw) && !seen.has(raw) ? raw : `col${++n}`
        while (seen.has(prop)) prop = `col${++n}`
        seen.add(prop)
        return { prop, label: typeof c.label === 'string' && c.label ? c.label : prop }
      })
  }
  if (Array.isArray(obj.searchFields)) {
    const sseen = new Set<string>()
    let m = 0
    obj.searchFields = (obj.searchFields as Record<string, unknown>[])
      .slice(0, 4)
      .map((s) => {
        if (!s || typeof s !== 'object') return s
        const raw = typeof s.field === 'string' ? s.field.trim() : ''
        let field = CAMEL.test(raw) && !sseen.has(raw) ? raw : `search${++m}`
        while (sseen.has(field)) field = `search${++m}`
        sseen.add(field)
        return { ...s, field }
      })
  }
  return obj
}

/**
 * 表单页确定性修复：在 Ajv 结构校验之前，把弱模型常见的可机械修复错误直接修掉，
 * 避免浪费模型重试。修复项：
 * A. 结构反转（fields 是字符串数组、完整对象被塞进 groups.fields）→ 交换
 * B. field 命名非法（中文/空格/重复）→ 按 type+序号 生成英文名，title 保持中文
 * C. groups.fields 引用按 title 兜底匹配，仍无法匹配的引用剔除
 */
export function normalizeFormSchema(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const obj = { ...(input as Record<string, unknown>) }
  if (!obj.pageType) obj.pageType = 'form'

  // A. 结构反转修复
  if (Array.isArray(obj.fields) && obj.fields.length > 0 && obj.fields.every((f) => typeof f === 'string')) {
    const objects: FormField[] = []
    const groups = Array.isArray(obj.groups) ? (obj.groups as Record<string, unknown>[]) : []
    for (const g of groups) {
      for (const f of Array.isArray(g.fields) ? (g.fields as unknown[]) : []) {
        if (f && typeof f === 'object') objects.push(f as FormField)
      }
    }
    if (objects.length > 0) {
      obj.fields = objects
      obj.groups = groups.map((g) => ({
        ...g,
        fields: (Array.isArray(g.fields) ? (g.fields as unknown[]) : [])
          .map((f) => (typeof f === 'string' ? f : (f as FormField)?.field))
          .filter((s): s is string => typeof s === 'string'),
      }))
    }
  }

  if (!Array.isArray(obj.fields)) return obj

  // B. field 命名修复
  const seen = new Set<string>()
  const counters: Record<string, number> = {}
  obj.fields = (obj.fields as Record<string, unknown>[]).map((f) => {
    if (!f || typeof f !== 'object') return f
    const raw = typeof f.field === 'string' ? f.field.trim() : ''
    let name = CAMEL.test(raw) ? raw : ''
    if (!name) {
      const base = typeof f.type === 'string' ? f.type : 'field'
      do {
        counters[base] = (counters[base] ?? 0) + 1
        name = `${base}${counters[base]}`
      } while (seen.has(name))
    }
    while (seen.has(name)) name = `${name}X`
    seen.add(name)
    return { ...f, field: name }
  })

  // C. groups 引用修复：先按 field 名收录，再按 title 兜底
  if (Array.isArray(obj.groups)) {
    const byTitle = new Map<string, string>()
    for (const f of obj.fields as FormField[]) {
      if (f?.title) byTitle.set(f.title, f.field)
    }
    obj.groups = (obj.groups as Record<string, unknown>[]).map((g) => ({
      ...g,
      fields: (Array.isArray(g.fields) ? (g.fields as unknown[]) : [])
        .map((s) => {
          if (typeof s !== 'string') return undefined
          if (seen.has(s)) return s
          return byTitle.get(s)
        })
        .filter((s): s is string => typeof s === 'string'),
    }))
  }

  return obj
}

export type { FieldOption }
