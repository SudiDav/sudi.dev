import Image from 'next/image'
import './project-folio.css'

export type ProjectFolioPresentation = 'cover' | 'rendered-folio'

export type ProjectFolioProps = {
  src?: string
  alt: string
  title: string
  presentation?: ProjectFolioPresentation
  logo?: string
  sizes?: string
}

export function ProjectFolio({
  src,
  alt,
  title,
  presentation = 'cover',
  logo,
  sizes,
}: ProjectFolioProps) {
  if (presentation === 'rendered-folio' && src) {
    return (
      <div className="project-folio-stage project-folio-stage--rendered">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="project-folio-rendered-artwork"
        />
      </div>
    )
  }

  return (
    <div className="project-folio-stage">
      <div className="project-folio project-folio--cover">
        <div className="project-folio-pages" aria-hidden="true" />
        <div className="project-folio-face">
          {src ? (
            <Image src={src} alt={alt} fill sizes={sizes} className="project-folio-image" />
          ) : (
            <div className="project-folio-fallback">
              <span className="project-folio-fallback-title">{title}</span>
            </div>
          )}
        </div>
        {logo && (
          <span className="project-folio-logo">
            <Image src={logo} alt="" fill sizes="96px" />
          </span>
        )}
      </div>
    </div>
  )
}
