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
  // Emit a self-contained server bundle with only the dependencies actually
  // reached. The container then needs neither node_modules nor a package
  // manager, which takes the image from ~1GB to a couple of hundred MB.
  output: 'standalone',

  async redirects() {
    return migratedPostRedirects()
  },
}

export default nextConfig
