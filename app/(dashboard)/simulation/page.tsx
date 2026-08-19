import { auth } from '@/auth'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { planRequiredFor } from '@/lib/billing/entitlements'
import { orgHasFeature } from '@/lib/billing/entitlements-server'
import { LockedFeature } from '@/components/billing/locked-feature'
import { getOrgAIConfig } from '@/lib/db/queries/ai-config'
import SimulationClient from './simulation-client'

export const dynamic = 'force-dynamic'

export default async function SimulationPage() {
  const session = await auth()
  const orgId = session?.orgId ?? DEFAULT_ORG_ID

  if (!(await orgHasFeature(orgId, 'simulation'))) {
    return (
      <div className="dashboard-page max-w-6xl">
        <LockedFeature requiredPlan={planRequiredFor('simulation')} featureLabel="Simulation / dry-run mode" />
      </div>
    )
  }

  // Simulation is the one surface allowed to fall back to the platform's own
  // key (it's an explicit sandbox — see NoAIProviderConfiguredError in
  // lib/ai/models.ts), so the model picker must only ever offer models that
  // can actually run: the org's own configured provider/model if one exists,
  // otherwise the platform-key fallback's provider (OpenAI, always — see
  // chatModel()'s `openai(defaultId)` fallback) rather than every provider
  // this app happens to support.
  const cfg = await getOrgAIConfig(orgId).catch(() => null)
  const hasOrgKey = !!cfg?.chat_api_key || cfg?.chat_provider === 'openai-compatible'

  return (
    <SimulationClient
      configuredProvider={hasOrgKey ? cfg!.chat_provider : null}
      configuredModel={hasOrgKey ? cfg!.chat_model : null}
    />
  )
}
