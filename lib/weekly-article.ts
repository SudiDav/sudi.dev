import 'server-only'
import { generateCompletion } from './ai-provider'
import { getPosts } from './content'
import type { Post } from './content.types'
import { POST_CATEGORIES } from './filters'
import { createPost, findPostByGeneratedWeek, slugify } from './publish'
import { getSettings } from './site'

const MAX_ARTICLE_WORDS = 1_600
const STYLE_EXAMPLE_COUNT = 3
const STYLE_EXAMPLE_CHARS = 3_000

export function getISOWeekKey(date: Date): string {
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const weekdayFromMonday = (thursday.getUTCDay() + 6) % 7
  thursday.setUTCDate(thursday.getUTCDate() - weekdayFromMonday + 3)
  const isoYear = thursday.getUTCFullYear()
  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4))
  const week = 1 + Math.round((thursday.getTime() - januaryFourth.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function buildWeeklyPrompt(
  settings: Awaited<ReturnType<typeof getSettings>>,
  posts: Post[],
): { system: string; user: string } {
  const published = posts
    .filter((post) => post.status === undefined || post.status === 'Published')
    .sort((a, b) => b.date.localeCompare(a.date))
  const bio = settings.bio.trim()
  const interests = settings.writingProfile.interests.trim() || `Use this author bio to infer relevant interests: ${bio}`
  const styleGuidance = settings.writingProfile.styleGuidance.trim() ||
    `Use the author's background and published examples to guide the voice. Author bio: ${bio}`
  const titles = published.slice(0, 10).map((post) => `- ${post.title}`).join('\n') || 'No recent published titles are available.'
  const examples = published.slice(0, STYLE_EXAMPLE_COUNT)
  const exampleText = examples.length
    ? examples.map((post, index) => `Example ${index + 1}: ${post.title}\n${post.body.slice(0, STYLE_EXAMPLE_CHARS)}`).join('\n\n')
    : 'No published examples are available; follow the writing guidance and author bio.'

  return {
    system: [
      'You are helping draft an article for the site owner. Return only a valid JSON object with exactly these string fields: title, excerpt, category, body.',
      `The category must be exactly one of: ${POST_CATEGORIES.join(', ')}.`,
      `Keep the body at or below ${MAX_ARTICLE_WORDS} words and write the body as clean MDX.`,
      'Do not invent citations, quotations, statistics, or sources. Do not claim the article was researched or fact-checked.',
      'The result is an unpublished draft for the owner to review.',
    ].join(' '),
    user: [
      `Author interests and topics:\n${interests}`,
      `Writing style guidance:\n${styleGuidance}`,
      `Recent published titles to avoid repeating:\n${titles}`,
      `Recent published writing examples (for style only):\n${exampleText}`,
      'Suggest and write one original, complete article that fits the author’s interests and demonstrated expertise. Return JSON only.',
    ].join('\n\n'),
  }
}

export type GeneratedArticle = {
  title: string
  excerpt: string
  category: string
  body: string
}

export function parseGeneratedArticle(raw: string): GeneratedArticle {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('AI response must be valid JSON.')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI response must be a JSON object.')
  }

  const article = value as Record<string, unknown>
  const allowed = ['title', 'excerpt', 'category', 'body']
  const unexpected = Object.keys(article).filter((key) => !allowed.includes(key))
  if (unexpected.length) throw new Error(`AI response contains unexpected fields: ${unexpected.join(', ')}.`)
  for (const field of allowed) {
    if (typeof article[field] !== 'string' || !article[field].trim()) {
      throw new Error(`AI response requires a non-empty ${field}.`)
    }
  }
  if (!POST_CATEGORIES.includes(article.category as (typeof POST_CATEGORIES)[number])) {
    throw new Error(`AI response category must be one of: ${POST_CATEGORIES.join(', ')}.`)
  }

  const body = (article.body as string).trim()
  const words = body.split(/\s+/).filter(Boolean).length
  if (words > MAX_ARTICLE_WORDS) {
    throw new Error(`AI response body exceeds the ${MAX_ARTICLE_WORDS.toLocaleString()} word limit.`)
  }
  return {
    title: (article.title as string).trim(),
    excerpt: (article.excerpt as string).trim(),
    category: article.category as string,
    body,
  }
}

export async function generateWeeklyArticleDraft(
  now = new Date(),
): Promise<{ post: Post; created: boolean }> {
  const week = getISOWeekKey(now)
  const existing = await findPostByGeneratedWeek(week)
  if (existing) return { post: existing, created: false }

  const [settings, posts] = await Promise.all([getSettings(), getPosts()])
  const { system, user } = buildWeeklyPrompt(settings, posts)
  const generated = parseGeneratedArticle(await generateCompletion({ system, user, maxOutputTokens: 3_500 }))
  const wordCount = generated.body.split(/\s+/).filter(Boolean).length
  const slug = `weekly-${week.toLowerCase()}-${slugify(generated.title)}`
  const draft = {
    title: generated.title,
    excerpt: generated.excerpt,
    date: now.toISOString().slice(0, 10),
    readingTime: `${Math.max(1, Math.round(wordCount / 200))} min read`,
    category: generated.category,
    cover: '/images/sudi.jpeg',
    featured: false,
    status: 'Draft' as const,
    generatedWeek: week,
    body: generated.body,
  }

  try {
    const result = await createPost(slug, draft, `content: generate weekly article draft ${week}`)
    return { post: result.post ?? ({ ...draft, slug } as Post), created: true }
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new Error(`Weekly article slug collision for ${slug}; no existing post was overwritten.`)
    }
    throw error
  }
}
