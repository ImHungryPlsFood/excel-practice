import { expect, test } from '@playwright/test';

test('랜딩에서 학습을 시작해 대시보드와 학습 화면으로 이동한다', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: '무료로 학습 시작하기' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible();

  await page.getByRole('link', { name: '이어서 학습하기' }).click();
  await expect(page).toHaveURL(/\/learn\/level-0$/);
  await expect(page.getByText('이 화면은 아직 구현되지 않았습니다.')).toBeVisible();

  const nav = page.getByRole('navigation', { name: '주 메뉴' });
  await expect(nav.getByRole('link', { name: '학습' })).toHaveCount(0);
  await expect(
    nav.getByText('학습').locator('xpath=ancestor-or-self::*[@aria-disabled]'),
  ).toHaveAttribute('aria-disabled', 'true');

  // 연습실은 CARD-02D에서 동작하게 되어 사이드바 링크로 들어간다.
  await nav.getByRole('link', { name: '연습실' }).click();
  await expect(page).toHaveURL(/\/sandbox$/);
  await expect(page.getByRole('heading', { level: 1, name: '연습실' })).toBeVisible();
});

test('직접 주소로 접근해도 대시보드가 열리고, 없는 주소는 404 화면이 뜬다', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible();

  await page.goto('/no-such-page');
  await expect(
    page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
  ).toBeVisible();
});
