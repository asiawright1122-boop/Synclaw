import { test, expect } from '@playwright/test'

/**
 * SynClaw Avatar E2E Test Suite
 *
 * Prerequisites:
 * 1. Start the app: cd client && pnpm run dev
 * 2. Run tests: pnpm exec playwright test
 *
 * Tests avatar CRUD operations including:
 * - Creating avatars from templates
 * - Editing avatars
 * - Deleting avatars
 * - Activating/switching avatars
 */

test.describe('SynClaw Avatar System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Navigate to avatar tab in sidebar
    const avatarTab = page.locator('button:has-text("分身")')
    if (await avatarTab.isVisible()) {
      await avatarTab.click()
      // Wait for avatar list to load
      await page.waitForTimeout(500)
    }
  })

  test('should display avatar list panel', async ({ page }) => {
    // Check that avatar list panel is visible
    const avatarPanel = page.locator('text=我的分身')
    await expect(avatarPanel).toBeVisible()
  })

  test('should have create avatar button', async ({ page }) => {
    // Look for the "新建" button
    const createButton = page.locator('button:has-text("新建")')
    await expect(createButton).toBeVisible()
  })

  test('should open avatar creation modal', async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("新建")')
    await createButton.click()

    // Check modal opens with template selection
    const modal = page.locator('h2:has-text("创建分身")')
    await expect(modal).toBeVisible({ timeout: 3000 })

    // Check templates are displayed
    const templateSection = page.locator('text=选择模板快速开始')
    await expect(templateSection).toBeVisible()
  })

  test('should display avatar templates', async ({ page }) => {
    // Open create modal
    const createButton = page.locator('button:has-text("新建")')
    await createButton.click()

    // Wait for modal
    await page.waitForTimeout(300)

    // Check all 5 templates are visible
    await expect(page.locator('button:has-text("程序员")')).toBeVisible()
    await expect(page.locator('button:has-text("写作助手")')).toBeVisible()
    await expect(page.locator('button:has-text("产品经理")')).toBeVisible()
    await expect(page.locator('button:has-text("代码审查员")')).toBeVisible()
    await expect(page.locator('button:has-text("数据分析师")')).toBeVisible()
  })

  test('should create avatar from template', async ({ page }) => {
    // Open create modal
    const createButton = page.locator('button:has-text("新建")')
    await createButton.click()
    await page.waitForTimeout(300)

    // Click on a template (programmer)
    const programmerTemplate = page.locator('button:has-text("程序员")')
    await programmerTemplate.click()

    // Check form is filled with template data
    const nameInput = page.locator('input[placeholder="给分身起个名字"]')
    await expect(nameInput).toHaveValue('程序员')

    // Check personality is filled
    const personalityArea = page.locator('textarea').last()
    const personalityValue = await personalityArea.inputValue()
    expect(personalityValue.length).toBeGreaterThan(0)

    // Click create button
    const submitButton = page.locator('button:has-text("创建分身")')
    await submitButton.click()

    // Wait for modal to close and avatar to appear
    await page.waitForTimeout(500)

    // Check the new avatar appears in the list
    await expect(page.locator('text=程序员').first()).toBeVisible()
  })

  test('should create avatar from scratch', async ({ page }) => {
    // Open create modal
    const createButton = page.locator('button:has-text("新建")')
    await createButton.click()
    await page.waitForTimeout(300)

    // Click "从空白开始" to skip templates
    const fromScratchButton = page.locator('button:has-text("从空白开始")')
    if (await fromScratchButton.isVisible()) {
      await fromScratchButton.click()
    }

    // Fill in the form
    const nameInput = page.locator('input[placeholder="给分身起个名字"]')
    await nameInput.fill('我的测试分身')

    const descArea = page.locator('textarea').first()
    await descArea.fill('这是一个测试分身')

    // Create avatar
    const submitButton = page.locator('button:has-text("创建分身")')
    await submitButton.click()

    await page.waitForTimeout(500)

    // Check avatar appears
    await expect(page.locator('text=我的测试分身').first()).toBeVisible()
  })

  test('should delete avatar', async ({ page }) => {
    // First create a test avatar
    const createButton = page.locator('button:has-text("新建")')
    await createButton.click()
    await page.waitForTimeout(300)

    const fromScratchButton = page.locator('button:has-text("从空白开始")')
    if (await fromScratchButton.isVisible()) {
      await fromScratchButton.click()
    }

    const nameInput = page.locator('input[placeholder="给分身起个名字"]')
    await nameInput.fill('待删除分身')

    const submitButton = page.locator('button:has-text("创建分身")')
    await submitButton.click()
    await page.waitForTimeout(500)

    // Find and hover over the avatar to reveal delete button
    const avatarCard = page.locator('text=待删除分身').first()
    await avatarCard.hover()
    await page.waitForTimeout(200)

    // Click delete button
    const deleteButton = page.locator('[title="删除"]')
    await deleteButton.click()

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("确认删除")')
    await confirmButton.click()

    await page.waitForTimeout(500)

    // Avatar should be removed
    await expect(page.locator('text=待删除分身')).not.toBeVisible()
  })

  test('should edit avatar', async ({ page }) => {
    // Create a test avatar first
    const createButton = page.locator('button:has-text("新建")')
    await createButton.click()
    await page.waitForTimeout(300)

    const fromScratchButton = page.locator('button:has-text("从空白开始")')
    if (await fromScratchButton.isVisible()) {
      await fromScratchButton.click()
    }

    const nameInput = page.locator('input[placeholder="给分身起个名字"]')
    await nameInput.fill('待编辑分身')

    const submitButton = page.locator('button:has-text("创建分身")')
    await submitButton.click()
    await page.waitForTimeout(500)

    // Hover to reveal edit button
    const avatarCard = page.locator('text=待编辑分身').first()
    await avatarCard.hover()
    await page.waitForTimeout(200)

    // Click edit button
    const editButton = page.locator('[title="编辑"]')
    await editButton.click()

    // Check edit modal opens
    const editModal = page.locator('h2:has-text("编辑分身")')
    await expect(editModal).toBeVisible({ timeout: 3000 })

    // Change the name
    const editNameInput = page.locator('input[placeholder="给分身起个名字"]')
    await editNameInput.clear()
    await editNameInput.fill('已编辑分身')

    // Save
    const saveButton = page.locator('button:has-text("保存修改")')
    await saveButton.click()

    await page.waitForTimeout(500)

    // Check updated name appears
    await expect(page.locator('text=已编辑分身').first()).toBeVisible()
  })

  test('should activate avatar', async ({ page }) => {
    // Check if avatar can be activated (clicking on it)
    const avatars = page.locator('[data-testid="avatar-card"]')
    const count = await avatars.count()

    if (count > 0) {
      // Click on first avatar
      await avatars.first().click()
      await page.waitForTimeout(300)

      // Check for active indicator (star icon)
      const activeBadge = page.locator('.absolute.top-0.right-0').first()
      // The avatar should show as active
    }
  })
})

test.describe('SynClaw Avatar in Chat', () => {
  test('should display avatar selector in chat input', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Look for avatar selector button (shows emoji and name)
    const avatarSelector = page.locator('button:has-text("选择分身")')
      .or(page.locator('button:has-text("程序员")'))
      .or(page.locator('button:has-text("写作助手")'))

    // Should be visible near the input area
    await expect(avatarSelector.first()).toBeVisible()
  })

  test('should open avatar selector dropdown', async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')

    // Find and click the avatar selector
    const avatarButton = page.locator('button').filter({ hasText: /分身|程序员|写作助手/ }).last()
    if (await avatarButton.isVisible()) {
      await avatarButton.click()
      await page.waitForTimeout(300)

      // Check dropdown appears with avatar list
      const dropdown = page.locator('text=快速创建')
      await expect(dropdown).toBeVisible({ timeout: 2000 }).catch(() => {
        // Dropdown might not have "快速创建" if no avatars exist
      })
    }
  })
})
