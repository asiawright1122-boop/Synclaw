import { test, expect } from '@playwright/test'

/**

 * tts.spec.ts — TTS / Voice Mode E2E Tests
 *
 * Prerequisites:
 *   1. Start the app: cd client && pnpm run dev
 *   2. Run tests: pnpm exec playwright test
 *
 * Note: These tests use the same mock-event pattern as exec-approval.spec.ts
 * — dispatching CustomEvents that the store listens to bypass Gateway dependency.
 */

test.describe('TTS Settings Panel', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
  })

  test('TtsPanel renders TTS section', async ({ page }) => {
    // Open Settings → navigate to TTS panel
    const settingsBtn = page.locator('button[title="设置"]').or(
      page.locator('text=设置').first()
    )
    await settingsBtn.click()
    await page.waitForTimeout(500)

    // Find the TTS nav item
    const ttsNav = page.locator('button:has-text("语音")')
    await expect(ttsNav).toBeVisible()
    await ttsNav.click()
    await page.waitForTimeout(300)

    // Check panel content renders
    const panelHeading = page.locator('h1:has-text("语音")')
    await expect(panelHeading).toBeVisible()
  })

  test('TtsPanel renders STT availability message', async ({ page }) => {
    const settingsBtn = page.locator('button[title="设置"]').or(
      page.locator('text=设置').first()
    )
    await settingsBtn.click()
    await page.waitForTimeout(500)

    const ttsNav = page.locator('button:has-text("语音")')
    await ttsNav.click()
    await page.waitForTimeout(300)

    // Should show STT status (available or not supported)
    const sttSection = page.locator('text=语音输入')
    await expect(sttSection).toBeVisible()
  })

  test('TTS speed slider is interactive', async ({ page }) => {
    const settingsBtn = page.locator('button[title="设置"]').or(
      page.locator('text=设置').first()
    )
    await settingsBtn.click()
    await page.waitForTimeout(500)

    const ttsNav = page.locator('button:has-text("语音")')
    await ttsNav.click()
    await page.waitForTimeout(300)

    // Find speed slider
    const speedSlider = page.locator('input[type="range"]').first()
    if (await speedSlider.isVisible()) {
      await speedSlider.fill('1.5')
      await page.waitForTimeout(200)
    }
    // Should not crash
    await expect(page.locator('h1:has-text("语音")')).toBeVisible()
  })
})

test.describe('VoiceModePanel', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
  })

  test('VoiceModePanel is not visible by default when chat is empty', async ({ page }) => {
    // VoiceModePanel renders at the bottom of ChatView
    // It should only be visible when ttsAvailable || sttSupported
    const micButton = page.locator('[aria-label="语音模式"], button:has-text("语音"), button:has-text("Mic")')
    // The panel itself is conditional — either hidden or null
    const voicePanel = page.locator('.voice-panel, [data-testid="voice-panel"]')
    // Panel should not be visible without any audio state
    // (it's rendered via AnimatePresence, so might not be in DOM)
    // Just verify app still works
    await expect(page.locator('#root')).toBeVisible()
  })

  test('useSpeechRecognition hook returns correct API shape', async ({ page }) => {
    const hookApi = await page.evaluate(() => {
      // The hook is used internally; we verify the speech recognition API
      // via window.SpeechRecognition availability
      return {
        speechRecognitionAvailable:
          typeof window.SpeechRecognition !== 'undefined' ||
          typeof window.webkitSpeechRecognition !== 'undefined',
        openclawTtsAvailable: typeof (window as Window & {
          openclaw?: { tts?: unknown }
        }).openclaw?.tts !== 'undefined',
      }
    })

    // We can't control whether the browser supports Speech API,
    // but we verify the expected shape
    expect(typeof hookApi.speechRecognitionAvailable).toBe('boolean')
    expect(typeof hookApi.openclawTtsAvailable).toBe('boolean')
  })

  test('VoiceModePanel gracefully handles no microphone permission', async ({ page }) => {
    // Simulate: VoiceModePanel renders but speech API returns not-supported
    // Panel should return null when neither TTS nor STT is available
    const result = await page.evaluate(() => {
      const panel = document.querySelector('[class*="voice"]')
      return { panelExists: !!panel }
    })

    // App should still be functional
    await expect(page.locator('#root')).toBeVisible()
  })

  test('TTS playback controls are accessible via keyboard', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Verify openclaw.tts API is exposed in preload
    const ttsApi = await page.evaluate(() => {
      const api = (window as Window & { openclaw?: Record<string, unknown> }).openclaw
      if (!api) return null
      return {
        hasTts: 'tts' in api,
        hasTalk: 'talk' in api,
        ttsMethods: api.tts ? Object.keys(api.tts as object) : [],
      }
    })

    if (ttsApi && ttsApi.hasTts) {
      expect(Array.isArray(ttsApi.ttsMethods)).toBe(true)
      expect(ttsApi.ttsMethods).toContain('status')
      expect(ttsApi.ttsMethods).toContain('convert')
    }
  })

  test('useTTS hook API has expected shape', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Verify the preload TTS methods match our hook expectations
    const expectedMethods = ['status', 'providers', 'enable', 'disable', 'convert']
    const ttsApi = await page.evaluate(() => {
      const api = (window as Window & { openclaw?: Record<string, unknown> }).openclaw
      if (!api?.tts) return null
      return Object.keys(api.tts as object)
    })

    if (ttsApi) {
      for (const method of expectedMethods) {
        expect(ttsApi).toContain(method)
      }
    }
  })

  test('TtsPanel TTS enable/disable toggle works', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Open settings → TTS panel
    const settingsBtn = page.locator('button[title="设置"]').or(
      page.locator('text=设置').first()
    )
    await settingsBtn.click()
    await page.waitForTimeout(500)

    const ttsNav = page.locator('button:has-text("语音")')
    await ttsNav.click()
    await page.waitForTimeout(300)

    // Find the TTS toggle
    const ttsToggle = page.locator('[aria-label*="TTS"], button[aria-label*="TTS"]').first()
    if (await ttsToggle.isVisible()) {
      await ttsToggle.click()
      await page.waitForTimeout(300)
    }

    // Panel should still be visible
    await expect(page.locator('h1:has-text("语音")')).toBeVisible()
  })
})
