// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotionIntegrationCard } from '@/app/(dashboard)/settings/page'
import {
  saveNotionConnectionAction,
  deleteNotionConnectionAction,
} from '@/app/actions/notion'

const { routerRefresh } = vi.hoisted(() => ({ routerRefresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), refresh: routerRefresh }),
}))

// SettingsPage's module graph pulls in every settings server-action module.
vi.mock('@/app/actions/api-keys', () => ({
  createApiKeyAction: vi.fn(),
  revokeApiKeyAction: vi.fn(),
}))
vi.mock('@/app/actions/sla', () => ({ updateSLAAction: vi.fn() }))
vi.mock('@/app/actions/notion', () => ({
  saveNotionConnectionAction: vi.fn(),
  deleteNotionConnectionAction: vi.fn(),
}))
vi.mock('@/app/actions/integrations', () => ({
  saveDiscordIntegrationAction: vi.fn(),
  deleteDiscordIntegrationAction: vi.fn(),
  saveDiscordGuildChannelsAction: vi.fn(),
  removeDiscordGuildAction: vi.fn(),
  saveSlackChannelsAction: vi.fn(),
  deleteSlackIntegrationAction: vi.fn(),
  saveTelegramIntegrationAction: vi.fn(),
  deleteTelegramIntegrationAction: vi.fn(),
  saveDiscourseIntegrationAction: vi.fn(),
  deleteDiscourseIntegrationAction: vi.fn(),
  saveEmailIntegrationAction: vi.fn(),
  deleteEmailIntegrationAction: vi.fn(),
  generateGoogleChatConnectCodeAction: vi.fn(),
  saveGoogleChatSettingsAction: vi.fn(),
  deleteGoogleChatIntegrationAction: vi.fn(),
  getCurrentDeploymentMode: vi.fn(async () => 'cloud'),
}))
vi.mock('@/app/actions/invitations', () => ({
  sendInviteAction: vi.fn(),
  revokeInviteAction: vi.fn(),
  removeMemberAction: vi.fn(),
  transferOwnershipAction: vi.fn(),
}))
vi.mock('@/app/actions/widget', () => ({
  getWidgetTokenAction: vi.fn(),
  regenerateWidgetTokenAction: vi.fn(),
  saveWidgetOriginsAction: vi.fn(),
}))
vi.mock('@/app/actions/ai-config', () => ({
  saveAIConfigAction: vi.fn(),
  clearAIConfigAction: vi.fn(),
}))
vi.mock('@/app/actions/roi', () => ({ saveROIConfigAction: vi.fn() }))
vi.mock('@/app/actions/account', () => ({
  deleteAccountAction: vi.fn(),
  getCurrentOrgName: vi.fn(async () => null),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function connection(overrides: Record<string, unknown> = {}) {
  return {
    workspace_name: 'Acme HQ',
    kb_last_synced: null,
    kb_chunk_count: 0,
    ...overrides,
  }
}

// sync-kb also starts with "/api/notion", so match it first.
function routeFetch({
  conn = null,
  sync = { synced: 0 },
}: {
  conn?: unknown
  sync?: { synced?: number; truncated?: boolean; error?: string }
} = {}) {
  return vi.fn((url: string) => {
    if (url.startsWith('/api/notion/sync-kb')) {
      return Promise.resolve({ ok: true, json: async () => sync })
    }
    if (url.startsWith('/api/notion')) {
      return Promise.resolve({ ok: true, json: async () => ({ connection: conn }) })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
}

describe('NotionIntegrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Not connected" and the token form when /api/notion returns connection: null', async () => {
    mockFetch.mockImplementation(routeFetch({ conn: null }))
    render(<NotionIntegrationCard />)

    await waitFor(() => expect(screen.getByText('Not connected')).toBeTruthy())
    const input = document.querySelector('input[name="token"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.type).toBe('password')
  })

  it('shows the connected view with the workspace name, "Sync now" and "Disconnect"', async () => {
    mockFetch.mockImplementation(routeFetch({ conn: connection({ kb_chunk_count: 12 }) }))
    render(<NotionIntegrationCard />)

    await waitFor(() => expect(screen.getByText('Connected · Acme HQ')).toBeTruthy())
    expect(screen.getByRole('button', { name: /sync now/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeTruthy()
    expect(screen.queryByText('Not connected')).toBeNull()
  })

  it('submitting the token form calls saveNotionConnectionAction', async () => {
    mockFetch.mockImplementation(routeFetch({ conn: null }))
    vi.mocked(saveNotionConnectionAction).mockResolvedValue(null)

    const user = userEvent.setup()
    render(<NotionIntegrationCard />)

    await waitFor(() => expect(document.querySelector('input[name="token"]')).toBeTruthy())
    await user.type(document.querySelector('input[name="token"]') as HTMLInputElement, 'ntn_test-token')
    await user.click(screen.getByRole('button', { name: /^connect$/i }))

    await waitFor(() => expect(saveNotionConnectionAction).toHaveBeenCalled())
  })

  it('"Sync now" hits /api/notion/sync-kb and toasts the chunk count', async () => {
    mockFetch.mockImplementation(routeFetch({ conn: connection(), sync: { synced: 5 } }))

    const user = userEvent.setup()
    render(<NotionIntegrationCard />)

    await waitFor(() => expect(screen.getByRole('button', { name: /sync now/i })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /sync now/i }))

    await waitFor(() => expect(screen.getByText('Synced 5 chunks')).toBeTruthy())
    expect(mockFetch).toHaveBeenCalledWith('/api/notion/sync-kb')
  })

  it('"Sync now" with truncated: true adds the "knowledge base is full" note to the toast', async () => {
    mockFetch.mockImplementation(routeFetch({ conn: connection(), sync: { synced: 2, truncated: true } }))

    const user = userEvent.setup()
    render(<NotionIntegrationCard />)

    await waitFor(() => expect(screen.getByRole('button', { name: /sync now/i })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /sync now/i }))

    await waitFor(() =>
      expect(
        screen.getByText('Synced 2 chunks — knowledge base is full, some content was skipped'),
      ).toBeTruthy(),
    )
  })

  it('"Disconnect" calls deleteNotionConnectionAction', async () => {
    mockFetch.mockImplementation(routeFetch({ conn: connection() }))
    vi.mocked(deleteNotionConnectionAction).mockResolvedValue(null)

    const user = userEvent.setup()
    render(<NotionIntegrationCard />)

    await waitFor(() => expect(screen.getByRole('button', { name: /disconnect/i })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /disconnect/i }))

    await waitFor(() => expect(deleteNotionConnectionAction).toHaveBeenCalled())
  })
})
