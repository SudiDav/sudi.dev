import PrivacyView from '@/app/(english)/privacy/page'
import { localizedMetadata } from '@/lib/locale'

export const metadata = localizedMetadata(
  'fr',
  '/privacy',
  'Confidentialité | Sudi M. David',
  'Ce que ce site collecte, ce qu’il ne collecte pas et comment demander la suppression de vos données.',
)

export default function FrenchPrivacyPage() {
  return <PrivacyView locale="fr" />
}
