'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Upload, X, LoaderCircle } from 'lucide-react'
import { uploadCoverImage } from '@/app/admin/actions'

/**
 * Cover image upload.
 *
 * Files are committed into `public/images/` in the repo, which is already the
 * store for everything else here — so an image needs no bucket, no second set
 * of credentials, and it ships with the post that references it.
 *
 * The path field stays editable underneath: an image already in the repo can be
 * reused by typing its path, without uploading a second copy.
 */
export function CoverUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (path: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const send = (file: File) => {
    setError(null)
    const form = new FormData()
    form.set('file', file)

    startTransition(async () => {
      const result = await uploadCoverImage(form)
      if (result.ok) onChange(result.path)
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) send(file)
          // Reset so choosing the same file twice still fires a change.
          event.target.value = ''
        }}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-admin-border">
          {/* Unoptimised: the file may not be deployed yet, so the optimiser
              would 404 on it until the next build. */}
          <Image
            src={value}
            alt="Cover preview"
            width={360}
            height={190}
            unoptimized
            className="h-[190px] w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove cover image"
            className="absolute top-2 right-2 rounded-lg bg-[#000000aa] p-1.5 text-white transition-opacity hover:opacity-80"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) send(file)
          }}
          disabled={pending}
          className={`flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center transition-colors ${
            dragging ? 'border-accent bg-accent-dim' : 'border-admin-border hover:border-accent'
          }`}
        >
          {pending ? (
            <LoaderCircle size={22} className="animate-spin text-accent" />
          ) : (
            <Upload size={22} className="text-admin-text-tertiary" />
          )}
          <span className="text-[13px] text-admin-text-secondary">
            {pending ? 'Uploading…' : 'Drop image here or click to upload'}
          </span>
          <span className="text-[11px] text-admin-text-tertiary">PNG, JPG, WebP · Max 5MB</span>
        </button>
      )}

      {error ? <p className="text-[12px] text-admin-danger">{error}</p> : null}
    </div>
  )
}
