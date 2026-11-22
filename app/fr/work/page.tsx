import WorkView from '@/app/(english)/work/page'
import { localizedMetadata } from '@/lib/locale'

export const metadata = localizedMetadata(
  'fr',
  '/work',
  'Projets | Sudi M. David',
  'Une sélection de projets que j’ai créés, auxquels j’ai contribué ou sur lesquels je travaille actuellement.',
)

export default function FrenchWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  return <WorkView searchParams={searchParams} locale="fr" />
}
