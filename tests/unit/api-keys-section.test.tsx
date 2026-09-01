// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiKeysSection } from '@/app/(dashboard)/settings/page'
import { revokeApiKeyAction } from '@/app/actions/api-keys'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/app/actions/api-keys', () => ({
  createApiKeyAction: vi.fn(),
  revokeApiKeyAction: vi.fn(),
}))

vi.mock('@/app/actions/sla', () => ({ updateSLAAction: vi.fn() }))
vi.mock('@/app/actions/notion', () => ({ saveNotionConnectionAction: vi.fn(), deleteNotionConnectionAction: vi.fn() }))
vi.mock('@/app/actions/integrations', () => ({
  saveDiscordIntegrationAction: vi.fn(),
  deleteDiscordIntegrationAction: vi.fn(),
  saveDiscordGuildChannelsAction: vi.fn(),
  removeDiscordGuildAction: vi.fn(),
  saveSlackChannelsAction: vi.fn(),
  deleteSlackIntegrationAction: vi.fn(),
  saveTelegramIntegrationAction: vi.fn(),
  deleteTelegramIntegrationAction: vi.fn(),
  saveEmailIntegrationAction: vi.fn(),
  deleteEmailIntegrationAction: vi.fn(),
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

const activeKeys = [
  {
    id: 11,
    name: 'Claude Code',
    key_prefix: 'al_live_first',
    created_at: '2026-07-20T12:00:00.000Z',
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
  },
  {
    id: 12,
    name: 'Cursor',
    key_prefix: 'al_live_second',
    created_at: '2026-07-21T12:00:00.000Z',
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
  },
]

describe('API keys settings section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: activeKeys, can_manage: true }),
      }),
    )
  })

  it('removes a revoked key row immediately after the server confirms success', async () => {
    vi.mocked(revokeApiKeyAction).mockResolvedValue(null)
    const user = userEvent.setup()
    render(<ApiKeysSection />)

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText('Cursor')).toBeInTheDocument()

    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' })
    await user.click(revokeButtons[0])
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(screen.queryByText('Claude Code')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Cursor')).toBeInTheDocument()
    expect(revokeApiKeyAction).toHaveBeenCalledTimes(1)

    const submitted = vi.mocked(revokeApiKeyAction).mock.calls[0][1] as FormData
    expect(submitted.get('keyId')).toBe('11')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the key visible and announces the server error when revocation fails', async () => {
    vi.mocked(revokeApiKeyAction).mockResolvedValue({ error: 'Key could not be revoked.' })
    const user = userEvent.setup()
    render(<ApiKeysSection />)

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Revoke' })[0])
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Key could not be revoked.')
    expect(screen.getByText('Claude Code')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('hides create and revoke controls from a member who cannot manage keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: activeKeys, can_manage: false }),
      }),
    )
    render(<ApiKeysSection />)

    // Keys stay visible — a member can see what exists, just not change it.
    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.getByText(/Only workspace owners and admins can create or revoke API keys/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create key' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
  })

  it('shows create and revoke controls to an owner or admin', async () => {
    render(<ApiKeysSection />)

    expect(await screen.findByText('Claude Code')).toBeInTheDocument()
    expect(screen.queryByText(/Only workspace owners and admins/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create key' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(2)
  })

  it('renders no manage controls before the viewer role is known, so they never flash in', () => {
    // fetch is still pending on first paint.
    render(<ApiKeysSection />)
    expect(screen.queryByRole('button', { name: 'Create key' })).not.toBeInTheDocument()
  })
})
