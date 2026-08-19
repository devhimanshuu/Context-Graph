import { test, expect } from '@playwright/test'

/**
 * E2E tests for ContextGraph landing, auth, and dashboard shell.
 */

test.describe('Landing Page', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ContextGraph/)
  })

  test('displays hero heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toContainText('knowledge graph')
  })

  test('has call-to-action buttons', async ({ page }) => {
    await page.goto('/')
    // CTA buttons are links inside the hero — give them time to hydrate
    await expect(page.locator('a:has-text("Get started free")').first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('a:has-text("Explore the platform")').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('has trusted-by section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Trusted by teams in regulated industries')).toBeVisible()
  })

  test('landing page renders correctly', async ({ page }) => {
    await page.goto('/')
    // Verify the page loaded and has the hero section
    await expect(page.locator('section').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Login Page', () => {
  test('has correct structure', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Sign in to')).toBeVisible()
    // Welcome back is in the page content, may take a moment to render
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })
  })

  test('shows ContextGraph brand in heading', async ({ page }) => {
    await page.goto('/login')
    const heading = page.locator('h1')
    await expect(heading).toContainText('ContextGraph')
  })

  test('has sign-up link', async ({ page }) => {
    await page.goto('/login')
    // Look for the sign-up link specifically
    await expect(page.locator('a:has-text("Create one")')).toBeVisible()
  })

  test('has back to home link', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Back to home')).toBeVisible()
  })

  test('has secure access label', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Secure access')).toBeVisible()
  })
})

test.describe('Sign-up Page', () => {
  test('has correct heading structure', async ({ page }) => {
    await page.goto('/sign-up')
    const heading = page.locator('h1')
    await expect(heading).toContainText('ContextGraph')
  })

  test('has workspace setup description', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.locator('text=Set up a governed knowledge graph')).toBeVisible()
  })

  test('has back to home link', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.locator('text=Back to home')).toBeVisible()
  })

  test('has free tier message', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.locator('text=Free to start')).toBeVisible()
  })
})

test.describe('Dashboard Auth Guard', () => {
  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    const response = await page.goto('/dashboard')
    const url = page.url()
    expect(url.includes('/login') || response?.status() === 307).toBeTruthy()
  })

  test('knowledge page redirects to login when not authenticated', async ({ page }) => {
    const response = await page.goto('/dashboard/knowledge')
    const url = page.url()
    expect(url.includes('/login') || response?.status() === 307).toBeTruthy()
  })

  test('pipeline page redirects to login when not authenticated', async ({ page }) => {
    const response = await page.goto('/dashboard/pipeline')
    const url = page.url()
    expect(url.includes('/login') || response?.status() === 307).toBeTruthy()
  })

  test('organizations page redirects to login when not authenticated', async ({ page }) => {
    const response = await page.goto('/dashboard/organizations')
    const url = page.url()
    expect(url.includes('/login') || response?.status() === 307).toBeTruthy()
  })
})

test.describe('Theme Support', () => {
  test('theme toggle is accessible on landing page', async ({ page }) => {
    await page.goto('/')
    const themeToggle = page.getByRole('button', { name: /toggle theme/i })
    await expect(themeToggle).toBeVisible()
  })

  test('theme toggle works on login page', async ({ page }) => {
    await page.goto('/login')
    const themeToggle = page.getByRole('button', { name: /toggle theme/i })
    await expect(themeToggle).toBeVisible()
  })
})
