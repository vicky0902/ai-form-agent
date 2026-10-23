import { ref } from 'vue'
import type { AnySchema } from '../types'

const KEY = 'aifa-history'
const CAP = 30

export interface HistoryEntry {
  id: number
  time: number
  title: string
  scene: 'form' | 'list' | 'detail'
  prompt: string
  schema: AnySchema
}

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(arr) ? arr.slice(0, CAP) : []
  } catch {
    return []
  }
}

const entries = ref<HistoryEntry[]>(load())

export function useHistory() {
  function add(title: string, scene: 'form' | 'list' | 'detail', prompt: string, schema: AnySchema) {
    entries.value = [
      { id: Date.now(), time: Date.now(), title, scene, prompt, schema },
      ...entries.value,
    ].slice(0, CAP)
    persist()
  }
  function remove(id: number) {
    entries.value = entries.value.filter((e) => e.id !== id)
    persist()
  }
  function clear() {
    entries.value = []
    persist()
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries.value))
    } catch {}
  }
  return { entries, add, remove, clear }
}
