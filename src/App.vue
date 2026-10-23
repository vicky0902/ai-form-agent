<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import PromptCard from './components/PromptCard.vue'
import FormRenderer from './components/FormRenderer.vue'
import ListRenderer from './components/ListRenderer.vue'
import DetailRenderer from './components/DetailRenderer.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import TemplateDialog from './components/TemplateDialog.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import { useHistory } from './composables/useHistory'
import { useChat } from './composables/useChat'

const view = ref<'preview' | 'json'>('preview')
const settingsOpen = ref(false)
const templateOpen = ref(false)
const historyOpen = ref(false)
const streamEl = ref<HTMLElement | null>(null)

const history = useHistory()
const chat = useChat({
  onSchema: (schema, prompt) => {
    currentSchema.value = schema
    view.value = 'preview'
    const pt = schema.pageType ?? 'form'
    const title = 'formTitle' in schema ? schema.formTitle : schema.pageTitle
    history.add(title, pt, prompt, schema)
  },
})
const { items, generating, currentSchema, send, stop, reset, loadSchema } = chat
const formSchema = computed(() =>
  currentSchema.value && pageType.value === 'form'
    ? (currentSchema.value as unknown as import('./types').FormSchema)
    : null,
)

const pageType = computed(() => (currentSchema.value?.pageType ?? 'form') as 'form' | 'list' | 'detail')
const failed = computed(() => lastItem.value?.status === 'fail')
const lastItem = computed(() => items.value[items.value.length - 1])

const statusPill = computed(() => {
  if (generating.value) return { text: '生成中…', cls: 'run' }
  if (failed.value) return { text: '生成失败', cls: 'err' }
  const s = currentSchema.value
  if (!s) return null
  if (pageType.value === 'list') {
    const n = (s as { columns?: unknown[] }).columns?.length ?? 0
    return { text: `已生成 ${n} 列表格`, cls: 'ok' }
  }
  if (pageType.value === 'detail') {
    const n = (s as { groups?: unknown[] }).groups?.length ?? 0
    return { text: `已生成 ${n} 个分组`, cls: 'ok' }
  }
  return { text: `已生成 ${(s as { fields?: unknown[] }).fields?.length ?? 0} 个字段`, cls: 'ok' }
})

const tabLabel = computed(() => (pageType.value === 'form' ? '表单预览' : '页面预览'))

const schemaJson = computed(() =>
  currentSchema.value ? JSON.stringify(currentSchema.value, null, 2) : '',
)

function onTemplate(t: import('./data/templates').Template) {
  send(t.prompt)
}

function loadFromHistory(e: (typeof history.entries.value)[number]) {
  if (generating.value) return
  loadSchema(e.schema)
  view.value = 'preview'
  historyOpen.value = false
  ElMessage.success(`已加载「${e.title}」，可继续用自然语言修改`)
}

function copyJson() {
  const text = currentSchema.value
    ? JSON.stringify(currentSchema.value, null, 2)
    : (lastItem.value?.raw ?? '')
  if (!text) return
  navigator.clipboard
    .writeText(text)
    .then(() => ElMessage.success('已复制到剪贴板'))
    .catch(() => ElMessage.error('复制失败'))
}

// 流式代码面板自动滚动到底部
watch(
  () => items.value.map((i) => i.raw).join(''),
  async () => {
    await nextTick()
    if (streamEl.value) streamEl.value.scrollTop = streamEl.value.scrollHeight
  },
)
</script>

