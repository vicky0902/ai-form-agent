/** 从 LLM 原始输出中提取 JSON：剥掉 ```json 包裹、截取首尾大括号 */
export function extractJson(text: string): unknown {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  try {
    return JSON.parse(t) as unknown
  } catch (err) {
    throw new Error(`输出不是合法 JSON（${(err as Error).message}）`)
  }
}
