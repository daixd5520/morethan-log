import { NextApiRequest, NextApiResponse } from "next"
import { Feed } from "feed"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import { filterPosts } from "src/libs/utils/notion"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get all posts
    const allPosts = await getPosts()
    const posts = filterPosts(allPosts)

    // Create feed instance
    const feed = new Feed({
      title: CONFIG.blog.title,
      description: CONFIG.blog.description,
      id: CONFIG.link,
      link: CONFIG.link,
      language: CONFIG.lang,
      image: `${CONFIG.link}/avatar.svg`,
      favicon: `${CONFIG.link}/favicon.ico`,
      copyright: `All rights reserved ${new Date().getFullYear()}, ${CONFIG.profile.name}`,
      updated: new Date(),
      generator: "Feed for Node.js",
      feedLinks: {
        rss2: `${CONFIG.link}/api/feed`,
        json: `${CONFIG.link}/api/feed?format=json`,
        atom: `${CONFIG.link}/api/feed?format=atom`,
      },
      author: {
        name: CONFIG.profile.name,
        email: CONFIG.profile.email,
        link: CONFIG.link,
      },
    })

    // Add posts to feed
    posts.forEach((post: any) => {
      if (post.status?.[0] === "Published" && post.type?.[0] === "Post") {
        const postUrl = `${CONFIG.link}/${post.slug}`
        feed.addItem({
          title: post.title,
          id: postUrl,
          link: postUrl,
          description: post.summary || post.title,
          content: post.summary || post.title,
          author: [
            {
              name: CONFIG.profile.name,
              email: CONFIG.profile.email,
              link: CONFIG.link,
            },
          ],
          date: new Date(post.date?.start_date || post.createdTime),
          category: post.tags?.map((tag: string) => ({ name: tag })) || [],
        })
      }
    })

    // Return feed based on format query parameter
    const format = req.query.format as string

    if (format === "json") {
      res.setHeader("Content-Type", "application/json")
      res.status(200).send(feed.json1())
    } else if (format === "atom") {
      res.setHeader("Content-Type", "application/atom+xml")
      res.status(200).send(feed.atom1())
    } else {
      // Default to RSS 2.0
      res.setHeader("Content-Type", "application/rss+xml")
      res.status(200).send(feed.rss2())
    }
  } catch (error) {
    console.error("Error generating feed:", error)
    res.status(500).json({ error: "Failed to generate feed" })
  }
}
