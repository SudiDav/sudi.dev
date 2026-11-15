import { getImageProps } from 'next/image'

/**
 * A project cover small enough for a GPU texture. Several originals are
 * multi-megabyte PNGs. getImageProps puts its 2x candidate in `src`, so the 1x
 * entry is taken from `srcSet` to keep the texture near 768px wide.
 */
export function coverTexture(cover: string) {
  const { src, srcSet } = getImageProps({ src: cover, alt: '', width: 768, height: 432, quality: 70 }).props
  return srcSet?.split(', ')[0]?.split(' ')[0] || src
}
