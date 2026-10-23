<script setup lang="ts">
import type { HistoryEntry } from '../composables/useHistory'
import { SCENE_LABEL } from '../data/templates'

defineProps<{ open: boolean; entries: HistoryEntry[] }>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  load: [e: HistoryEntry]
  remove: [id: number]
  clear: []
}>()

function close() {
  emit('update:open', false)
}

function fmt(t: number) {
  const d = new Date(t)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="mask" @click.self="close">
      <div class="drawer">
        <div class="head">
          <h3>历史记录</h3>
          <div class="head-r">
            <button v-if="entries.length" type="button" class="clear" @click="emit('clear')">清空全部</button>
            <button type="button" class="close" @click="close">✕</button>
          </div>
        </div>

        <p v-if="!entries.length" class="empty">暂无历史。生成成功的页面会自动保存在本地浏览器（最多 30 条）。</p>

        <div v-else class="list">
          <div v-for="e in entries" :key="e.id" class="item">
            <div class="item-main" @click="emit('load', e)">
              <div class="item-top">
                <span class="title">{{ e.title }}</span>
                <span class="tag" :class="e.scene">{{ SCENE_LABEL[e.scene] }}</span>
              </div>
              <div class="item-sub">{{ e.prompt.slice(0, 40) }}{{ e.prompt.length > 40 ? '…' : '' }}</div>
              <div class="item-time">{{ fmt(e.time) }}</div>
            </div>
            <button type="button" class="del" title="删除" @click.stop="emit('remove', e.id)">✕</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(23, 20, 40, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  z-index: 2000;
}
.drawer {
  background: #fff;
  width: min(420px, 92vw);
  height: 100%;
  padding: 22px 24px;
  overflow-y: auto;
  box-shadow: -12px 0 40px rgba(40, 30, 80, 0.15);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.head h3 {
  margin: 0;
  font-size: 17px;
  color: #1f2330;
}
.head-r {
  display: flex;
  align-items: center;
  gap: 10px;
}
.clear {
  border: 0;
  background: transparent;
  color: #e11d48;
  font-size: 12.5px;
  cursor: pointer;
}
.close {
  border: 0;
  background: #f4f5fb;
  border-radius: 8px;
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: #6b7186;
}
.empty {
  font-size: 13px;
  color: #8b91a5;
  line-height: 1.8;
  background: #f8f9fc;
  border-radius: 12px;
  padding: 18px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid #eceef5;
  border-radius: 12px;
  padding: 12px 14px;
  transition: border-color 0.15s;
}
.item:hover {
  border-color: #8b5cf6;
}
.item-main {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}
.item-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2330;
}
.tag {
  font-size: 11px;
  border-radius: 999px;
  padding: 1px 8px;
}
.tag.form {
  color: #7c3aed;
  background: #f3e8ff;
}
.tag.list {
  color: #2563eb;
  background: #eff6ff;
}
.tag.detail {
  color: #0d9488;
  background: #f0fdfa;
}
.item-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #8b91a5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-time {
  margin-top: 3px;
  font-size: 11px;
  color: #b0b4c3;
}
.del {
  border: 0;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
}
.del:hover {
  color: #e11d48;
}
</style>
