<script setup lang="ts">
import type { DetailSchema } from '../types'

defineProps<{ schema: DetailSchema }>()

function mockValue(label: string, i: number): string {
  if (/手机|电话|联系/.test(label)) return '138' + String(71000000 + i * 137913).slice(0, 8)
  if (/邮箱/.test(label)) return `user${i + 1}@example.com`
  if (/(日期|时间|日期)/.test(label)) return `2026-10-${String((i % 9) + 14)}`
  if (/金额|价格|预算/.test(label)) return '¥' + ((i + 1) * 3600).toLocaleString()
  if (/状态/.test(label)) return i % 2 === 0 ? '进行中' : '已完成'
  if (/地址|地点/.test(label)) return '上海市浦东新区示例路 88 号'
  if (/附件|材料|照片/.test(label)) return '会议纪要.pdf、预算表.xlsx'
  return `${label}示例内容 ${i + 1}——此处为演示占位文本。`
}
</script>

<template>
  <div class="detail-renderer">
    <div class="dr-head">
      <h2 class="dr-title">{{ schema.pageTitle }}</h2>
      <p v-if="schema.description" class="dr-desc">{{ schema.description }}</p>
    </div>

    <section v-for="(g, gi) in schema.groups" :key="g.title" class="dr-group">
      <h3 class="dr-group-title">{{ g.title }}</h3>
      <div class="dr-grid">
        <div v-for="(item, ii) in g.items" :key="item.label" class="dr-item">
          <span class="dr-label">{{ item.label }}</span>
          <span class="dr-value">{{ mockValue(item.label, gi * 10 + ii) }}</span>
        </div>
      </div>
    </section>

    <div class="dr-actions">
      <button type="button" class="btn main">返回列表</button>
      <button type="button" class="btn">编辑</button>
    </div>
  </div>
</template>

<style scoped>
.detail-renderer {
  max-width: 720px;
}
.dr-head {
  margin-bottom: 18px;
}
.dr-title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: #1f2330;
}
.dr-desc {
  margin: 0;
  font-size: 12.5px;
  color: #8b91a5;
}
.dr-group {
  margin-bottom: 22px;
}
.dr-group-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #7c3aed;
  padding-left: 9px;
  border-left: 3px solid #8b5cf6;
}
.dr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}
@media (max-width: 640px) {
  .dr-grid {
    grid-template-columns: 1fr;
  }
}
.dr-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #f8f9fc;
  border-radius: 10px;
  padding: 10px 14px;
}
.dr-label {
  font-size: 12px;
  color: #8b91a5;
}
.dr-value {
  font-size: 13.5px;
  color: #30343f;
}
.dr-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
.btn {
  border: 1px solid #e2e5ee;
  background: #fff;
  color: #4b5163;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 13px;
  cursor: pointer;
}
.btn.main {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: #fff;
}
</style>
