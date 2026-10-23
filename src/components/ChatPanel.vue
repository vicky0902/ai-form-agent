<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ChatItem } from '../composables/useChat'

const props = defineProps<{ items: ChatItem[]; generating: boolean }>()
const emit = defineEmits<{ send: [text: string]; stop: [] }>()

const rootEl = ref<HTMLElement | null>(null)

async function copyRaw(raw?: string) {
  if (!raw) return
  try {
    await navigator.clipboard.writeText(raw)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

const input = ref('')
const listEl = ref<HTMLElement | null>(null)

const PRESETS: { key: string; label: string; text: string }[] = [
  {
    key: 'leave',
    label: '请假申请表单',
    text: '做一个员工请假申请表单：姓名、所属部门（级联：研发部/市场部含子组）、请假类型（下拉：年假/事假/病假/调休）、直属领导（下拉）、起止日期（区间）、请假天数（数字，单位天）、请假事由（多行）、证明附件（上传最多3个）。字段多于 8 个要分组。',
  },
  {
    key: 'repair',
    label: '设备报修工单',
    text: '生成一个设备报修工单表单：设备编号、故障类型（下拉：硬件/软件/网络/其他）、故障等级（单选：一般/紧急/危急）、报修人、现场照片（上传最多3张）、故障描述（多行）。',
  },
  {
    key: 'supplier',
    label: '供应商入驻',
    text: '生成供应商入驻申请表单：公司名称、统一社会信用代码、所属行业（级联）、公司规模（下拉）、经营范围（多选）、资质证书（上传）、联系人、联系电话、邮箱、发票类型（单选）。需要分组展示。',
  },
]

function doSend(text?: string) {
  const value = (text ?? input.value).trim()
  if (props.generating || !value) return
  emit('send', value)
  input.value = ''
}

watch(
  () => props.items.map((i) => i.raw).join(''),
  async () => {
    await nextTick()
    // 代码块内容流式增长时跟随滚动到底部；仅滚动正在生成的那一块，已完成的保持用户视角
    if (rootEl.value && props.generating) {
      const codes = rootEl.value.querySelectorAll('pre.code')
      const last = codes[codes.length - 1] as HTMLElement | undefined
      if (last) last.scrollTop = last.scrollHeight
    }
    listEl.value?.scrollTo({ top: listEl.value.scrollHeight })
  },
)
</script>

<template>
  <aside ref="rootEl" class="chat">
    <div ref="listEl" class="msgs">
      <div class="row">
        <span class="ava">AI</span>
        <div class="bubble">
          你好！我是表单生成助手。用一句话描述业务需求，我会流式生成表单配置并实时渲染成可交互的表单。先选一个示例，或直接输入你的需求：
        </div>
      </div>

      <template v-for="item in items" :key="item.id">
        <div v-if="item.role === 'user'" class="row user">
          <span class="ava human">我</span>
          <div class="bubble">{{ item.text }}</div>
        </div>
        <div v-else class="row">
          <span class="ava">AI</span>
          <div class="bubble">
            <template v-if="item.raw">
              <pre class="code">{{ item.raw }}</pre>
              <div class="codebar">
                <button type="button" class="copy" @click="copyRaw(item.raw)">复制 JSON</button>
              </div>
            </template>
            <div class="status" :class="item.status">
              <span v-if="item.status === 'streaming'" class="dot" />{{ item.note }}
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="chips">
      <button
        v-for="p in PRESETS"
        :key="p.key"
        type="button"
        class="chip"
        :disabled="generating"
        @click="doSend(p.text)"
      >
        {{ p.label }}
      </button>
    </div>

    <div class="inputbar">
      <textarea
        v-model="input"
        class="input"
        rows="2"
        maxlength="500"
        placeholder="描述你要的表单，Enter 发送，Shift+Enter 换行"
        @keydown.enter.exact.prevent="doSend()"
      />
      <div class="actions">
        <span class="tip">输入将发送至第三方大模型服务处理，请勿输入敏感信息</span>
        <button v-if="!generating" type="button" class="send" :disabled="!input.trim()" @click="doSend()">
          发送
        </button>
        <button v-else type="button" class="send stop" @click="emit('stop')">停止</button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  background: #f6f7f9;
  border-right: 1px solid #e4e7ed;
  min-height: 0;
}
.msgs {
  flex: 1;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  min-height: 0;
}
.row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.ava {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ava.human {
  background: #a8abb2;
}
.bubble {
  max-width: 84%;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 9px 12px;
  line-height: 1.6;
  overflow-wrap: break-word;
}
.code {
  margin: 2px 0 4px;
  padding: 9px 11px;
  border-radius: 8px;
  background: #20232a;
  color: #c9d4e3;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.6;
  max-height: 150px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.codebar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}
.copy {
  border: 0;
  background: transparent;
  color: #909399;
  font-size: 11.5px;
  cursor: pointer;
  padding: 2px 4px;
}
.copy:hover {
  color: #409eff;
}
.status {
  font-size: 12.5px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 6px;
}
.status.ok {
  color: #67c23a;
}
.status.fail,
.status.aborted {
  color: #f56c6c;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #409eff;
  animation: blink 1s infinite;
}
@keyframes blink {
  50% {
    opacity: 0.2;
  }
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px 0;
  border-top: 1px solid #e4e7ed;
}
.chip {
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #303133;
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 13px;
  cursor: pointer;
}
.chip:hover:not(:disabled) {
  border-color: #409eff;
  color: #409eff;
}
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.inputbar {
  padding: 10px 14px 12px;
}
.input {
  width: 100%;
  resize: none;
  border: 1px solid #dcdfe6;
  border-radius: 9px;
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
}
.input:focus {
  border-color: #409eff;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}
.tip {
  font-size: 11px;
  color: #c0c4cc;
}
.send {
  border: 0;
  border-radius: 9px;
  padding: 8px 18px;
  background: #409eff;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.send.stop {
  background: #f56c6c;
}
</style>
