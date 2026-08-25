import type { NextConfig } from 'next'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The posts used to live at the root of sudi.dev on Hashnode — `/some-post`,
 * not `/blog/some-post`. Once this site takes over the domain those URLs are
 * the ones already linked from elsewhere and indexed by search engines, so each
 * gets a permanent redirect to its new home rather than a 404.
 *
 * Read from the content directory so a post added later cannot be forgotten.
 * Only these exact slugs redirect — a catch-all would swallow /work and /about.
 */
function migratedPostRedirects() {
  return readdirSync(join(process.cwd(), 'content/posts'))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''))
    .map((slug) => ({
      source: `/${slug}`,
      destination: `/blog/${slug}`,
      permanent: true,
    }))
}

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained server bundle for the
  // container build — no node_modules, no package manager in the image.
  //
  // It must NOT be set on Vercel. Vercel runs its own trace step after the
  // build and reads `.next/*.nft.json`, which standalone mode relocates; the
  // deploy fails with ENOENT on next-server.js.nft.json. Vercel sets VERCEL=1
  // during builds, so the setting applies only everywhere else.
  output: process.env.VERCEL ? undefined : 'standalone',

  // CoverUpload accepts images up to 5 MB. Leave room for multipart request
  // overhead while keeping the Server Action body bounded.
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },

  async redirects() {
    return migratedPostRedirects()
  },
}

export default nextConfig
