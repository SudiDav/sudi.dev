import AboutView from '@/app/(english)/about/page'
import { localizedMetadata } from '@/lib/locale'

export const metadata = localizedMetadata(
  'fr',
  '/about',
  'À propos | Sudi M. David',
  'Depuis Lubumbashi, Sudi M. David explore les systèmes du quotidien à travers le logiciel, la philosophie, l’écriture et la création 3D.',
)

export default function FrenchAboutPage() {
  return <AboutView locale="fr" />
}