<template>
  <div class="page">
    <header class="nav-wrap">
      <div class="nav">
        <div class="brand">
          <span class="logo">✦</span>
          <span class="brand-name">AI 表单</span>
        </div>
        <nav class="links">
          <a class="active" href="#" @click.prevent>首页</a>
          <a href="#" @click.prevent="templateOpen = true">模板库</a>
          <a href="#" @click.prevent="historyOpen = true">历史记录</a>
        </nav>
        <button type="button" class="avatar" title="设置（BYOK）" @click="settingsOpen = true">我</button>
      </div>
    </header>

    <section class="hero">
      <span class="hero-badge">AI 驱动 · 智能生成</span>
      <h1>用一句话，生成你的智能表单</h1>
      <p class="hero-sub">描述你的需求，AI 自动补全字段、校验规则与排版；支持表单、列表页、详情页三种场景，几分钟搭好一份专业页面。</p>
    </section>

    <main class="cards">
      <PromptCard
        :generating="generating"
        :has-schema="!!currentSchema"
        @send="(t: string, img?: string) => send(t, img)"
        @stop="stop"
        @reset="reset"
      />

      <section class="card result">
        <div class="res-head">
          <div class="res-title">
            AI 生成结果
            <span v-if="statusPill" class="pill" :class="statusPill.cls">{{ statusPill.text }}</span>
          </div>
          <a class="res-copy" href="#" @click.prevent="copyJson">复制 JSON</a>
        </div>

        <div class="res-body">
          <!-- 空态 -->
          <div v-if="!lastItem && !generating" class="empty">
            <div class="art" aria-hidden="true" />
            <p>生成结果会出现在这里，支持表单、列表页、详情页</p>
          </div>

          <!-- 流式中 -->
          <template v-if="generating">
            <pre ref="streamEl" class="stream-code">{{ lastItem?.raw || '// 正在连接模型…' }}</pre>
            <div class="note run"><span class="dot" />{{ lastItem?.note || '正在生成…' }}</div>
          </template>

          <!-- 失败 -->
          <template v-else-if="failed">
            <div class="note err">{{ lastItem?.note }}</div>
            <details v-if="lastItem?.raw" class="raw">
              <summary>查看模型原始输出</summary>
              <pre class="stream-code">{{ lastItem.raw }}</pre>
            </details>
          </template>

          <!-- 成功 -->
          <template v-else-if="currentSchema">
            <div class="tabs">
              <button
                type="button"
                class="tab"
                :class="{ active: view === 'preview' }"
                @click="view = 'preview'"
              >
                {{ tabLabel }}
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
            <ListRenderer v-if="pageType === 'list'" :schema="currentSchema as unknown as import('./types').ListSchema" />
            <DetailRenderer v-else-if="pageType === 'detail'" :schema="currentSchema as unknown as import('./types').DetailSchema" />
            <FormRenderer v-else-if="view === 'preview'" :schema="formSchema" />
            <pre v-else class="json">{{ schemaJson }}</pre>
          </template>
        </div>
      </section>
    </main>

    <TemplateDialog v-model:open="templateOpen" @select="onTemplate" />
    <HistoryDrawer
      v-model:open="historyOpen"
      :entries="history.entries.value"
      @load="loadFromHistory"
      @remove="history.remove"
      @clear="history.clear"
    />
    <SettingsDrawer v-model:open="settingsOpen" />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(60% 50% at 8% 0%, rgba(251, 207, 232, 0.55), transparent 60%),
    radial-gradient(55% 45% at 92% 8%, rgba(199, 210, 254, 0.6), transparent 60%),
    radial-gradient(45% 40% at 55% 100%, rgba(254, 243, 199, 0.5), transparent 60%),
    linear-gradient(180deg, #fdfbff 0%, #f6f7fc 100%);
  padding: 20px clamp(16px, 4vw, 56px) 48px;
}

