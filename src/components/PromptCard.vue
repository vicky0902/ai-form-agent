<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ generating: boolean; hasSchema: boolean }>()
const emit = defineEmits<{ send: [text: string, images?: string[]]; stop: []; reset: [] }>()

const input = ref('')
const attachedBands = ref<string[]>([])
const previewThumb = ref<string | null>(null)

/** 压缩到宽 1280 后按 1000px 分段（80px 重叠），每段单独识别以提升小字精度 */
function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    alert('图片不能超过 10MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const bands: string[] = []
      const bandH = 1000
      const overlap = 80
      let y = 0
      while (y < canvas.height) {
        const h = Math.min(bandH, canvas.height - y)
        const c2 = document.createElement('canvas')
        c2.width = canvas.width
        c2.height = h
        c2.getContext('2d')!.drawImage(canvas, 0, -y)
        bands.push(c2.toDataURL('image/jpeg', 0.85))
        if (y + h >= canvas.height) break
        y += h - overlap
      }
      attachedBands.value = bands
      previewThumb.value = bands[0]
    }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  attachedBands.value = []
  previewThumb.value = null
}

const presets = [
  { label: '活动报名', text: '做一个活动报名表单：姓名、手机号、参会日期、参会人数（数字）、饮食偏好（单选：不限/素食/其他）、备注（多行）' },
  { label: '请假申请', text: '做一个员工请假申请表单：姓名、所属部门（级联：研发部/市场部含子组）、请假类型（下拉：年假/事假/病假/调休）、直属领导（下拉）、起止日期（区间）、请假天数（数字，单位天）、请假事由（多行）、证明附件（上传最多3个）。字段多于 8 个要分组。' },
  { label: '设备报修', text: '生成一个设备报修工单表单：设备编号、故障类型（下拉：硬件/软件/网络/其他）、故障等级（单选：一般/紧急/危急）、报修人、现场照片（上传最多3张）、故障描述（多行）。' },
  { label: '供应商入驻', text: '生成供应商入驻申请表单：公司名称、统一社会信用代码、所属行业（级联）、公司规模（下拉）、经营范围（多选）、资质证书（上传）、联系人、联系电话、邮箱、发票类型（单选）。需要分组展示。' },
]

function doSend(text?: string) {
  const value = (text ?? input.value).trim()
  const bands = attachedBands.value.length ? attachedBands.value : undefined
  if (props.generating || (!value && !bands)) return
  emit('send', value || '请根据图片中的表单样式生成配置', bands)
  input.value = ''
  attachedBands.value = []
  previewThumb.value = null
}
</script>

<template>
  <div class="prompt-card">
    <h3 class="card-title">描述你的表单需求</h3>
    <textarea
      v-model="input"
      class="prompt-input"
      rows="5"
      maxlength="500"
      placeholder="例如：帮我生成一份活动报名表，包含姓名、手机号、参会日期、饮食偏好……也可以上传表单截图，按图生成"
      @keydown.enter.exact.prevent="doSend()"
    />

    <div v-if="previewThumb" class="attach-preview">
      <img :src="previewThumb" alt="待识别图片" />
      <button type="button" class="remove" title="移除图片" @click="removeImage">✕</button>
      <span class="attach-hint">
        图片模式：将按图分段识别并生成一份新表单{{ attachedBands.length > 1 ? `（共 ${attachedBands.length} 段）` : '' }}
      </span>
    </div>

    <div class="attach-row">
      <label class="attach-btn">
        📎 添加表单图片
        <input type="file" accept="image/*" hidden @change="onFile" />
      </label>
    </div>

    <div class="chips">
      <button
        v-for="p in presets"
        :key="p.label"
        type="button"
        class="chip"
        :disabled="generating"
        @click="doSend(p.text)"
      >
        {{ p.label }}
      </button>
    </div>

    <button
      v-if="!generating"
      type="button"
      class="cta"
      :disabled="!input.trim() && !attachedBands.length"
      @click="doSend()"
    >
      {{ attachedBands.length ? '按图片生成表单' : 'AI 生成表单' }} <span class="arrow">→</span>
    </button>
    <button v-else type="button" class="cta stop" @click="emit('stop')">停止生成</button>

    <p class="followup" v-if="hasSchema && !generating && !attachedBands.length">
      将基于当前已生成的表单继续修改 ·
      <a class="reset" @click.prevent="emit('reset')" href="#">重新开始</a>
    </p>
    <p class="helper">
      AI 将自动补全字段类型、必填校验与排版样式；输入与图片将发送至第三方大模型服务，请勿输入敏感信息。
    </p>
  </div>
</template>

<style scoped>
.prompt-card {
  background: #fff;
  border-radius: 20px;
  padding: 26px 28px 22px;
  box-shadow: 0 12px 40px rgba(80, 60, 140, 0.08);
  display: flex;
  flex-direction: column;
}
.card-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2330;
}
.prompt-input {
  width: 100%;
  box-sizing: border-box;
  resize: none;
  border: 0;
  outline: none;
  background: #f4f5fb;
  border-radius: 14px;
  padding: 16px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.7;
  color: #303133;
  min-height: 130px;
}
.prompt-input::placeholder {
  color: #b0b4c3;
}
.prompt-input:focus {
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
}
.attach-preview {
  position: relative;
  margin-top: 12px;
}
.attach-preview img {
  max-width: 100%;
  max-height: 150px;
  border-radius: 10px;
  border: 1px solid #e6e8f0;
}
.attach-preview .remove {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  font-size: 11px;
}
.attach-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #7c3aed;
}
.attach-row {
  margin-top: 12px;
}
.attach-btn {
  display: inline-block;
  border: 1px solid #e6e8f0;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12.5px;
  color: #4b5163;
  cursor: pointer;
}
.attach-btn:hover {
  border-color: #8b5cf6;
  color: #8b5cf6;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 20px;
}
.chip {
  border: 1px solid #e6e8f0;
  background: #fff;
  color: #4b5163;
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip:hover:not(:disabled) {
  border-color: #8b5cf6;
  color: #8b5cf6;
}
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cta {
  border: 0;
  border-radius: 999px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(90deg, #f472b6, #a78bfa, #818cf8);
  background-size: 150% 100%;
  transition: background-position 0.3s;
}
.cta:hover:not(:disabled) {
  background-position: 100% 0;
}
.cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cta.stop {
  background: linear-gradient(90deg, #fb7185, #f472b6);
}
.arrow {
  margin-left: 6px;
}
.followup {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: #8b5cf6;
}
.reset {
  color: #94a3b8;
  cursor: pointer;
  margin-left: 2px;
}
.reset:hover {
  color: #f472b6;
}
.helper {
  margin: 10px 0 0;
  font-size: 11.5px;
  color: #b0b4c3;
  line-height: 1.6;
}
</style>
