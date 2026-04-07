/**
 * SynClaw Chat E2E Tests
 *
 * These tests verify the core chat interaction flow using a mocked Gateway.
 * The gateway mock is injected via page.addInitScript() before each test.
 *
 * Prerequisites:
 *   cd client && pnpm run dev   (or playwright will start it automatically)
 *   pnpm test:e2e
 *
 * In CI: CI=true pnpm test:e2e (headless mode with 2 retries)
 *
 * IMPORTANT: These tests require Playwright with a Chromium browser installed.
 * Run: npx playwright install chromium
 */

import { test, expect, Page } from '@playwright/test'

// Injected by playwright.config.ts gateway-mock setupFiles
// The mock provides window.openclaw and window.electronAPI for E2E testing

async function setMockMode(page: Page, mode: 'success' | 'error' | 'api-key') {
  await page.addInitScript((m: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__E2E_MOCK__?.setMode(m)
  }, mode)
}

test.describe('SynClaw Chat — Core Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('send message → AI response displays in chat', async ({ page }) => {
    const chatInput = page.locator('textarea').first()
    const sendButton = page.locator('button[title="发送"]').first()

    // Verify empty state: no messages yet — show SynClaw logo/title
    await expect(page.locator('text=SynClaw').first()).toBeVisible()
    await expect(page.locator('text=描述你的目标').first()).toBeVisible()

    // Input a message
    await chatInput.fill('你好，请介绍一下你自己')
    await expect(chatInput).toHaveValue('你好，请介绍一下你自己')

    // Send button should be enabled (not disabled)
    await expect(sendButton).toBeEnabled()

    // Click send
    await sendButton.click()

    // Input should be cleared after sending
    await expect(chatInput).toHaveValue('')

    // User message should appear in the chat area
    await expect(page.locator('text=你好，请介绍一下你自己').first()).toBeVisible({ timeout: 3000 })

    // Wait for AI response (mock has ~1s total delay)
    await expect(page.locator('.space-y-4').first()).toBeVisible({ timeout: 5000 })

    // The response should contain text from the mock
    await expect(page.locator('text=E2E').first()).toBeVisible({ timeout: 8000 })
  })

  test('empty/whitespace message → send button disabled, no action triggered', async ({ page }) => {
    const chatInput = page.locator('textarea').first()
    const sendButton = page.locator('button[title="发送"]').first()

    // Initially send button should be disabled (no text in input)
    await expect(sendButton).toBeDisabled()

    // Type whitespace only
    await chatInput.fill('   ')
    // Send button should still be disabled for whitespace-only input
    await expect(sendButton).toBeDisabled()

    // Press Enter on whitespace input
    await chatInput.press('Enter')

    // Verify no messages were sent — empty state should still be showing
    await expect(page.locator('text=SynClaw').first()).toBeVisible()
    await expect(page.locator('text=描述你的目标').first()).toBeVisible()
  })

  test('invalid API key → error message displayed gracefully', async ({ page }) => {
    // Switch mock to api-key error mode
    await setMockMode(page, 'api-key')

    // Reload to pick up the new mock mode
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    const chatInput = page.locator('textarea').first()
    const sendButton = page.locator('button[title="发送"]').first()

    // Send a message
    await chatInput.fill('测试消息')
    await sendButton.click()

    // The API key error should appear as an assistant message
    await expect(page.locator('text=API Key').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('SynClaw Chat — Enter key behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('Enter key sends message (without Shift)', async ({ page }) => {
    const chatInput = page.locator('textarea').first()

    await chatInput.fill('通过 Enter 发送的消息')
    await chatInput.press('Enter')

    // User message should appear
    await expect(page.locator('text=通过 Enter 发送的消息').first()).toBeVisible({ timeout: 3000 })
    // Input should be cleared
    await expect(chatInput).toHaveValue('')
  })

  test('Shift+Enter does not send (inserts newline)', async ({ page }) => {
    const chatInput = page.locator('textarea').first()

    await chatInput.fill('多行消息')
    await chatInput.press('Shift+Enter')
    // Input should NOT be cleared (Enter with Shift just inserts newline)
    await expect(chatInput).toHaveValue('多行消息')
  })
})

test.describe('SynClaw Chat — API Gateway integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('Gateway status indicator shows connected/ready state', async ({ page }) => {
    // The connection status bar should be visible
    const statusBar = page.locator('[class*="border-b"]').first()
    await expect(statusBar).toBeVisible()

    // Should show a colored dot (connected = green, ready = blue, etc.)
    const statusDot = page.locator('[class*="rounded-full"][class*="animate-pulse"]').first()
    await expect(statusDot).toBeVisible()
  })

  test('openclaw API is available on window', async ({ page }) => {
    const hasOpenClaw = await page.evaluate(() => {
      return typeof (window as Window & { openclaw?: unknown }).openclaw !== 'undefined'
    })
    expect(hasOpenClaw).toBe(true)
  })
})
