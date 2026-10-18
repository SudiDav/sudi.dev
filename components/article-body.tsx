import { Copy } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { isExternal } from '@/components/outbound-link'
import { validateArticleBody } from '@/lib/article-safety'
import { highlight } from '@/lib/highlight'

/**
 * Design: "Article Body" — COLUMN, padding [48,360], gap 28. Paragraphs are
 * Inter 17/1.8 in $text-secondary, H2s are Geist 28/700 in $text-primary, and
 * the blockquote is italic with a 3px left border in $accent.
 */
const mdxComponents = {
  h2: (props: React.ComponentProps<'h2'>) => (
    <h2 className="font-display text-[28px] font-bold text-text-primary" {...props} />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3 className="font-display text-[22px] font-semibold text-text-primary" {...props} />
  ),
  p: (props: React.ComponentProps<'p'>) => (
    <p className="text-[17px] leading-[1.8] text-text-secondary" {...props} />
  ),
  blockquote: (props: React.ComponentProps<'blockquote'>) => (
    <blockquote
      className="border-l-[3px] border-accent pl-5 text-[17px] leading-[1.8] text-text-secondary italic"
      {...props}
    />
  ),
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul className="list-disc pl-6 text-[17px] leading-[1.8] text-text-secondary" {...props} />
  ),
  a: ({ href = '', ...props }: React.ComponentProps<'a'>) => (
    // Migrated posts link out to docs and downloads; those should not replace
    // the article the reader is in the middle of.
    <a
      href={href}
      className="text-accent underline underline-offset-2"
      {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  ),
  pre: ({ children }: React.ComponentProps<'pre'>) => {
    // Design: "Code Block" — padding 24, gap 2, a header row carrying the
    // language in Geist Mono 11/600 plus a copy icon, then one text node per
    // line at Geist Mono 13/1.6.
    //
    // Tokens are coloured by Shiki through the --code-* variables in
    // globals.css, so the palette is the site's own rather than a stock theme.
    const child = children as React.ReactElement<{ className?: string; children?: string }>
    const language = child?.props?.className?.replace('language-', '') ?? ''
    const lines = highlight(String(child?.props?.children ?? '').replace(/\n$/, ''), language)

    return (
      <div className="flex flex-col rounded-lg border border-border bg-bg-card p-6">
        <div className="flex items-center justify-between pb-3">
          <span className="font-mono text-[11px] font-semibold text-text-tertiary">{language}</span>
          <Copy size={14} className="text-text-tertiary" />
        </div>
        <div className="flex flex-col gap-0.5 overflow-x-auto">
          {lines.map((tokens, index) => (
            <span key={index} className="font-mono text-[13px] leading-[1.6] whitespace-pre text-[var(--code-foreground)]">
              {tokens.length === 0
                ? ' '
                : tokens.map((token, i) => (
                    <span key={i} style={token.color ? { color: token.color } : undefined}>
                      {token.content}
                    </span>
                  ))}
            </span>
          ))}
        </div>
      </div>
    )
  },
  code: (props: React.ComponentProps<'code'>) => <code className="font-mono" {...props} />,
}

export function ArticleBody({ body }: { body: string }) {
  validateArticleBody(body)
  return <MDXRemote source={body} components={mdxComponents} />
}
