'use server'

import { refresh } from 'next/cache'
import { auth } from '@/auth'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/db/queries/notifications'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'

export async function markReadAction(_prevState: unknown, formData: FormData): Promise<null> {
  const id = Number(formData.get('id'))
  if (id) {
    const session = await auth()
    await markNotificationRead(id, session?.orgId ?? DEFAULT_ORG_ID)
  }
  refresh()
  return null
}

export async function markAllReadAction(): Promise<null> {
  const session = await auth()
  await markAllNotificationsRead(session?.orgId ?? DEFAULT_ORG_ID)
  refresh()
  return null
}
