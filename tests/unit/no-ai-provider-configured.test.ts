import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Roadmap item 11: any org with no AI provider configured in Settings → AI
// Model silently fell back to the platform's own OPENAI_API_KEY for every
// production call site (bot listeners, widget chat, MCP/Agent API) on
// managed cloud — the opposite of the "bring your own key" value prop, and
// real cost exposure for the platform owner. Only the sandbox path
// (simulation) may ever fall back to the platform key on cloud; self-hosted
// deployments always may (their "platform key" is the self-hoster's own).

const { getOrgAIConfig } = vi.hoisted(() => ({ getOrgAIConfig: vi.fn() }))
vi.mock('@/lib/db/queries/ai-config', () => ({ getOrgAIConfig }))

async function models() {
  return import('@/lib/ai/models')
}

beforeEach(() => {
  getOrgAIConfig.mockReset()
  delete process.env.DEPLOYMENT_MODE
  delete process.env.MOCK_EXTERNALS
})

afterEach(() => {
  delete process.env.DEPLOYMENT_MODE
})

describe('chatModel — production purpose (default) on managed cloud', () => {
  it('throws NoAIProviderConfiguredError when the org has no configured key', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue(null)
    const { chatModel, NoAIProviderConfiguredError } = await models()

    await expect(chatModel('gpt-4o', 42)).rejects.toBeInstanceOf(NoAIProviderConfiguredError)
  })

  it('throws even when a config row exists but has no key and is not openai-compatible', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue({ chat_provider: 'openai', chat_api_key: null, chat_model: 'gpt-4o', chat_base_url: null })
    const { chatModel, NoAIProviderConfiguredError } = await models()

    await expect(chatModel('gpt-4o', 42)).rejects.toBeInstanceOf(NoAIProviderConfiguredError)
  })

  it('does not throw when the org has a configured key', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue({ chat_provider: 'anthropic', chat_api_key: 'org-key', chat_model: 'claude-sonnet-4-6', chat_base_url: null })
    const { chatModel } = await models()

    await expect(chatModel('gpt-4o', 42)).resolves.toBeTruthy()
  })

  it('does not throw for an openai-compatible provider even with no explicit key (self-hosted proxy case)', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue({ chat_provider: 'openai-compatible', chat_api_key: null, chat_model: 'local-model', chat_base_url: 'http://localhost:11434' })
    const { chatModel } = await models()

    await expect(chatModel('gpt-4o', 42)).resolves.toBeTruthy()
  })
})

describe('chatModel — self-hosted deployments always allow the platform key', () => {
  it('falls back to the platform key without throwing when DEPLOYMENT_MODE is unset (self-hosted default)', async () => {
    getOrgAIConfig.mockResolvedValue(null)
    const { chatModel } = await models()

    await expect(chatModel('gpt-4o', 42)).resolves.toBeTruthy()
  })
})

describe('chatModel — sandbox purpose always allows the platform key, regardless of deployment mode', () => {
  it('does not throw on cloud with no org config when purpose is sandbox', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue(null)
    const { chatModel } = await models()

    await expect(chatModel('claude-sonnet-4-6', 42, 'sandbox')).resolves.toBeTruthy()
  })
})

describe('chatModel — no orgId given (no org context at all)', () => {
  it('falls back to the platform key unconditionally, unaffected by deployment mode', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    const { chatModel } = await models()

    await expect(chatModel('gpt-4o')).resolves.toBeTruthy()
    expect(getOrgAIConfig).not.toHaveBeenCalled()
  })
})

describe('embeddingModel — same production/sandbox contract as chatModel', () => {
  it('throws NoAIProviderConfiguredError on cloud with no org config, production purpose', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue(null)
    const { embeddingModel, NoAIProviderConfiguredError } = await models()

    await expect(embeddingModel('text-embedding-3-small', 42)).rejects.toBeInstanceOf(NoAIProviderConfiguredError)
  })

  it('does not throw on cloud with no org config when purpose is sandbox', async () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    getOrgAIConfig.mockResolvedValue(null)
    const { embeddingModel } = await models()

    await expect(embeddingModel('text-embedding-3-small', 42, 'sandbox')).resolves.toBeTruthy()
  })

  it('does not throw on self-hosted with no org config', async () => {
    getOrgAIConfig.mockResolvedValue(null)
    const { embeddingModel } = await models()

    await expect(embeddingModel('text-embedding-3-small', 42)).resolves.toBeTruthy()
  })
})
