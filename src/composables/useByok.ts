import { ref } from 'vue'

export interface ByokConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const STORAGE_KEY = 'aifa-byok'

export function loadByok(): ByokConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as ByokConfig
    if (!cfg.apiKey) return null
    return { baseUrl: cfg.baseUrl || '', apiKey: cfg.apiKey, model: cfg.model || '' }
  } catch {
    return null
  }
}

export function saveByok(cfg: ByokConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function clearByok() {
  localStorage.removeItem(STORAGE_KEY)
}

const byok = ref<ByokConfig | null>(loadByok())

export function useByok() {
  const refresh = () => {
    byok.value = loadByok()
  }
  return { byok, refresh }
}
