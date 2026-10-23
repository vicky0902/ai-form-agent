import type { FormSchema } from '../types'

const SPEC_DIGEST = `表单配置规范 v1（必须严格遵守）：

顶层结构：{ formTitle(1~30字,必填), description(≤100字), labelWidth(80~200), columns(1|2), groups([{title(2~8字), fields:[字段名…]}]), fields(1~20个,必填) }
⚠️ 关键：fields 必须是【字段对象数组】；groups.fields 必须是【字符串数组】，元素只能是字段名（不是对象）。
⚠️ 每个 field 对象只允许出现在顶层 fields 中，groups 里只引用它的 field 名。

字段对象通用属性：type(必填), field(必填,小驼峰英文禁止中文), title(必填,2~20字), required, placeholder, span(1|2)
type 白名单（仅此 11 种）：input | textarea | inputNumber | select | radio | checkbox | datePicker | timePicker | switch | cascader | upload

各类型专有属性：
- input: maxLength(1~500)
- textarea: rows(2~6), maxLength(1~500)
- inputNumber: min, max, precision(0~2), unit
- select: options(必填,1~20项), multiple
- radio: options(必填,2~10项) | checkbox: options(必填,2~10项)
- datePicker: dateType("date"|"daterange")  ← 日期区间必须用 daterange，禁止拆成两个字段
- cascader: options(必填,可嵌套 children,2~3级) | upload: limit(1~5), accept
- timePicker / switch: 无专有属性

options 结构：{ label: 中文文案, value: 小写英文标识 }，cascader 子级放 children
排版：短字段 span:1 并排；textarea/upload/cascader/daterange 用 span:2；字段>8个必须用 groups 分组
禁止：白名单之外的任何属性（无 CSS/style/class）、中文 field、select 类缺 options

【正确示例】（严格模仿此结构与命名风格，field 一律英文小驼峰）：
{
  "formTitle": "会议室预约",
  "columns": 2,
  "groups": [{ "title": "会议信息", "fields": ["topic", "room", "attendees", "dateRange", "needProjector", "notes"] }],
  "fields": [
    { "type": "input", "field": "topic", "title": "会议主题", "required": true, "placeholder": "请输入会议主题", "maxLength": 50 },
    { "type": "cascader", "field": "room", "title": "会议室", "required": true, "span": 2,
      "options": [{ "label": "A栋", "value": "a", "children": [{ "label": "A-101", "value": "a101" }] }] },
    { "type": "inputNumber", "field": "attendees", "title": "参会人数", "required": true, "min": 1, "max": 200, "unit": "人" },
    { "type": "datePicker", "field": "dateRange", "title": "会议日期", "required": true, "span": 2, "dateType": "daterange" },
    { "type": "switch", "field": "needProjector", "title": "需要投影" },
    { "type": "upload", "field": "attachments", "title": "会议材料", "span": 2, "limit": 3, "accept": ".pdf,.docx" },
    { "type": "textarea", "field": "notes", "title": "备注", "span": 2, "rows": 3, "placeholder": "其他说明…" }
  ]
}`

const OUTPUT_RULES = `输出要求：
1. 只输出一个 JSON 对象，不要 markdown 代码块，不要任何解释文字
2. 严格遵守上述规范，任何白名单之外的属性都会导致校验失败
3. 必填字段选择要合理：业务关键字段必填，备注类字段不必填`

export function buildSystemPrompt(current?: FormSchema | null): string {
  if (!current) {
    return `你是中后台表单配置专家。根据用户的业务需求，生成表单 JSON 配置。\n\n${SPEC_DIGEST}\n\n${OUTPUT_RULES}`
  }
  const currentJson = JSON.stringify(current, null, 2)
  return `你是中后台表单配置专家。用户会要求修改一个已存在的表单，你需要输出修改后的【完整】表单 JSON 配置（不是增量 patch）。

当前表单配置：
${currentJson}

${SPEC_DIGEST}

修改要求：
1. 只改用户提到的部分，未提及的字段原样保留（保持 field 名与顺序稳定）
2. 新增字段插入到用户指定的位置；未指定时放到语义最相关的分组末尾
3. ${OUTPUT_RULES}`
}
