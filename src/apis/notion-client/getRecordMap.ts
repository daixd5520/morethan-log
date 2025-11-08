import { NotionAPI } from "notion-client"

// Retry helper for handling rate limits and transient errors
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLastAttempt = i === retries - 1
      const isRateLimit = error?.response?.statusCode === 429

      if (isLastAttempt) {
        throw error
      }

      // Use exponential backoff for rate limits
      const waitTime = isRateLimit ? delay * Math.pow(2, i) : delay
      console.log(`Retry ${i + 1}/${retries} after ${waitTime}ms due to:`, error.message)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  throw new Error("Should not reach here")
}

export const getRecordMap = async (pageId: string) => {
  return withRetry(async () => {
    const api = new NotionAPI()
    const recordMap = await api.getPage(pageId)
    return recordMap
  })
}
