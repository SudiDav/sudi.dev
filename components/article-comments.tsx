import { GiscusComments } from './giscus-comments'

/**
 * Design: Article Page → "Comment Section" — COLUMN, padding [48,0], gap 32,
 * with a 720px inner column. The design's own thread and form are replaced by
 * the giscus embed; the section framing around it is kept.
 *
 * Renders nothing at all when giscus is unconfigured, so a half-built comment
 * section never ships — see .env.example for the four values it needs.
 */
export function ArticleComments() {
  // Read on the server so an unconfigured section costs nothing on the client.
  // NEXT_PUBLIC_* values must be referenced literally to be inlined at build.
  const configured =
    process.env.NEXT_PUBLIC_GISCUS_REPO &&
    process.env.NEXT_PUBLIC_GISCUS_REPO_ID &&
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY &&
    process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID
  if (!configured) return null

  return (
    <section className="flex flex-col items-center px-4 py-12 md:px-8">
      <div className="flex w-full max-w-[720px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[22px] font-semibold text-text-primary">Comments</h2>
          <p className="text-[13px] leading-[1.6] text-text-secondary">
            Signed in with GitHub. Comments live in this site&apos;s{' '}
            <span className="text-text-primary">Discussions</span>, so you can reply from there too.
          </p>
        </div>
        <GiscusComments />
      </div>
    </section>
  )
}
