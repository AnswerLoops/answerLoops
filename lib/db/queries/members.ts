import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getDb } from '../drizzle'
import { memberships, users } from '../schema'

export interface Member {
  membership_id: number
  user_id: number
  org_id: number
  role: string
  joined_at: string
  email: string | null
  name: string | null
  image: string | null
}

export async function getOrgMembers(orgId: number): Promise<Member[]> {
  const rows = await getDb()
    .select({
      membership_id: memberships.id,
      user_id: memberships.userId,
      org_id: memberships.orgId,
      role: memberships.role,
      joined_at: memberships.createdAt,
      email: users.email,
      name: users.name,
      image: users.image,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.orgId, orgId))
    .orderBy(memberships.createdAt)
  return rows
}

export async function addMember(userId: number, orgId: number, role: string): Promise<void> {
  await getDb()
    .insert(memberships)
    .values({ userId, orgId, role })
    .onConflictDoNothing()
}

export async function isMember(userId: number, orgId: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
    .limit(1)
  return !!row
}