/* 顶部导航 */
.nav-wrap {
  max-width: 1280px;
  margin: 0 auto;
}
.nav {
  display: flex;
  align-items: center;
  gap: 28px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  padding: 14px 22px;
  box-shadow: 0 8px 30px rgba(80, 60, 140, 0.07);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: linear-gradient(135deg, #f472b6, #8b5cf6);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);
}
.brand-name {
  font-weight: 700;
  font-size: 16px;
  color: #1f2330;
}
.links {
  margin-left: auto;
  display: flex;
  gap: 26px;
}
.links a {
  color: #6b7186;
  font-size: 14px;
  text-decoration: none;
}
.links a.active {
  color: #1f2330;
  font-weight: 600;
}
.links a:hover {
  color: #8b5cf6;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  cursor: pointer;
  background: linear-gradient(135deg, #f472b6, #818cf8);
  color: #fff;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(244, 114, 182, 0.35);
}

/* Hero */
.hero {
  max-width: 1280px;
  margin: 0 auto;
  padding: 44px 6px 30px;
}
.hero-badge {
  display: inline-block;
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12.5px;
}
.hero h1 {
  margin: 16px 0 12px;
  font-size: clamp(26px, 4vw, 40px);
  font-weight: 700;
  color: #16181f;
  letter-spacing: 0.5px;
}
.hero-sub {
  margin: 0;
  color: #5b6172;
  font-size: 15px;
}

/* 双卡片 */
.cards {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 26px;
  align-items: start;
}
.card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(80, 60, 140, 0.08);
}
@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr;
  }
  /* 移动端导航改两行：品牌+头像一行，功能链接一行（入口全保留，与 PC 功能一致） */
  .nav {
    flex-wrap: wrap;
    row-gap: 6px;
    padding: 12px 16px;
  }
  .links {
    display: flex;
    order: 3;
    width: 100%;
    margin-left: 0;
    gap: 22px;
  }
  .avatar {
    margin-left: auto;
  }
}

/* 结果卡 */
.result {
  padding: 22px 26px;
  min-height: 420px;
  display: flex;
  flex-direction: column;
}
.res-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.res-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2330;
  display: flex;
  align-items: center;
  gap: 10px;
}
.pill {
  font-size: 11.5px;
  border-radius: 999px;
  padding: 3px 10px;
  font-weight: 400;
}
.pill.ok {
  color: #059669;
  background: #ecfdf5;
}
.pill.run {
  color: #7c3aed;
  background: #f3e8ff;
}
.pill.err {
  color: #dc2626;
  background: #fef2f2;
}
.res-copy {
  font-size: 13px;
  color: #6b7186;
  text-decoration: none;
}
.res-copy:hover {
  color: #8b5cf6;
}
.res-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 空态装饰 */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #8b91a5;
  min-height: 320px;
}
.empty p {
  margin: 0;
  font-size: 13.5px;
}
.art {
  width: min(420px, 90%);
  height: 180px;
  border-radius: 16px;
  background:
    radial-gradient(38% 55% at 22% 40%, rgba(244, 114, 182, 0.5), transparent 70%),
    radial-gradient(40% 60% at 55% 30%, rgba(167, 139, 250, 0.5), transparent 70%),
    radial-gradient(35% 50% at 80% 65%, rgba(129, 140, 248, 0.45), transparent 70%),
    radial-gradient(30% 45% at 40% 80%, rgba(94, 234, 212, 0.4), transparent 70%),
    linear-gradient(135deg, #fdf4ff, #eef2ff);
}

/* 流式面板 */
.stream-code {
  margin: 0 0 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #1c1f2b;
  color: #c9d4e3;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
  max-height: 260px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.note {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.note.run {
  color: #7c3aed;
}
.note.err {
  color: #dc2626;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8b5cf6;
  animation: blink 1s infinite;
}
@keyframes blink {
  50% {
    opacity: 0.2;
  }
}
.raw {
  margin-top: 10px;
  font-size: 12.5px;
  color: #6b7186;
}
.raw summary {
  cursor: pointer;
}

/* 页签与表单 */
.tabs {
  display: flex;
  gap: 18px;
  margin-bottom: 16px;
}
.tab {
  border: 0;
  background: transparent;
  color: #8b91a5;
  font-size: 13.5px;
  padding: 4px 2px 8px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: #8b5cf6;
  border-bottom-color: #8b5cf6;
  font-weight: 500;
}
.json {
  margin: 0;
  padding: 16px 18px;
  border-radius: 14px;
  background: #1c1f2b;
  color: #c9d4e3;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
