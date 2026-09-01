// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleChatIntegrationCard } from '@/app/(dashboard)/settings/page'
import {
  generateGoogleChatConnectCodeAction,
  saveGoogleChatSettingsAction,
  deleteGoogleChatIntegrationAction,
} from '@/app/actions/integrations'

const { routerRefresh } = vi.hoisted(() => ({ routerRefresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), refresh: routerRefresh }),
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

function notConnectedResponse() {
  return { ok: true, json: async () => [] }
}

function connectedResponse(autoDeflectEnabled = 0) {
  return {
    ok: true,
    json: async () => [{
      id: 1,
      platform: 'google_chat',
      team_id: 'spaces/AAAA111',
      escalation_role_id: null,
      confidence_threshold: 0.8,
      auto_deflect_enabled: autoDeflectEnabled,
      enabled: 1,
    }],
  }
}

describe('GoogleChatIntegrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Not connected" and a generate-code button when no integration exists yet', async () => {
    mockFetch.mockResolvedValue(notConnectedResponse())
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByText('Not connected')).toBeTruthy())
    expect(screen.getByRole('button', { name: /generate connect code/i })).toBeTruthy()
  })

  it('displays the returned connect code and pairing instructions after generating one', async () => {
    mockFetch.mockResolvedValue(notConnectedResponse())
    vi.mocked(generateGoogleChatConnectCodeAction).mockResolvedValue({ connectCode: 'gc_test123' })

    const user = userEvent.setup()
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByRole('button', { name: /generate connect code/i })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /generate connect code/i }))

    await waitFor(() => expect(screen.getByText('gc_test123')).toBeTruthy())
    expect(screen.getByText(/\/connect gc_test123/)).toBeTruthy()
    // The generate button/prompt is gone once a code is pending — a user
    // could otherwise generate a second code before pairing the first.
    expect(screen.queryByRole('button', { name: /generate connect code/i })).toBeNull()
  })

  it('surfaces an entitlement error from the server action instead of silently doing nothing', async () => {
    mockFetch.mockResolvedValue(notConnectedResponse())
    vi.mocked(generateGoogleChatConnectCodeAction).mockResolvedValue({
      error: 'This integration requires the Standard plan or above — upgrade in Billing to connect it.',
    })

    const user = userEvent.setup()
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByRole('button', { name: /generate connect code/i })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /generate connect code/i }))

    await waitFor(() => expect(screen.getByText(/requires the Standard plan/)).toBeTruthy())
  })

  it('shows "Connected" with the paired space once an integration exists, and hides the connect flow', async () => {
    mockFetch.mockResolvedValue(connectedResponse())
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByText('Connected · space paired')).toBeTruthy())
    expect(screen.getByText('spaces/AAAA111')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /generate connect code/i })).toBeNull()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeTruthy()
  })

  it('opens the edit form on "Edit escalation / confidence" and submits updated values', async () => {
    mockFetch.mockResolvedValue(connectedResponse())
    vi.mocked(saveGoogleChatSettingsAction).mockResolvedValue(null)

    const user = userEvent.setup()
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByText('Connected · space paired')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /edit escalation/i }))

    expect(await screen.findByPlaceholderText('users/123456789')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(saveGoogleChatSettingsAction).toHaveBeenCalled())
  })

  it('awaits the post-save reload before showing the read-only view, and refreshes the server-rendered banner/dots', async () => {
    // Regression test: the save handler used to call reload() without
    // awaiting it, then flip `editing` false immediately — the read-only
    // view re-rendered showing the edit form gone before the fresh
    // integration data had arrived. Controls the reload fetch's timing
    // directly so the test can prove the edit form stays up until that
    // fetch resolves, rather than just checking the eventual end state
    // (which looks identical whether or not the bug is present).
    let resolveReload!: (value: ReturnType<typeof connectedResponse>) => void
    const reloadPromise = new Promise<ReturnType<typeof connectedResponse>>((resolve) => {
      resolveReload = resolve
    })

    mockFetch
      .mockResolvedValueOnce(connectedResponse(0)) // initial load — deflections off
      .mockImplementationOnce(() => reloadPromise) // post-save reload — held open

    vi.mocked(saveGoogleChatSettingsAction).mockResolvedValue(null)

    const user = userEvent.setup()
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByText('Automatic Deflections: Off')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /edit escalation/i }))
    expect(await screen.findByPlaceholderText('users/123456789')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(saveGoogleChatSettingsAction).toHaveBeenCalled())

    // The reload fetch is still pending — the edit form must still be up.
    // Flipping to the read-only view here would mean it's rendering from
    // stale data, exactly the bug this test guards against.
    expect(screen.getByPlaceholderText('users/123456789')).toBeTruthy()

    resolveReload(connectedResponse(1))

    await waitFor(() => expect(screen.getByText('Automatic Deflections: On')).toBeTruthy())
    expect(screen.queryByPlaceholderText('users/123456789')).toBeNull()
    expect(routerRefresh).toHaveBeenCalled()
  })

  it('disconnects and returns to the not-connected state', async () => {
    mockFetch.mockResolvedValueOnce(connectedResponse())
    vi.mocked(deleteGoogleChatIntegrationAction).mockResolvedValue(null)

    const user = userEvent.setup()
    render(<GoogleChatIntegrationCard />)

    await waitFor(() => expect(screen.getByRole('button', { name: /disconnect/i })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: /disconnect/i }))

    await waitFor(() => expect(screen.getByText('Not connected')).toBeTruthy())
  })
})
