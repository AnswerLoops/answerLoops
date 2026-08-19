import { test, expect } from '@playwright/test'
import { STORAGE_STATE } from '../playwright.config'

// Auth flow: unauthenticated redirects, login page render, session cookie.
// The default storageState (pre-baked JWT) is applied globally; these tests
// deliberately override it to test the unauthenticated paths.

test.describe('auth: unauthenticated redirects', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  const protectedRoutes = [
    '/dashboard',
    '/tickets',
    '/kb',
    '/analytics',
    '/settings',
    '/knowledge-gaps',
    '/simulation',
    '/faq',
    '/leads',
    '/billing',
  ]

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    // At least one OAuth provider button present
    await expect(page.getByRole('button').first()).toBeVisible()
  })
})

test.describe('auth: authenticated session', () => {
  test.use({ storageState: STORAGE_STATE })

  test('authenticated user can reach dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
