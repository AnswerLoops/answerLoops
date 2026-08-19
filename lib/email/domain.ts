import { Resend } from 'resend'
import { MOCK_EXTERNALS } from '@/lib/mock-mode'
import { logger } from '@/lib/logger'

const MOD = 'email/domain'

function client() {
  return new Resend(process.env.RESEND_API_KEY)
}

export interface DomainRecordPair {
  name: string
  value: string
}

export interface RegisteredDomain {
  providerDomainId: string
  dkim: DomainRecordPair | null
  returnPath: DomainRecordPair | null
}

export type DomainVerificationStatus = 'pending' | 'verified' | 'failed'

// Resend's Domains API has no record literally named "return path" — its
// SPF record is what functions as the bounce/return-path record in Resend's
// own DNS scheme, so we surface the SPF record under our returnPath field.
function extractRecords(records: { record: string; name: string; value: string }[]): {
  dkim: DomainRecordPair | null
  returnPath: DomainRecordPair | null
} {
  const dkimRecord = records.find((r) => r.record === 'DKIM')
  const spfRecord = records.find((r) => r.record === 'SPF')
  return {
    dkim: dkimRecord ? { name: dkimRecord.name, value: dkimRecord.value } : null,
    returnPath: spfRecord ? { name: spfRecord.name, value: spfRecord.value } : null,
  }
}

// Resend's DomainStatus has more granularity than we expose in the UI —
// collapse not_started/partially_* down to 'pending' since neither means
// the domain is usable yet.
function collapseStatus(status: string): DomainVerificationStatus {
  if (status === 'verified') return 'verified'
  if (status === 'failed') return 'failed'
  return 'pending'
}

export async function registerDomain(domain: string): Promise<RegisteredDomain | { error: string }> {
  if (MOCK_EXTERNALS || !process.env.RESEND_API_KEY) {
    return { error: 'Email sending is not configured — RESEND_API_KEY is missing' }
  }

  const { data, error } = await client().domains.create({ name: domain })
  if (error || !data) {
    logger.error('Resend domain registration failed', { module: MOD, domain, error })
    return { error: error?.message ?? 'Failed to register domain with Resend' }
  }

  const { dkim, returnPath } = extractRecords(data.records ?? [])
  return { providerDomainId: data.id, dkim, returnPath }
}

export async function checkDomainStatus(
  providerDomainId: string
): Promise<{ status: DomainVerificationStatus }> {
  if (MOCK_EXTERNALS || !process.env.RESEND_API_KEY) {
    return { status: 'pending' }
  }

  const { data, error } = await client().domains.get(providerDomainId)
  if (error || !data) {
    logger.error('Resend domain status check failed', { module: MOD, providerDomainId, error })
    return { status: 'pending' }
  }

  return { status: collapseStatus(data.status) }
}

export async function removeDomain(providerDomainId: string): Promise<void> {
  if (MOCK_EXTERNALS || !process.env.RESEND_API_KEY) return

  const { error } = await client().domains.remove(providerDomainId)
  if (error) {
    logger.error('Resend domain removal failed', { module: MOD, providerDomainId, error })
  }
}
