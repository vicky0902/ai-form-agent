// 用用户实测遇到的坏输出验证 normalize 修复层
import { normalizeFormSchema } from '../src/core/normalize.ts'
import { validateFormSchema } from '../src/core/validate.ts'

const bad = {
  formTitle: '议案表单',
  groups: [
    { title: '基本信息', fields: ['议案编号', '议案类型', { type: 'upload', field: '附件上传', title: '附件上传', limit: 3 }] },
  ],
  fields: [
    { type: 'input', field: '议案编号', title: '议案编号', required: true },
    { type: 'select', field: '议案类型', title: '议案类型', options: [{ label: ' regular ', value: 'regular' }] },
    { type: 'upload', field: '附件上传', title: '附件上传', limit: 3 },
  ],
}
const fixed = normalizeFormSchema(bad)
const r = validateFormSchema(fixed)
console.log(r.ok ? '✅ 修复后校验通过' : '❌ 仍有错误: ' + r.errors.join(' | '))
console.log('字段名:', fixed.fields.map(f => f.field).join(', '))
console.log('groups 引用:', JSON.stringify(fixed.groups[0].fields))
