import OpenAI from 'openai'

// API 키가 없으면 null 반환 (fallback 동작을 위해)
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

// JSON 파싱 실패에 대비한 안전한 파서
export function safeParseJSON<T>(text: string): T | null {
  try {
    // 코드 블록 제거 후 파싱
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}
