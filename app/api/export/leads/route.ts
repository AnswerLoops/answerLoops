import { auth } from '@/auth'
import { listWidgetLeads } from '@/lib/db/queries/widget-leads'
import { DEFAULT_ORG_ID } from '@/lib/db/schema'
import { orgHasFeature } from '@/lib/billing/entitlements-server'
import { escapeCSV } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const orgId = session.orgId ?? DEFAULT_ORG_ID
  if (!(await orgHasFeature(orgId, 'csv_export'))) {
    return new Response('Forbidden', { status: 403 })
  }

  const leads = await listWidgetLeads(orgId)

  const header = ['id', 'email', 'widget_token', 'created_at']
  const rows = leads.map((l) => [l.id, l.email, l.widgetToken, l.createdAt].map(escapeCSV).join(','))

  const csv = [header.join(','), ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
