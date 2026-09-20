import { test, expect } from '@playwright/test';

test.describe('Auth E2E User Journey', () => {
  test('rejects unauthenticated requests, registers user, logs in, persists session, and logs out', async ({ page }) => {
    // 1. Verify protected API rejects unauthenticated request with 401
    const protectedResp = await page.request.get('/api/v1/chat/history');
    expect(protectedResp.status()).toBe(401);

    // 2. Navigate to root page
    await page.goto('/');

    // 3. Open Login / Auth Modal via explicit fail-fast assertion
    const loginButton = page.locator('button', { hasText: 'Masuk Akun' }).first();
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    await loginButton.click();

    // 4. Switch to Registration Tab in Auth Modal
    const registerTab = page.locator('button', { hasText: 'Registrasi' }).first();
    await expect(registerTab).toBeVisible({ timeout: 5000 });
    await registerTab.click();

    // 5. Fill out Registration Form
    const timestamp = Date.now();
    const testEmail = `mhs_${timestamp}@ui.ac.id`;
    const testName = `Mahasiswa Test ${timestamp}`;
    const testPassword = 'Password123!';

    await page.fill('input[placeholder*="Nama"]', testName);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    const submitRegisterBtn = page.locator('button', { hasText: 'Daftar Akun' }).first();
    await expect(submitRegisterBtn).toBeVisible();
    await submitRegisterBtn.click();

    // 6. Handle email verification if triggered
    const verificationHeading = page.locator('text=Verifikasi Kode Email');
    const isVerifyVisible = await verificationHeading.isVisible().catch(() => false);

    if (isVerifyVisible) {
      await page.fill('input[placeholder*="6-digit"]', '123456');
      await page.click('button:has-text("Verifikasi Email")');
    }

    // 7. Log in via UI
    const loginTab = page.locator('button', { hasText: 'Masuk' }).first();
    if (await loginTab.isVisible().catch(() => false)) {
      await loginTab.click();
    }

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    const submitLoginBtn = page.locator('button[type="submit"]', { hasText: 'Masuk' }).first();
    await expect(submitLoginBtn).toBeVisible();
    await submitLoginBtn.click();

    // 8. Assert successful login and session establishment
    const userProfileText = page.locator(`text=${testName}`).first();
    await expect(userProfileText).toBeVisible({ timeout: 10000 });

    // 9. Verify Session Persistence after Page Reload
    await page.reload();
    await expect(userProfileText).toBeVisible({ timeout: 10000 });

    // 10. Perform Logout
    const logoutBtn = page.locator('button[aria-label="Keluar"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 11. Assert back to unauthenticated state
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });
});

