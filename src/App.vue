<script setup lang="ts">
import { computed, ref } from 'vue'
import ChatPanel from './components/ChatPanel.vue'
import FormRenderer from './components/FormRenderer.vue'
import leaveRaw from '../examples/leave.json?raw'
import repairRaw from '../examples/repair.json?raw'
import supplierRaw from '../examples/supplier.json?raw'
import type { FormSchema } from './types'

const EXAMPLES: Record<string, string> = {
  leave: leaveRaw,
  repair: repairRaw,
  supplier: supplierRaw,
}

const currentSchema = ref<FormSchema | null>(null)
const view = ref<'form' | 'json'>('form')

const schemaJson = computed(() =>
  currentSchema.value ? JSON.stringify(currentSchema.value, null, 2) : '',
)

function loadExample(key: string) {
  const raw = EXAMPLES[key]
  if (!raw) return
  currentSchema.value = JSON.parse(raw) as FormSchema
  view.value = 'form'
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <span class="logo">✦</span>
      <span class="name">AI 表单生成器</span>
      <span class="badge">开发中</span>
    </header>
    <div class="body">
      <ChatPanel @example="loadExample" />
      <main class="canvas">
        <div class="tabs">
          <button
            type="button"
            class="tab"
            :class="{ active: view === 'form' }"
            @click="view = 'form'"
          >
            表单预览
          </button>
          <button
            type="button"
            class="tab"
            :class="{ active: view === 'json' }"
            @click="view = 'json'"
          >
            Schema JSON
          </button>
        </div>
        <div class="stage">
          <div v-if="!currentSchema" class="empty">
            <div class="empty-icon">▦</div>
            <p>点击左侧示例，生成的表单会出现在这里</p>
          </div>
          <FormRenderer v-else-if="view === 'form'" :schema="currentSchema" />
          <pre v-else class="json">{{ schemaJson }}</pre>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 18px;
  border-bottom: 1px solid #e4e7ed;
}
.logo {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #409eff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.name {
  font-weight: 500;
}
.badge {
  font-size: 11px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 999px;
  padding: 2px 9px;
}
.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 375px 1fr;
}
@media (max-width: 880px) {
  .body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(220px, 40%) 1fr;
  }
}
.canvas {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 10px 18px 0;
  border-bottom: 1px solid #e4e7ed;
}
.tab {
  border: 0;
  background: transparent;
  color: #909399;
  padding: 8px 13px 10px;
  font-size: 13.5px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
}
.stage {
  flex: 1;
  overflow-y: auto;
  padding: 22px 26px;
}
.empty {
  height: 100%;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #909399;
}
.empty-icon {
  font-size: 34px;
  opacity: 0.4;
}
.empty p {
  margin: 0;
  font-size: 13px;
}
.json {
  margin: 0;
  padding: 16px 18px;
  border-radius: 10px;
  background: #20232a;
  color: #c9d4e3;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>

<style>
@media (max-width: 880px) {
  .chat {
    border-right: 0 !important;
    border-bottom: 1px solid #e4e7ed;
  }
}
</style>
