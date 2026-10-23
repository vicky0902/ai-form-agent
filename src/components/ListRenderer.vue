<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ListSchema } from '../types'

const props = defineProps<{ schema: ListSchema }>()

interface Row {
  [key: string]: string | number
}

function mockValue(prop: string, label: string, i: number): string | number {
  const p = prop.toLowerCase()
  if (/phone|mobile|tel/.test(p)) return '138' + String(71000000 + i * 137913).slice(0, 8)
  if (/(time|date) /.test(p) || /time|date$/.test(p) || /updated|created/.test(p))
    return `2026-10-${String((i % 9) + 14)} 0${(i % 9) + 1}:2${i % 6}`
  if (/status|state|status/.test(p)) return i % 2 === 0 ? '启用' : '停用'
  if (/count|num|qty|age|total/.test(p)) return (i + 1) * 7
  if (/email/.test(p)) return `user${i + 1}@example.com`
  if (/price|amount|fee/.test(p)) return '¥' + ((i + 1) * 128).toFixed(2)
  if (/code|no$/.test(p)) return `NO-2026${String(i + 1).padStart(4, '0')}`
  return `${label}示例${String(i + 1).padStart(2, '0')}`
}

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (let i = 0; i < 5; i++) {
    const row: Row = {}
    for (const c of props.schema.columns) row[c.prop] = mockValue(c.prop, c.label, i)
    out.push(row)
  }
  return out
})

const search = ref<Record<string, string>>({})
function onSearch() {
  ElMessageDemo()
}
function ElMessageDemo() {
  /* 演示环境：搜索不真实执行 */
}
function resetSearch() {
  search.value = {}
}
</script>

<template>
  <div class="list-renderer">
    <div class="lr-head">
      <h2 class="lr-title">{{ schema.pageTitle }}</h2>
      <p v-if="schema.description" class="lr-desc">{{ schema.description }}</p>
    </div>

    <div v-if="schema.searchFields?.length" class="search-bar">
      <div v-for="s in schema.searchFields" :key="s.field" class="sf">
        <label class="sf-label">{{ s.title }}</label>
        <select v-if="s.type === 'select'" v-model="search[s.field]" class="sf-input">
          <option value="">{{ s.placeholder || '全部' }}</option>
          <option v-for="o in s.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <input
          v-else
          v-model="search[s.field]"
          class="sf-input"
          :type="s.type === 'datePicker' ? 'date' : 'text'"
          :placeholder="s.placeholder || '请输入' + s.title"
        />
      </div>
      <button type="button" class="btn main" @click="onSearch">搜索</button>
      <button type="button" class="btn" @click="resetSearch">重置</button>
    </div>

    <table class="lr-table">
      <thead>
        <tr>
          <th v-for="c in schema.columns" :key="c.prop">{{ c.label }}</th>
          <th class="ops">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="c in schema.columns" :key="c.prop">{{ row[c.prop] }}</td>
          <td class="ops">
            <a class="lnk">编辑</a>
            <a class="lnk danger">删除</a>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pager">
      <span class="total">共 23 条（演示数据）</span>
      <span class="pages"><a class="pg on">1</a><a class="pg">2</a><a class="pg">3</a><a class="pg">›</a></span>
    </div>
  </div>
</template>

<style scoped>
.list-renderer {
  max-width: 760px;
}
.lr-head {
  margin-bottom: 16px;
}
.lr-title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: #1f2330;
}
.lr-desc {
  margin: 0;
  font-size: 12.5px;
  color: #8b91a5;
}
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  background: #f6f7fb;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.sf {
  display: flex;
  align-items: center;
  gap: 7px;
}
.sf-label {
  font-size: 13px;
  color: #4b5163;
  white-space: nowrap;
}
.sf-input {
  border: 1px solid #e2e5ee;
  border-radius: 8px;
  padding: 7px 11px;
  font-size: 13px;
  min-width: 130px;
  outline: none;
  background: #fff;
  font-family: inherit;
}
.sf-input:focus {
  border-color: #8b5cf6;
}
.btn {
  border: 1px solid #e2e5ee;
  background: #fff;
  color: #4b5163;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
}
.btn.main {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: #fff;
}
.lr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.lr-table th {
  text-align: left;
  background: #f6f7fb;
  color: #4b5163;
  font-weight: 500;
  padding: 10px 12px;
  border-bottom: 1px solid #eceef5;
}
.lr-table td {
  padding: 11px 12px;
  border-bottom: 1px solid #f1f2f8;
  color: #30343f;
}
.lr-table .ops,
.lr-table th.ops {
  text-align: right;
  white-space: nowrap;
}
.lnk {
  color: #7c3aed;
  cursor: pointer;
  margin-left: 10px;
  font-size: 12.5px;
}
.lnk.danger {
  color: #e11d48;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 12.5px;
  color: #8b91a5;
}
.pages .pg {
  display: inline-block;
  min-width: 26px;
  text-align: center;
  padding: 3px 6px;
  border-radius: 6px;
  margin-left: 4px;
  cursor: pointer;
  color: #4b5163;
}
.pages .pg.on {
  background: #8b5cf6;
  color: #fff;
}
</style>
