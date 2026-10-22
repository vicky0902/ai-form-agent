<script setup lang="ts">
const emit = defineEmits<{ example: [key: string] }>()

const examples = [
  { key: 'leave', label: '请假申请表单' },
  { key: 'repair', label: '设备报修工单' },
  { key: 'supplier', label: '供应商入驻' },
]
</script>

<template>
  <aside class="chat">
    <div class="msgs">
      <div class="row ai">
        <span class="ava">AI</span>
        <div class="bubble">
          你好！我是表单生成助手。用一句话描述业务需求，我会生成表单配置并实时渲染成可交互的表单。
          <span class="note">（当前为静态链路阶段：点示例直接加载本地配置，流式生成在下一阶段接通）</span>
        </div>
      </div>
      <div class="chips">
        <button v-for="e in examples" :key="e.key" type="button" class="chip" @click="emit('example', e.key)">
          {{ e.label }}
        </button>
      </div>
    </div>
    <div class="inputbar">
      <div class="fakeinput">描述你要的表单，例如：做一个请假申请…</div>
      <button type="button" class="send" disabled>发送</button>
      <div class="tip">流式对话将在 Phase D 接通</div>
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
.bubble {
  max-width: 84%;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 9px 12px;
  line-height: 1.6;
}
.note {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  color: #909399;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 34px;
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
.chip:hover {
  border-color: #409eff;
  color: #409eff;
}
.inputbar {
  border-top: 1px solid #e4e7ed;
  padding: 11px 14px 13px;
}
.inputbar > * {
  display: block;
}
.fakeinput {
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 9px;
  padding: 9px 12px;
  font-size: 13px;
  color: #a8abb2;
}
.send {
  display: none;
}
.tip {
  margin-top: 7px;
  font-size: 11.5px;
  color: #909399;
}
</style>
