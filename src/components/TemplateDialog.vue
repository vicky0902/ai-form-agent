<script setup lang="ts">
import { SCENE_LABEL, TEMPLATES, type Template } from '../data/templates'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [v: boolean]; select: [t: Template] }>()

function pick(t: Template) {
  emit('select', t)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}
props
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="mask" @click.self="close">
      <div class="modal">
        <div class="head">
          <h3>模板库</h3>
          <button type="button" class="close" @click="close">✕</button>
        </div>
        <p class="sub">点击模板卡直接生成，生成后可继续用自然语言修改</p>
        <div class="grid">
          <button
            v-for="t in TEMPLATES"
            :key="t.name"
            type="button"
            class="tpl"
            @click="pick(t)"
          >
            <div class="tpl-head">
              <span class="tpl-name">{{ t.name }}</span>
              <span class="tag" :class="t.scene">{{ SCENE_LABEL[t.scene] }}</span>
            </div>
            <p class="tpl-desc">{{ t.desc }}</p>
          </button>
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
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}
.modal {
  background: #fff;
  border-radius: 20px;
  padding: 24px 26px;
  width: min(860px, 100%);
  max-height: 84vh;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(40, 30, 80, 0.25);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.head h3 {
  margin: 0;
  font-size: 17px;
  color: #1f2330;
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
.sub {
  margin: 6px 0 18px;
  font-size: 12.5px;
  color: #8b91a5;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.tpl {
  text-align: left;
  border: 1px solid #eceef5;
  background: #fafbff;
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.tpl:hover {
  border-color: #8b5cf6;
  background: #fff;
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.12);
}
.tpl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tpl-name {
  font-size: 14.5px;
  font-weight: 600;
  color: #1f2330;
}
.tag {
  font-size: 11px;
  border-radius: 999px;
  padding: 2px 9px;
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
.tpl-desc {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: #8b91a5;
  line-height: 1.6;
}
</style>
