<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { clearByok, loadByok, saveByok } from '../composables/useByok'
import { verifyKey } from '../api/llm'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [v: boolean] }>()

const baseUrl = ref('')
const apiKey = ref('')
const model = ref('')
const verifying = ref(false)
const verifyResult = ref<'' | 'ok' | 'fail'>('')
const verifyMsg = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    verifyResult.value = ''
    verifyMsg.value = ''
    const cfg = loadByok()
    baseUrl.value = cfg?.baseUrl ?? ''
    apiKey.value = cfg?.apiKey ?? ''
    model.value = cfg?.model ?? ''
  },
)

function save() {
  if (!apiKey.value.trim()) {
    ElMessage.warning('API Key 不能为空')
    return
  }
  saveByok({ baseUrl: baseUrl.value.trim(), apiKey: apiKey.value.trim(), model: model.value.trim() })
  ElMessage.success('已保存到本地浏览器')
  emit('update:open', false)
}

function remove() {
  clearByok()
  baseUrl.value = ''
  apiKey.value = ''
  model.value = ''
  ElMessage.success('已清除本地 Key')
}

async function verify() {
  if (!apiKey.value.trim()) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  verifying.value = true
  verifyResult.value = ''
  const r = await verifyKey({
    baseUrl: baseUrl.value.trim(),
    apiKey: apiKey.value.trim(),
    model: model.value.trim(),
  })
  verifying.value = false
  verifyResult.value = r.ok ? 'ok' : 'fail'
  verifyMsg.value = r.ok ? `验证通过${r.model ? `（服务模型：${r.model}）` : ''}` : r.error ?? '验证失败'
}
</script>

<template>
  <el-drawer
    :model-value="open"
    title="使用自己的 API Key（BYOK）"
    size="380px"
    @update:model-value="emit('update:open', $event)"
  >
    <div class="form">
      <p class="desc">
        不填时使用本站内置额度。填写你自己的 Key 后，请求将通过本站中转直接转发到你指定的模型服务，
        <strong>Key 只保存在你当前浏览器（localStorage），本站不留存、不记录</strong>。
      </p>

      <label class="label">Base URL</label>
      <input v-model="baseUrl" class="ipt" placeholder="默认智谱开放平台，可留空" spellcheck="false" />

      <label class="label">API Key <span class="req">*</span></label>
      <input v-model="apiKey" class="ipt" type="password" placeholder="粘贴你的 API Key" spellcheck="false" />

      <label class="label">模型</label>
      <input v-model="model" class="ipt" placeholder="如 glm-4-flash / deepseek-chat，可留空" spellcheck="false" />

      <div v-if="verifyResult" class="verify" :class="verifyResult">
        {{ verifyResult === 'ok' ? '✓ ' : '✗ ' }}{{ verifyMsg }}
      </div>

      <div class="actions">
        <button type="button" class="btn" :disabled="verifying" @click="verify">
          {{ verifying ? '验证中…' : '验证' }}
        </button>
        <button type="button" class="btn" @click="remove">清除</button>
        <button type="button" class="btn primary" @click="save">保存</button>
      </div>

      <p class="hint">清空浏览器数据或手动「清除」即可删除。内置额度被限流时，自带 Key 不受影响。</p>
    </div>
  </el-drawer>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.desc {
  margin: 0 0 6px;
  color: #909399;
  line-height: 1.7;
  font-size: 12.5px;
}
.label {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
}
.req {
  color: #f56c6c;
}
.ipt {
  border: 1px solid #dcdfe6;
  border-radius: 7px;
  padding: 8px 11px;
  font-size: 13px;
  outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ipt:focus {
  border-color: #409eff;
}
.verify {
  margin-top: 8px;
  padding: 8px 11px;
  border-radius: 7px;
  font-size: 12.5px;
  line-height: 1.6;
  word-break: break-all;
}
.verify.ok {
  color: #67c23a;
  background: #f0f9eb;
}
.verify.fail {
  color: #f56c6c;
  background: #fef0f0;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.btn {
  flex: 1;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
  border-radius: 7px;
  padding: 8px 0;
  font-size: 13px;
  cursor: pointer;
}
.btn.primary {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hint {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: #c0c4cc;
  line-height: 1.6;
}
</style>
