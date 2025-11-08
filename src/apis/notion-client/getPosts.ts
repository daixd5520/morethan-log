import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  const response = await api.getPage(id)
  id = idToUuid(id)
  const collection = Object.values(response.collection)[0]?.value
  const block = response.block
  const schema = collection?.schema

  const rawMetadata = block[id].value

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    return []
  } else {
    // Construct Data
    const pageIds = getAllPageIds(response)

    // Batch processing with concurrency control to avoid Notion API rate limits (429)
    const BATCH_SIZE = 5 // Process 5 pages at a time to respect API limits
    const data = []

    for (let i = 0; i < pageIds.length; i += BATCH_SIZE) {
      const batch = pageIds.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          const properties = (await getPageProperties(id, block, schema)) || null
          // Add fullwidth, createdtime to properties
          properties.createdTime = new Date(
            block[id].value?.created_time
          ).toString()
          properties.fullWidth =
            (block[id].value?.format as any)?.page_full_width ?? false

          return properties
        })
      )
      data.push(...batchResults)

      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < pageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    return posts
  }
}
