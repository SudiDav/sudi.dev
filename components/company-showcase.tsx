import Image from 'next/image'
import { PAGE_GUTTER } from '@/components/layout'

/**
 * Logos use each company's own brand colours, taken from their websites.
 * `darkLogo` is the company's own dark-background version (dark is the site
 * default); `logo` shows when the `.light` theme is active.
 */
const COMPANIES = [
  { name: 'Almafrica', logo: 'almafrica.svg', darkLogo: 'almafrica-dark.svg' },
  { name: 'IST Africa', logo: 'ist-africa.png', darkLogo: 'ist-africa-dark.png' },
  { name: 'Altech Group', logo: 'altech-group.svg' },
  { name: 'Fintech International', logo: 'fintech-international.png' },
  { name: 'Waves Ressources', logo: 'waves-ressources.svg', darkLogo: 'waves-ressources-dark.svg' },
  { name: 'KHM Technology', logo: 'khm-technology.png', darkLogo: 'khm-technology-dark.png' },
]

const LOGO_CLASS = 'h-11 w-20 object-contain'

function Logo({ file, className = '' }: { file: string; className?: string }) {
  return (
    <Image
      src={`/images/companies/${file}`}
      alt=""
      width={80}
      height={44}
      unoptimized
      className={`${LOGO_CLASS} ${className}`}
    />
  )
}

export function CompanyShowcase() {
  return (
    <section
      aria-labelledby="companies-heading"
      className={`py-14 text-center sm:py-20 ${PAGE_GUTTER}`}
    >
      <h2 id="companies-heading" className="font-display text-2xl font-semibold text-text-primary sm:text-3xl">
        Companies I have worked with
      </h2>
      <ul role="list" className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-7 lg:flex-nowrap">
        {COMPANIES.map(({ name, logo, darkLogo }) => (
          <li key={name} className="flex min-w-0 basis-[44%] flex-col items-center gap-3 sm:basis-1/4 lg:flex-1">
            {darkLogo ? (
              <>
                <Logo file={darkLogo} className="[.light_&]:hidden" />
                <Logo file={logo} className="hidden [.light_&]:block" />
              </>
            ) : (
              <Logo file={logo} />
            )}
            <span className="text-sm font-medium text-text-primary">{name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
