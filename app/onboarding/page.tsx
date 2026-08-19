import { auth } from '@/auth'
import { getOrg } from '@/lib/db/queries/orgs'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import OnboardingWizard from './wizard'

export default async function OnboardingPage() {
  const session = await auth()
  const orgId = session?.orgId ?? DEFAULT_ORG_ID
  const org = await getOrg(orgId)
  const initialName = org?.name && org.name !== 'My Workspace' ? org.name : 'My Workspace'

  return <OnboardingWizard initialName={initialName} />
}
