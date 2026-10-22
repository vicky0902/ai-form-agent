import Ajv, { type ErrorObject } from 'ajv'

/** 结构层 JSON Schema（语义层检查在 validate.ts） */
export const FORM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['formTitle', 'fields'],
  properties: {
    formTitle: { type: 'string', minLength: 1, maxLength: 30 },
    description: { type: 'string', maxLength: 100 },
    labelWidth: { type: 'integer', minimum: 80, maximum: 200 },
    columns: { type: 'integer', enum: [1, 2] },
    groups: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'fields'],
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 8 },
          fields: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
      },
    },
    fields: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: { $ref: '#/definitions/field' },
    },
  },
  definitions: {
    option: {
      type: 'object',
      additionalProperties: false,
      required: ['label', 'value'],
      properties: {
        label: { type: 'string', minLength: 1, maxLength: 20 },
        value: { type: 'string', minLength: 1, maxLength: 40 },
        children: { type: 'array', items: { $ref: '#/definitions/option' } },
      },
    },
    field: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'field', 'title'],
      properties: {
        type: {
          type: 'string',
          enum: [
            'input',
            'textarea',
            'inputNumber',
            'select',
            'radio',
            'checkbox',
            'datePicker',
            'timePicker',
            'switch',
            'cascader',
            'upload',
          ],
        },
        field: { type: 'string', minLength: 1, maxLength: 40 },
        title: { type: 'string', minLength: 2, maxLength: 20 },
        required: { type: 'boolean' },
        placeholder: { type: 'string', maxLength: 50 },
        span: { type: 'integer', enum: [1, 2] },
        maxLength: { type: 'integer', minimum: 1, maximum: 500 },
        rows: { type: 'integer', minimum: 2, maximum: 6 },
        min: { type: 'number' },
        max: { type: 'number' },
        precision: { type: 'integer', minimum: 0, maximum: 2 },
        unit: { type: 'string', maxLength: 6 },
        multiple: { type: 'boolean' },
        dateType: { type: 'string', enum: ['date', 'daterange'] },
        limit: { type: 'integer', minimum: 1, maximum: 5 },
        accept: { type: 'string', maxLength: 60 },
        options: { type: 'array', items: { $ref: '#/definitions/option' } },
        defaultValue: {},
      },
    },
  },
} as const

const ajv = new Ajv({ allErrors: true })
export const validateStructure = ajv.compile(FORM_SCHEMA)

/** 将 Ajv 错误转成可读中文（只取前几条，避免刷屏） */
export function formatAjvErrors(errors: readonly ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return []
  return errors.slice(0, 6).map((e) => {
    const where = e.instancePath.replace(/^\//, '顶层').replace(/\//g, '.') || '顶层'
    if (e.keyword === 'additionalProperties') {
      return `${where} 出现了白名单之外的属性「${(e.params as { additionalProperty: string }).additionalProperty}」`
    }
    if (e.keyword === 'enum') {
      return `${where} 的值不在允许范围内（${(e.params as { allowedValues: unknown[] }).allowedValues.join(' / ')}）`
    }
    return `${where} ${e.message ?? '不合法'}`
  })
}
