import type { Post } from './content.types'
import { parseMarkdown } from './markdown'
import { SITE_URL } from './site'

const UNSUBSCRIBE_TOKEN = '{{{RESEND_UNSUBSCRIBE_URL}}}'
const ARTICLE_FONT = "Georgia,'Times New Roman',serif"
const UI_FONT = 'Arial,Helvetica,sans-serif'
const LINK_STYLE = 'color:#345890;text-decoration:underline'
const IMAGE_STYLE = 'display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:8px'
const HEADING_STYLE = `margin:30px 0 10px;color:#17233b;font:700 25px/1.25 ${UI_FONT}`
const ARTICLE_STYLES = new Map([
  ['p', 'margin:0 0 18px'],
  ['h1', HEADING_STYLE],
  ['h2', HEADING_STYLE],
  ['h3', `margin:24px 0 8px;color:#17233b;font:700 20px/1.35 ${UI_FONT}`],
  ['h4', `margin:20px 0 8px;color:#17233b;font:700 17px/1.35 ${UI_FONT}`],
  ['h5', 'margin:18px 0 6px'],
  ['h6', 'margin:18px 0 6px'],
  ['blockquote', 'margin:18px 0;padding:4px 0 4px 16px;border-left:3px solid #91a8cf;color:#40516b'],
  ['ul', 'margin:0 0 18px;padding-left:23px'],
  ['ol', 'margin:0 0 18px;padding-left:23px'],
  ['li', 'margin:0 0 6px'],
  ['strong', ''],
  ['em', ''],
  ['code', 'font-family:Consolas,Menlo,monospace;font-size:.84em'],
  ['pre', 'margin:0 0 20px;padding:14px 16px;background:#f1f5fa;color:#24344b;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word'],
])

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '{': '&#123;', '}': '&#125;',
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"'{}]/g, (character) => HTML_ENTITIES[character])
}

function protectPlainText(value: string) {
  // Split literal delimiters so Resend does not expand them in code examples.
  return value.replace(/\{\{(?=\{)/g, '{{\u2060')
}

function emailUrl(value: unknown, base: string, allowMailto = false) {
  if (typeof value !== 'string' || !value.trim()) return
  try {
    const url = new URL(value, base)
    if (url.protocol === 'https:' || url.protocol === 'http:' || (allowMailto && url.protocol === 'mailto:')) {
      return escapeHtml(url.href)
    }
  } catch {
    // Keep the label when an old article points to an invalid address.
  }
}

function articleImage(src: string, alt: string) {
  return `<img src="${src}" alt="${escapeHtml(alt)}" width="592" style="${IMAGE_STYLE}">`
}

type ArticleNode = ReturnType<typeof parseMarkdown>['children'][number]

function renderArticleNode(node: ArticleNode, postUrl: string): string {
  if (node.type === 'text') return escapeHtml(node.value)
  if (node.type !== 'element') return ''

  const { tagName, properties, children } = node
  if (tagName === 'img') {
    const src = emailUrl(properties.src, postUrl)
    const alt = String(properties.alt ?? '')
    return src ? articleImage(src, alt) : escapeHtml(alt)
  }
  if (tagName === 'br') return '<br>'
  if (tagName === 'hr') return '<hr style="margin:24px 0;border:0;border-top:1px solid #dce4ef">'

  const content = children.map((child) => renderArticleNode(child, postUrl)).join('')
  if (tagName === 'a') {
    const href = emailUrl(properties.href === '#newsletter' ? '/blog' : properties.href, postUrl, true)
    return href ? `<a href="${href}" style="${LINK_STYLE}">${content}</a>` : content
  }

  const style = ARTICLE_STYLES.get(tagName)
  if (style === undefined) return content
  const start = tagName === 'ol' && typeof properties.start === 'number' ? ` start="${properties.start}"` : ''
  return `<${tagName}${start}${style ? ` style="${style}"` : ''}>${content}</${tagName}>`
}

export function renderPostEmail(post: Post) {
  const canonical = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`
  const url = escapeHtml(canonical)
  const title = escapeHtml(post.title)
  const excerpt = post.excerpt ? `<p style="margin:16px 0 0;color:#52617a;font:18px/1.6 ${ARTICLE_FONT}">${escapeHtml(post.excerpt)}</p>` : ''
  const category = escapeHtml(post.category)
  const cover = emailUrl(post.cover, canonical)
  const article = parseMarkdown(post.body).children.map((node) => renderArticleNode(node, canonical)).join('')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body bgcolor="#ffffff" style="margin:0;background-color:#ffffff;color:#26364a;font-family:${UI_FONT};color-scheme:light">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff">
    <tr><td align="center" style="padding:0 14px">
      <table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:624px;table-layout:fixed;margin:0 auto">
        <tr><td align="left" style="padding:26px 16px 18px;border-bottom:1px solid #dce4ef">
          <a href="${SITE_URL}" style="color:#345890;text-decoration:none;font:700 16px/34px ${UI_FONT}">
            <img src="${SITE_URL}/icon.png" alt="" width="34" height="34" style="border:0;border-radius:8px;vertical-align:middle;margin-right:9px">sudi.dev
          </a>
        </td></tr>
        <tr><td align="left" style="padding:25px 16px 20px">
          ${category ? `<p style="margin:0 0 10px;color:#345890;font:700 13px/1.4 ${UI_FONT}">${category}</p>` : ''}
          <h1 style="margin:0;color:#17233b;font:700 34px/1.16 ${ARTICLE_FONT};overflow-wrap:anywhere">${title}</h1>
          ${excerpt}
        </td></tr>
        ${cover ? `<tr><td align="left" style="padding:0 16px 14px">${articleImage(cover, '')}</td></tr>` : ''}
        <tr><td align="left" style="padding:0 16px;color:#26364a;font:17px/1.68 ${ARTICLE_FONT};overflow-wrap:anywhere">
          ${article}
        </td></tr>
        <tr><td align="left" style="padding:13px 16px 28px">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td bgcolor="#345890" style="border-radius:6px">
              <a href="${url}" style="display:inline-block;border:1px solid #345890;border-radius:6px;padding:12px 18px;color:#ffffff;text-decoration:none;font:700 15px/1.35 ${UI_FONT}">Read on sudi.dev</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="left" style="padding:17px 16px 30px;border-top:1px solid #dce4ef;color:#52617a;font:13px/1.55 ${UI_FONT}">
          You received this because you subscribed to the sudi.dev newsletter.<br>
          <a href="${UNSUBSCRIBE_TOKEN}" style="${LINK_STYLE}">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const bodyText = [
    'sudi.dev',
    post.title,
    post.excerpt,
    post.body.trim(),
    `Read on sudi.dev: ${canonical}`,
  ].filter(Boolean).join('\n\n')

  return {
    html,
    text: `${protectPlainText(bodyText)}\n\nUnsubscribe: ${UNSUBSCRIBE_TOKEN}`,
    subject: protectPlainText(`New on sudi.dev: ${post.title}`),
    previewText: protectPlainText(post.excerpt),
  }
}
