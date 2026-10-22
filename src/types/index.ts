export type FieldType =
  | 'input'
  | 'textarea'
  | 'inputNumber'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'datePicker'
  | 'timePicker'
  | 'switch'
  | 'cascader'
  | 'upload'

export interface FieldOption {
  label: string
  value: string
  children?: FieldOption[]
}

/** 与 docs/schema-spec.md 一一对应 */
export interface FormField {
  type: FieldType
  field: string
  title: string
  required?: boolean
  placeholder?: string
  span?: 1 | 2
  maxLength?: number
  rows?: number
  min?: number
  max?: number
  precision?: number
  unit?: string
  multiple?: boolean
  dateType?: 'date' | 'daterange'
  limit?: number
  accept?: string
  options?: FieldOption[]
  defaultValue?: string | number | boolean | string[]
}

export interface FieldGroup {
  title: string
  fields: string[]
}

export interface FormSchema {
  formTitle: string
  description?: string
  labelWidth?: number
  columns?: 1 | 2
  groups?: FieldGroup[]
  fields: FormField[]
}

/** 白名单之外的属性，校验时逐个点名 */
export const ALLOWED_FIELD_PROPS: Record<FieldType, string[]> = {
  input: ['maxLength'],
  textarea: ['rows', 'maxLength'],
  inputNumber: ['min', 'max', 'precision', 'unit'],
  select: ['options', 'multiple'],
  radio: ['options'],
  checkbox: ['options'],
  datePicker: ['dateType'],
  timePicker: [],
  switch: [],
  cascader: ['options'],
  upload: ['limit', 'accept'],
}

export const OPTION_TYPES: FieldType[] = ['select', 'radio', 'checkbox', 'cascader']
