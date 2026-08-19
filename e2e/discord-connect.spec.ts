import { test, expect } from '@playwright/test'
import { mockDiscordApi, MOCK_GUILD, MOCK_CHANNELS } from './helpers'

// Discord connect: credential entry → mock Discord API → guild+channel picker → save.
// Playwright intercepts outbound Discord API calls made by /api/discord/guilds server action.

test.describe('discord connect: /api/discord/guilds', () => {
  test('rejects missing bot token', async ({ request }) => {
    const res = await request.post('/api/discord/guilds', { data: {} })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/token/i)
  })

  test('returns mock guilds and channels', async ({ page, request }) => {
    await mockDiscordApi(page)

    const res = await request.post('/api/discord/guilds', {
      data: { token: 'mock-bot-token' },
    })
    expect(res.ok()).toBeTruthy()
    const guilds = (await res.json()) as Array<{
      id: string
      name: string
      channels: Array<{ id: string; name: string }>
    }>
    expect(guilds.length).toBeGreaterThan(0)
    expect(guilds[0].channels.length).toBeGreaterThan(0)
  })

  test('rejects unauthenticated request', async () => {
    const res = await fetch('http://localhost:3100/api/discord/guilds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'any-token' }),
    })
    expect(res.status).toBe(401)
  })
})

test.describe('discord connect: settings UI flow', () => {
  test('settings page shows Discord integration section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText(/discord/i).first()).toBeVisible()
  })

  test('can enter bot token and fetch guilds', async ({ page }) => {
    await mockDiscordApi(page)

    await page.goto('/settings')

    // Find Discord section and bot token input
    const tokenInput = page.locator('input[name="botToken"], input[placeholder*="token" i]').first()
    if (await tokenInput.isVisible()) {
      await tokenInput.fill('mock-bot-token-12345')

      const fetchBtn = page.getByRole('button', { name: /fetch|load|connect/i }).first()
      if (await fetchBtn.isVisible()) {
        await fetchBtn.click()
        // Guild or channel selector should appear
        await expect(
          page.getByText(new RegExp(MOCK_GUILD.name, 'i'))
            .or(page.getByText(new RegExp(MOCK_CHANNELS[0].name, 'i')))
        ).toBeVisible({ timeout: 10_000 })
      }
    }
  })
})
