import type { AnySchema } from '../types'

const SPEC_DIGEST = `表单/页面配置规范 v1（必须严格遵守）：

顶层必含 pageType，根据需求选择场景（拿不准时用 form）：
- form：填写/申请/登记类表单
- list：列表/管理页
- detail：展示/详情页

【form 结构】{ pageType:'form', formTitle(1~30字,必填), description(≤100字), labelWidth(80~200), columns(1|2), groups, fields(1~20个,必填) }
groups: [{ title(2~8字), fields:[字段名字符串…] }]；fields: 字段对象数组
⚠️ fields 必须是【字段对象数组】；groups.fields 必须是【字符串数组】（只放字段名，不是对象）。

字段对象通用属性（form）：type(必填), field(必填,小驼峰英文禁止中文), title(必填,2~20字), required, placeholder, span(1|2)
type 白名单（仅此 11 种）：input | textarea | inputNumber | select | radio | checkbox | datePicker | timePicker | switch | cascader | upload
专有属性：input: maxLength(1~500)；textarea: rows(2~6), maxLength(1~500)；inputNumber: min,max,precision(0~2),unit；select: options(必填),multiple；radio/checkbox: options(必填)；datePicker: dateType("date"|"daterange"，日期区间必须用 daterange 不拆字段)；cascader: options(必填,children 嵌套)；upload: limit(1~5),accept；timePicker/switch: 无
options: { label: 中文, value: 小写英文 }，cascader 子级放 children
排版（form）：短字段 span:1；textarea/upload/cascader/daterange 用 span:2；字段>8个必须用 groups 分组

【list 结构】{ pageType:'list', pageTitle(2~20字), searchFields(0~4个,仅 input/select/datePicker,field 英文驼峰,select 必须带 options), columns(3~8个:{"prop":"英文驼峰","label":"中文"}) }

【detail 结构】{ pageType:'detail', pageTitle(2~20字), groups(1~4个:[{title(2~8字), items(2~8个:{"label":"中文字段名"})}]) }

禁止：白名单之外的任何属性（无 CSS/style/class）、中文 field、select 类缺 options。

【form 正确示例】（严格模仿结构与命名，field 一律英文小驼峰）：
{
  "pageType": "form",
  "formTitle": "会议室预约",
  "columns": 2,
  "groups": [{ "title": "会议信息", "fields": ["topic", "room", "attendees", "dateRange", "needProjector", "notes"] }],
  "fields": [
    { "type": "input", "field": "topic", "title": "会议主题", "required": true, "maxLength": 50 },
    { "type": "cascader", "field": "room", "title": "会议室", "required": true, "span": 2,
      "options": [{ "label": "A栋", "value": "a", "children": [{ "label": "A-101", "value": "a101" }] }] },
    { "type": "inputNumber", "field": "attendees", "title": "参会人数", "required": true, "min": 1, "max": 200 },
    { "type": "datePicker", "field": "dateRange", "title": "会议日期", "required": true, "span": 2, "dateType": "daterange" },
    { "type": "switch", "field": "needProjector", "title": "需要投影" },
    { "type": "upload", "field": "attachments", "title": "会议材料", "span": 2, "limit": 3, "accept": ".pdf,.docx" },
    { "type": "textarea", "field": "notes", "title": "备注", "span": 2, "rows": 3 }
  ]
}

【list 正确示例】：
{
  "pageType": "list",
  "pageTitle": "设备管理",
  "searchFields": [
    { "type": "input", "field": "keyword", "title": "关键词", "placeholder": "设备编号/名称" },
    { "type": "select", "field": "status", "title": "状态", "options": [{ "label": "启用", "value": "on" }, { "label": "停用", "value": "off" }] }
  ],
  "columns": [
    { "prop": "deviceCode", "label": "设备编号" },
    { "prop": "deviceName", "label": "设备名称" },
    { "prop": "manager", "label": "负责人" },
    { "prop": "updatedAt", "label": "更新时间" }
  ]
}`

const OUTPUT_RULES = `输出要求：
1. 只输出一个 JSON 对象，不要 markdown 代码块，不要任何解释文字
2. 严格遵守上述规范，任何白名单之外的属性都会导致校验失败
3. 必填字段选择要合理：业务关键字段必填，备注类不必填
4. 根据需求自动选择 pageType：表单用 form，列表/管理页用 list，展示页用 detail`

export function buildSystemPrompt(current?: AnySchema | null): string {
  if (!current) {
    return `你是中后台页面配置专家。根据用户的业务需求，生成表单/列表/详情页的 JSON 配置。\n\n${SPEC_DIGEST}\n\n${OUTPUT_RULES}`
  }
  const pageType = current.pageType ?? 'form'
  const currentJson = JSON.stringify(current, null, 2)
  return `你是中后台页面配置专家。用户会要求修改一个已存在的页面配置，你需要输出修改后的【完整】JSON 配置（不是增量 patch）。

当前页面配置（pageType: ${pageType}）：
${currentJson}

${SPEC_DIGEST}

修改要求：
1. 保持 pageType 不变，只改用户提到的部分，未提及的字段原样保留（保持 field 名与顺序稳定）
2. 新增字段插入到用户指定的位置；未指定时放到语义最相关的分组末尾
3. ${OUTPUT_RULES}`
}
