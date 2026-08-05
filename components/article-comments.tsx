import { MessageSquarePlus, Heart, MessageSquare, Bold, Italic, Code } from 'lucide-react'

/**
 * Design: Article Page → "Comment Section" — COLUMN, padding [48,0], gap 32,
 * with a 720px inner column.
 *
 * This is presentational, exactly as designed. Nothing submits anywhere:
 * comment persistence needs the backend work that is out of scope for this
 * phase, and the design itself shows a fixed thread.
 */
const COMMENTS = [
  {
    name: 'Alex Kim',
    time: '2 days ago',
    body: 'Great deep dive! We ran into similar issues with OT at our company. CRDTs solved most of our edge cases but we still struggle with undo/redo semantics. Any tips on handling that with Yjs?',
    likes: '12',
    replies: '2 replies',
  },
  {
    name: 'Maya Rodriguez',
    time: '1 day ago',
    body: 'The architecture diagram is super helpful. One question — how do you handle offline scenarios? Do you buffer operations locally and replay them on reconnect?',
    likes: '8',
    replies: '1 replies',
  },
  {
    name: 'James Torres',
    time: '18 hours ago',
    body: "I've been using Automerge instead of Yjs for a similar project. Would love to see a comparison post — the tradeoffs are quite different especially around memory usage and document size.",
    likes: '5',
    replies: 'Reply',
  },
  {
    name: 'Lisa Park',
    time: '3 hours ago',
    body: 'This is exactly what I needed. Starting a new project with real-time collaboration requirements next month. Bookmarked!',
    likes: '3',
    replies: 'Reply',
  },
]

export function ArticleComments() {
  return (
    <section className="flex flex-col items-center px-4 py-12 md:px-8">
      <div className="flex w-full max-w-[720px] flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-[22px] font-semibold text-text-primary">
            Comments ({COMMENTS.length})
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <MessageSquarePlus size={16} />
            Write a comment
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-bg-card p-5">
          <p className="text-sm font-medium text-text-primary">Sudi David</p>
          <div className="rounded-lg border border-border bg-bg-secondary px-4 py-3">
            <p className="text-sm text-text-tertiary">Share your thoughts on this article...</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 text-text-tertiary">
              <Bold size={16} />
              <Italic size={16} />
              <Code size={16} />
            </div>
            <span className="rounded-md bg-accent px-4 py-2 text-sm text-white opacity-50">
              Post
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          {COMMENTS.map((comment, index) => (
            <article
              key={comment.name}
              className={`flex gap-4 py-6 ${index < COMMENTS.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{comment.name}</span>
                  <span className="text-sm text-text-tertiary">·</span>
                  <span className="text-[13px] text-text-tertiary">{comment.time}</span>
                </div>
                <p className="text-sm leading-[1.6] text-text-secondary">{comment.body}</p>
                <div className="flex items-center gap-4 text-xs text-text-tertiary">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart size={14} />
                    {comment.likes}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare size={14} />
                    {comment.replies}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
