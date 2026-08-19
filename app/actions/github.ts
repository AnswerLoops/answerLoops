'use server'

import { z } from 'zod'
import { refresh } from 'next/cache'
import { auth } from '@/auth'
import { addRepo, removeRepo } from '@/lib/db/queries/github'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

const AddRepoSchema = z.object({
  installationId: z.coerce.number(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  isPrivate: z.coerce.boolean().optional(),
})

export async function addRepoAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | null> {
  const parsed = AddRepoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input' }

  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const orgId = session.orgId ?? DEFAULT_ORG_ID

  try {
    await addRepo(parsed.data.installationId, parsed.data.owner, parsed.data.repo, parsed.data.isPrivate ?? false, orgId)
  } catch (err) {
    return { error: String(err) }
  }

  refresh()
  return null
}

export async function removeRepoAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | null> {
  const id = Number(formData.get('id'))
  if (!id) return { error: 'Invalid id' }

  const session = await auth()
  if (!session?.user) return { error: 'Unauthorized' }
  const orgId = session.orgId ?? DEFAULT_ORG_ID

  await removeRepo(id, orgId)
  refresh()
  return null
}
