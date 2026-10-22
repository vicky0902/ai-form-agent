<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FieldOption, FormField, FormSchema } from '../types'

type Rule = Record<string, unknown>

const props = defineProps<{ schema: FormSchema | null }>()

function colSpan(f: FormField, twoCol: boolean): number {
  if (!twoCol) return 24
  return f.span === 2 ? 24 : 12
}

function flattenOptions(options: FieldOption[] | undefined): { label: string; value: string }[] {
  return (options ?? []).map((o) => ({ label: o.label, value: o.value }))
}

function baseType(f: FormField): string {
  if (f.type === 'textarea') return 'input'
  return f.type
}

function fieldRule(f: FormField, twoCol: boolean): Rule {
  const rule: Rule = {
    type: baseType(f),
    field: f.field,
    title: f.title,
    col: { span: colSpan(f, twoCol) },
    props: {} as Rule,
  }
  if (f.required) rule.effect = { required: true }
  const p = rule.props as Rule

  switch (f.type) {
    case 'input':
    case 'textarea': {
      if (f.placeholder) p.placeholder = f.placeholder
      if (f.maxLength) p.maxlength = f.maxLength
      if (f.type === 'textarea') {
        p.type = 'textarea'
        if (f.rows) p.rows = f.rows
      }
      break
    }
    case 'inputNumber': {
      if (f.min !== undefined) p.min = f.min
      if (f.max !== undefined) p.max = f.max
      if (f.precision !== undefined) p.precision = f.precision
      p.placeholder = f.placeholder ?? (f.unit ? `请输入${f.unit}数` : '请输入')
      p.controlsPosition = 'right'
      break
    }
    case 'select': {
      rule.options = flattenOptions(f.options)
      if (f.placeholder) p.placeholder = f.placeholder
      if (f.multiple) {
        p.multiple = true
        if (f.placeholder) p.placeholder = f.placeholder
      }
      break
    }
    case 'radio':
    case 'checkbox': {
      rule.options = flattenOptions(f.options)
      break
    }
    case 'datePicker': {
      p.type = f.dateType === 'daterange' ? 'daterange' : 'date'
      if (f.placeholder) p.placeholder = f.placeholder
      break
    }
    case 'timePicker': {
      if (f.placeholder) p.placeholder = f.placeholder
      break
    }
    case 'cascader': {
      p.options = f.options ?? []
      if (f.placeholder) p.placeholder = f.placeholder
      break
    }
    case 'upload': {
      p.action = '#'
      p.autoUpload = false
      if (f.limit) p.limit = f.limit
      if (f.accept) p.accept = f.accept
      break
    }
    case 'switch':
      break
  }

  if (f.defaultValue !== undefined) rule.value = f.defaultValue
  return rule
}

function dividerRule(title: string): Rule {
  return {
    type: 'el-divider',
    props: { contentPosition: 'left' },
    children: [title],
    col: { span: 24 },
  }
}

const rules = computed<Rule[]>(() => {
  const schema = props.schema
  if (!schema) return []
  const twoCol = (schema.columns ?? 2) === 2
  const grouped = new Set((schema.groups ?? []).flatMap((g) => g.fields))
  const ungrouped = schema.fields.filter((f) => !grouped.has(f.field))
  const byName = new Map(schema.fields.map((f) => [f.field, f]))

  const out: Rule[] = ungrouped.map((f) => fieldRule(f, twoCol))
  for (const g of schema.groups ?? []) {
    out.push(dividerRule(g.title))
    for (const name of g.fields) {
      const f = byName.get(name)
      if (f) out.push(fieldRule(f, twoCol))
    }
  }
  return out
})

const option = computed(() => ({
  form: {
    labelWidth: props.schema?.labelWidth ?? 100,
    labelPosition: 'right',
  },
  submitBtn: { innerText: '提 交', col: { span: 24 } },
  resetBtn: { innerText: '重 置', col: { span: 24 } },
}))

function onSubmit(formData: Record<string, unknown>) {
  ElMessage.success('表单校验通过，已收集数据（演示环境不真实提交）')
  console.log('[ai-form-agent] 提交数据：', formData)
}
</script>

<template>
  <div v-if="schema" class="renderer">
    <div class="renderer-head">
      <h2 class="renderer-title">{{ schema.formTitle }}</h2>
      <p v-if="schema.description" class="renderer-desc">{{ schema.description }}</p>
    </div>
    <form-create :rule="rules" :option="option" @submit="onSubmit" />
  </div>
</template>

<style scoped>
.renderer {
  max-width: 720px;
  margin: 0 auto;
}
.renderer-head {
  margin-bottom: 18px;
}
.renderer-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 500;
}
.renderer-desc {
  margin: 0;
  font-size: 12.5px;
  color: #909399;
}
</style>
