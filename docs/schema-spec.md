# 表单 Schema 生成规范 v1

> 本文档是「AI 表单生成器」的接口协议：LLM 依据本规范输出表单 JSON 配置，
> 渲染器依据同一规范将配置渲染为可交互表单。任何 schema 生成与校验任务必须遵循本规范。

## 1. 顶层结构

```json
{
  "formTitle": "员工请假申请",
  "description": "提交后进入部门审批流程",
  "labelWidth": 100,
  "columns": 2,
  "groups": [
    { "title": "基础信息", "fields": ["name", "dept", "leaveType"] },
    { "title": "请假详情", "fields": ["range", "days", "reason", "files"] }
  ],
  "fields": []
}
```

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| formTitle | string | ✅ | 1~30 字，页面标题 |
| description | string | — | ≤100 字，标题下说明文字 |
| labelWidth | number | — | 80~200，标签宽度，默认 100 |
| columns | 1 或 2 | — | 栅格列数，默认 2 |
| groups | array | — | 分组；fields 引用的字段名必须存在于 fields 中；最多 5 组 |
| fields | array | ✅ | 1~20 个字段对象 |

## 2. 字段对象

### 2.1 通用属性

| 属性 | 类型 | 必填 | 说明 |
|---|---|---|---|
| type | string | ✅ | 组件类型，见白名单 |
| field | string | ✅ | 字段名，小驼峰英文，**禁止中文与空格**，全局唯一 |
| title | string | ✅ | 标签文案，2~20 字 |
| required | boolean | — | 是否必填，默认 false |
| placeholder | string | — | 占位提示 |
| span | 1 或 2 | — | 占几列，默认 1；textarea / upload / cascader 建议 2 |

### 2.2 组件白名单（11 种，禁止使用白名单之外的类型）

| type | 专有属性 | 约束 |
|---|---|---|
| `input` | maxLength? (1~500) | 单行文本 |
| `textarea` | rows? (2~6，默认 3) / maxLength? (1~500) | 多行文本 |
| `inputNumber` | min? / max? / precision? (0~2) / unit? | 数字；unit 为单位后缀文案 |
| `select` | options ✅ / multiple? | 下拉选择；options 1~20 项 |
| `radio` | options ✅ | 单选；options 2~10 项 |
| `checkbox` | options ✅ | 多选；options 2~10 项 |
| `datePicker` | dateType? ("date" 或 "daterange"，默认 "date") | 日期区间一律用 daterange，**禁止拆成两个字段** |
| `timePicker` | — | 时间选择 |
| `switch` | — | 开关；defaultValue 只能是布尔值 |
| `cascader` | options ✅（可嵌套 children） | 级联选择；层级 2~3 级 |
| `upload` | limit? (1~5) / accept? | 附件上传 |

### 2.3 options 结构

```json
{ "label": "年假", "value": "annual" }
```

- `label`：中文展示文案；`value`：小写英文标识（小驼峰或下划线）
- cascader 的子级用 `children` 数组，叶子节点不带 children

### 2.4 defaultValue

可选。类型必须与组件匹配：switch → boolean；checkbox / multiple select / daterange → string[]；其余 → string 或 number。

## 3. 排版规则（生成时必须遵守）

1. 短字段（input / select / radio / inputNumber / datePicker(date) / timePicker / switch）默认 `span: 1`，成对并排；
2. 长字段（textarea / upload / cascader / daterange）用 `span: 2` 占整行；
3. 字段超过 8 个必须用 `groups` 分组（如「基本信息 / 详细信息 / 附件」），组名 2~8 字；
4. 标签统一右对齐（渲染器实现，schema 不用管）。

## 4. 样式边界（重要）

schema **只允许**本规范列出的布局 token（columns / labelWidth / groups / span）。
**禁止**任何 CSS、颜色、class、style 字段——视觉风格完全由组件库主题决定。
出现白名单之外的任何属性，校验直接失败。

## 5. 校验两层

1. **结构层（Ajv）**：类型、必填、枚举、数值范围；
2. **语义层（自定义检查）**：field 小驼峰且唯一；groups 引用的字段存在；
   select / radio / checkbox / cascader 必须有 options；daterange 不拆字段；
   defaultValue 类型匹配。

两层都通过才算合法 schema。

## 6. 正例（节选）

```json
{
  "type": "select",
  "field": "leaveType",
  "title": "请假类型",
  "required": true,
  "span": 1,
  "options": [
    { "label": "年假", "value": "annual" },
    { "label": "事假", "value": "personal" }
  ]
}
```

## 7. 反例（常见错误）

```json
{ "type": "dropdown", "field": "类型", "title": "类型" }
```

错在三处：`dropdown` 不在白名单；`field` 用了中文；select 类缺 options。
