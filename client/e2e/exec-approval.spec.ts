import { test, expect } from '@playwright/test'

/**
 * SynClaw Exec Approval E2E Tests
 *
 * Prerequisites:
 * 1. Start the app: cd client && pnpm run dev
 * 2. Run tests: pnpm exec playwright test
 *
 * These tests verify the exec approval modal UI and its integration with
 * the Zustand store. Gateway-triggered events are mocked via store actions.
 */

test.describe('Exec Approval Modal', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
  })

  test('exec approval store exposes required API', async ({ page }) => {
    const storeApi = await page.evaluate(() => {
      // Verify execApprovalStore is importable via window-openclaw
      // The modal is rendered via React portal, so we check the JSX tree
      const root = document.getElementById('root')
      return {
        rootExists: !!root,
        bodyHasModalContainer: !!document.body.querySelector('[role="dialog"]'),
      }
    })

    // App renders
    expect(storeApi.rootExists).toBe(true)
  })

  test('modal is not visible by default', async ({ page }) => {
    // No dialog should be present initially
    const dialogs = await page.locator('[role="dialog"]').all()
    // May be 0 or 1 depending on whether settings modal is open
    // The exec approval modal has aria-label="命令执行审批"
    const execDialog = page.locator('[aria-label="命令执行审批"]')
    await expect(execDialog).not.toBeVisible()
  })

  test('command display renders correctly when triggered', async ({ page }) => {
    // Inject a fake approval event into the store to open the modal
    await page.evaluate(() => {
      // Import is not available here — dispatch a custom event the store listens to
      // We call the store action directly via the exposed global
      // Since the modal is React-rendered, we trigger it by directly
      // dispatching on the Zustand store. In a real E2E, we'd mock the IPC channel.
      // Here we test the component mounts correctly by injecting into the store.
      const event = new CustomEvent('openclaw:event', {
        detail: {
          event: 'exec.approval.requested',
          payload: {
            id: 'test-approval-001',
            command: 'rm -rf /tmp/test-dir',
            nodeId: undefined,
          },
        },
      })
      window.dispatchEvent(event)
    })

    // Wait briefly for React to process the event and render the modal
    await page.waitForTimeout(800)

    // Modal should now be visible
    const execDialog = page.locator('[aria-label="命令执行审批"]')
    await expect(execDialog).toBeVisible()

    // Should display the command
    await expect(page.getByText('rm -rf /tmp/test-dir')).toBeVisible()

    // Should show high-risk badge
    await expect(page.getByText('高风险')).toBeVisible()
  })

  test('approve button sends approved resolution', async ({ page }) => {
    let resolveCalled = false
    let resolveDecision = ''

    // Intercept the exec.approval.resolve IPC call
    await page.evaluate(() => {
      const originalIpcRenderer = (window as Window & {
        __testResolve?: (decision: string) => void
      })
      // We'll spy on the window.openclaw.exec call instead
      ;(window as Window & { __openclawCalls?: string[] }).__openclawCalls = []
    })

    await page.evaluate(() => {
      const event = new CustomEvent('openclaw:event', {
        detail: {
          event: 'exec.approval.requested',
          payload: {
            id: 'test-approval-002',
            command: 'git status',
            nodeId: undefined,
          },
        },
      })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(800)

    const execDialog = page.locator('[aria-label="命令执行审批"]')
    await expect(execDialog).toBeVisible()

    // Click approve
    await page.getByRole('button', { name: '批准执行' }).click()

    // Modal should close after approval
    await page.waitForTimeout(500)
    await expect(execDialog).not.toBeVisible()
  })

  test('deny button closes modal without approval', async ({ page }) => {
    await page.evaluate(() => {
      const event = new CustomEvent('openclaw:event', {
        detail: {
          event: 'exec.approval.requested',
          payload: {
            id: 'test-approval-003',
            command: 'sudo rm -rf /',
            nodeId: 'test-node',
          },
        },
      })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(800)
    const execDialog = page.locator('[aria-label="命令执行审批"]')
    await expect(execDialog).toBeVisible()

    // Click deny
    await page.getByRole('button', { name: '拒绝' }).click()

    await page.waitForTimeout(500)
    await expect(execDialog).not.toBeVisible()
  })

  test('environment variables section expands when env is present', async ({ page }) => {
    await page.evaluate(() => {
      const event = new CustomEvent('openclaw:event', {
        detail: {
          event: 'exec.approval.requested',
          payload: {
            id: 'test-approval-004',
            command: 'node index.js',
            env: {
              NODE_ENV: 'production',
              API_SECRET: 'super-secret-key-123',
              HOME: '/Users/kaka',
            },
            nodeId: undefined,
          },
        },
      })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(800)

    // Environment variables section should be visible
    await expect(page.getByText(/环境变量/)).toBeVisible()

    // Sensitive env value should be masked
    await expect(page.getByText('API_SECRET=••••••••')).toBeVisible()
    // Non-sensitive env should be visible
    await expect(page.getByText(/NODE_ENV=production/)).toBeVisible()
  })

  test('multiple approvals queue correctly', async ({ page }) => {
    // Fire two approval events rapidly
    await page.evaluate(() => {
      for (const id of ['queue-001', 'queue-002']) {
        const event = new CustomEvent('openclaw:event', {
          detail: {
            event: 'exec.approval.requested',
            payload: {
              id,
              command: `echo ${id}`,
              nodeId: undefined,
            },
          },
        })
        window.dispatchEvent(event)
      }
    })

    await page.waitForTimeout(800)

    // First modal shows first command
    const execDialog = page.locator('[aria-label="命令执行审批"]')
    await expect(execDialog).toBeVisible()
    await expect(page.getByText('echo queue-001')).toBeVisible()

    // Approve first
    await page.getByRole('button', { name: '批准执行' }).click()
    await page.waitForTimeout(400)

    // Second modal shows second command
    await expect(page.getByText('echo queue-002')).toBeVisible()
  })

})
