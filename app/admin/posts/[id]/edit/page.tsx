import Link from 'next/link'
import {
  ArrowLeft,
  Eye,
  Settings,
  Send,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  CodeXml,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  X,
} from 'lucide-react'

/**
 * Design: "Admin — Post Editor" — this frame has NO sidebar. It is its own
 * top bar over a body of an editor column plus a settings sidebar, on #FFFFFF
 * rather than $admin-bg.
 *
 * Presentational: the toolbar and fields render as designed but edit nothing.
 */
const TEXT_FORMAT = [Heading1, Heading2, Heading3, Pilcrow]
const INLINE_FORMAT = [Bold, Italic, Underline, Strikethrough, CodeXml]
const BLOCK_FORMAT = [List, ListOrdered, Quote, Minus]

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-admin-text-secondary">{label}</span>
      {children}
    </div>
  )
}

export default function AdminPostEditorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Editor Top Bar — ROW, padding [12,24], 1px bottom border */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-admin-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg"
          >
            <ArrowLeft size={16} />
            Posts
          </Link>
          <span className="text-xs text-admin-text-tertiary">Draft · Saved 2 min ago</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border px-3.5 py-1.5 text-[13px] text-admin-text-secondary"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border px-3.5 py-1.5 text-[13px] text-admin-text-secondary"
          >
            <Settings size={14} />
            Settings
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[7px] bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            <Send size={14} />
            Publish
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col xl:flex-row">
        <div className="flex flex-1 flex-col">
          {/* Toolbar — ROW, padding [8,24], gap 4, #FAFBFC, 1px bottom border */}
          <div className="flex flex-wrap items-center gap-1 border-b border-admin-border bg-[#FAFBFC] px-6 py-2">
            {[TEXT_FORMAT, INLINE_FORMAT, BLOCK_FORMAT].map((group, groupIndex) => (
              <div key={groupIndex} className="flex items-center gap-0.5">
                {groupIndex > 0 ? <span className="mx-2 h-4 w-px bg-admin-border" /> : null}
                {group.map((Icon, index) => (
                  <span key={index} className="rounded p-1.5 text-admin-text-secondary">
                    <Icon size={18} />
                  </span>
                ))}
              </div>
            ))}
            <span className="ml-auto font-mono text-[11px] text-admin-text-tertiary">
              1,247 words · 6 min read
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-8">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-admin-border py-10 text-center">
              <ImageIcon size={22} className="text-admin-text-tertiary" />
              <span className="text-sm text-admin-text-tertiary">Click to add a cover image</span>
              <span className="text-[11px] text-admin-text-tertiary">
                Recommended: 1200×630px · JPG, PNG, or WebP
              </span>
            </div>

            <h1 className="font-display text-[36px] leading-[1.3] font-bold text-admin-text">
              Event Sourcing in Practice: Lessons from Production
            </h1>
            <p className="text-lg leading-[1.5] text-admin-text-tertiary">
              A pragmatic guide to implementing event sourcing patterns without the usual pitfalls.
            </p>
            <p className="text-base leading-[1.8] text-admin-text">
              Event sourcing is one of those patterns that sounds simple in theory but gets
              complicated fast in production. After running an event-sourced system for two years at
              scale, I want to share the real lessons — not the textbook ones.
            </p>
            <h2 className="font-display text-2xl font-semibold text-admin-text">
              Why Event Sourcing?
            </h2>
            <p className="text-base leading-[1.8] text-admin-text">
              The traditional approach to data storage — mutating rows in place — works fine until
              you need to answer questions like &quot;what did this record look like three weeks
              ago?&quot; or &quot;what sequence of changes led to this state?&quot; Event sourcing
              flips the model: instead of storing current state, you store every change as an
              immutable event.
            </p>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 border-admin-border p-6 xl:w-[320px] xl:border-l">
          <h2 className="font-display text-[15px] font-semibold text-admin-text">Post Settings</h2>

          <SidebarField label="Status">
            <span className="text-[13px] text-admin-warning">Draft</span>
          </SidebarField>

          <SidebarField label="Category">
            <span className="text-[13px] text-admin-text">Engineering</span>
          </SidebarField>

          <SidebarField label="Tags">
            <div className="flex flex-wrap items-center gap-2">
              {['Event Sourcing', 'Architecture'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2.5 py-1 text-[11px] text-accent"
                >
                  {tag}
                  <X size={11} />
                </span>
              ))}
              <span className="text-xs text-admin-text-tertiary">Add tag...</span>
            </div>
          </SidebarField>

          <SidebarField label="Publish Date">
            <span className="text-[13px] text-admin-text">Aug 4, 2026</span>
          </SidebarField>

          <SidebarField label="URL Slug">
            <span className="font-mono text-xs">
              <span className="text-admin-text-tertiary">/blog/</span>
              <span className="text-admin-text">event-sourcing-in-practice</span>
            </span>
          </SidebarField>

          <div className="flex flex-col gap-3 border-t border-admin-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-admin-text">SEO</h3>
              <span className="text-[11px] font-medium text-admin-success">Good</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-admin-text-secondary">Meta Title</span>
              <span className="text-xs text-admin-text">Event Sourcing in Practice | Sudi David</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-admin-text-secondary">
                Meta Description
              </span>
              <span className="text-xs text-admin-text">
                A pragmatic guide to implementing event sourcing patterns without the usual pitfalls.
              </span>
              <span className="text-[10px] text-admin-text-tertiary">143 / 160 characters</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-admin-border pt-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-admin-text">Featured Post</span>
              <span className="text-[11px] text-admin-text-tertiary">Pin to blog homepage</span>
            </div>
            <span className="h-5 w-9 rounded-full bg-admin-border" />
          </div>
        </aside>
      </div>
    </div>
  )
}
