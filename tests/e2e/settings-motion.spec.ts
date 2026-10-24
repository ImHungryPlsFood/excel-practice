import { expect, test } from '@playwright/test';

/*
 * CARD-03D 모션 감소 설정 E2E (/settings, 실제 Chromium, MASTER_PROMPT §7.3, P-03):
 * 설정 화면에서 '항상 줄이기'를 고르면 <html data-motion="reduce">가 켜지고, 새로 고침 뒤에도 유지되며,
 * 전환 시간 토큰이 사실상 0이 된다. OS의 prefers-reduced-motion도 따른다.
 */

const html = (page: import('@playwright/test').Page) => page.locator('html');
const durationToken = (page: import('@playwright/test').Page) =>
  page.evaluate(
    "getComputedStyle(document.documentElement).getPropertyValue('--motion-duration-fast').trim()",
  );

test('설정에서 항상 줄이기를 고르면 저장되고 새로 고침해도 유지된다', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '설정', level: 1 })).toBeVisible();
  await expect(page.getByRole('radio', { name: /시스템 설정 따르기/ })).toBeChecked();
  await expect(html(page)).not.toHaveAttribute('data-motion', 'reduce');
  expect(await durationToken(page)).toBe('200ms');

  await page.getByRole('radio', { name: /항상 줄이기/ }).check();
  await expect(html(page)).toHaveAttribute('data-motion', 'reduce');
  expect(await durationToken(page)).toBe('0.001ms');
  await expect(page.getByTestId('motion-status')).toContainText('줄어 있습니다');

  await page.reload();
  await expect(page.getByRole('radio', { name: /항상 줄이기/ })).toBeChecked();
  await expect(html(page)).toHaveAttribute('data-motion', 'reduce');
  expect(await durationToken(page)).toBe('0.001ms');

  // 되돌리면 기본 동작으로 돌아간다
  await page.getByRole('radio', { name: /시스템 설정 따르기/ }).check();
  await expect(html(page)).not.toHaveAttribute('data-motion', 'reduce');
  expect(await durationToken(page)).toBe('200ms');
});

test('운영체제의 동작 줄이기 설정도 따른다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/settings');
  expect(await durationToken(page)).toBe('0.001ms');
  await expect(page.getByTestId('motion-status')).toContainText('시스템 설정');
});

test('사이드바에서 설정 화면으로 갈 수 있다', async ({ page }) => {
  await page.goto('/dashboard');
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('link', { name: '설정' })
    .click();
  await expect(page).toHaveURL(/\/settings$/);
});
