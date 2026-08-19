import { eq } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { emailOauthConnections } from '../schema'
import { encryptToken, decryptToken } from '@/lib/crypto/tokens'

export interface EmailOauthConnection {
  id: number
  org_id: number
  provider: string
  mailbox_address: string
  access_token: string | null
  access_token_expires_at: string | null
  refresh_token: string
  granted_scope: string
  status: 'connected' | 'disconnected'
  disconnected_at: string | null
  created_at: string
  updated_at: string
}

function toEmailOauthConnection(row: typeof emailOauthConnections.$inferSelect): EmailOauthConnection {
  return {
    id: row.id,
    org_id: row.orgId,
    provider: row.provider,
    mailbox_address: row.mailboxAddress,
    access_token: row.accessToken,
    access_token_expires_at: row.accessTokenExpiresAt,
    refresh_token: row.refreshToken,
    granted_scope: row.grantedScope,
    status: row.status as 'connected' | 'disconnected',
    disconnected_at: row.disconnectedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}

function decryptRow(row: EmailOauthConnection): EmailOauthConnection {
  return {
    ...row,
    access_token: row.access_token ? decryptToken(row.access_token) : null,
    refresh_token: decryptToken(row.refresh_token) ?? row.refresh_token,
  }
}

export async function getEmailOauthConnection(orgId: number): Promise<EmailOauthConnection | null> {
  const [row] = await getDb()
    .select()
    .from(emailOauthConnections)
    .where(eq(emailOauthConnections.orgId, orgId))
    .limit(1)
  return row ? decryptRow(toEmailOauthConnection(row)) : null
}

export async function upsertEmailOauthConnection(input: {
  orgId: number
  provider: string
  mailboxAddress: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  grantedScope: string
}): Promise<EmailOauthConnection> {
  const existing = await getEmailOauthConnection(input.orgId)
  const values = {
    provider: input.provider,
    mailboxAddress: input.mailboxAddress,
    accessToken: encryptToken(input.accessToken),
    accessTokenExpiresAt: input.accessTokenExpiresAt,
    refreshToken: encryptToken(input.refreshToken),
    grantedScope: input.grantedScope,
    status: 'connected' as const,
    disconnectedAt: null,
    updatedAt: new Date().toISOString(),
  }

  if (existing) {
    await getDb().update(emailOauthConnections).set(values).where(eq(emailOauthConnections.orgId, input.orgId))
    return (await getEmailOauthConnection(input.orgId))!
  }

  const [row] = await getDb()
    .insert(emailOauthConnections)
    .values({ orgId: input.orgId, ...values })
    .returning()
  return decryptRow(toEmailOauthConnection(row))
}

export async function updateOauthAccessToken(orgId: number, accessToken: string, expiresAt: string): Promise<void> {
  await getDb()
    .update(emailOauthConnections)
    .set({
      accessToken: encryptToken(accessToken),
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(emailOauthConnections.orgId, orgId))
}

export async function markEmailOauthDisconnected(orgId: number): Promise<void> {
  const now = new Date().toISOString()
  await getDb()
    .update(emailOauthConnections)
    .set({ status: 'disconnected', disconnectedAt: now, updatedAt: now })
    .where(eq(emailOauthConnections.orgId, orgId))
}

export async function deleteEmailOauthConnection(orgId: number): Promise<void> {
  await getDb().delete(emailOauthConnections).where(eq(emailOauthConnections.orgId, orgId))
}
