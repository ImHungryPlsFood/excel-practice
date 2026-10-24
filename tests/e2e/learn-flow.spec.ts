import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-04D 학습 흐름 E2E (/learn/level-0, 실제 Chromium):
 * 개념 설명 → 시트에서 풀이 → 오답 피드백 → 수정 후 통과 → 다음 문제 → 코스 완료.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const feedback = (page: Page) => page.getByRole('region', { name: '채점 결과' });
const resultDialog = (page: Page) => page.getByRole('dialog', { name: '문제 완료' });
const submitButton = (page: Page) => page.getByRole('button', { name: '제출', exact: true });

async function typeAt(page: Page, row: number, col: number, text: string) {
  await cell(page, row, col).click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('요소가 화면에 없습니다');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function passAndContinue(page: Page, nextName: string) {
  await submitButton(page).click();
  await expect(resultDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(resultDialog(page)).toHaveCount(0);
  await page.getByRole('button', { name: nextName }).click();
}

test('개념을 읽고 풀고 틀리면 고치고 다음 문제로 넘어가 코스를 마친다', async ({ page }) => {
  await page.goto('/learn/level-0');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();

  // 개념 설명과 문제
  const guide = page.getByRole('region', { name: '개념 설명' });
  await expect(guide).toContainText('셀 선택과 데이터 입력');
  await expect(guide).toContainText('스프레드시트는 행과 열이 만나는 칸');
  const task = page.getByRole('complementary', { name: '문제와 힌트' });
  await expect(task).toContainText('표에서 칸 하나 가져오기');
  await expect(page.getByRole('button', { name: '다음 문제' })).toHaveCount(0);

  // 1번: 이 문제는 수식 입력만 허용한다(allowedActions). 값을 직접 입력하면 거부된다.
  await typeAt(page, 5, 1, '19');
  await expect(page.getByText('값을 직접 입력하거나 지울 수 없습니다').first()).toBeVisible();
  await page.keyboard.press('Escape'); // 거부된 입력의 편집기를 닫는다
  await expect(cell(page, 5, 1)).toHaveText('');
  // 다른 분야의 칸을 가져오는 수식 → 오답 설명 → 고쳐 통과
  await typeAt(page, 5, 1, '=D2');
  await submitButton(page).click();
  await expect(feedback(page)).toContainText('아직 완성되지 않았어요');
  await expect(page.getByTestId('feedback-misconception')).toContainText('다른 분야의 칸');
  await expect(page.getByRole('button', { name: '다음 문제' })).toHaveCount(0);
  await typeAt(page, 5, 1, '=D3');
  await expect(cell(page, 5, 1)).toHaveText('19');
  await passAndContinue(page, '다음 문제');

  // 2번: 새 문제와 새 단원의 개념
  await expect(task).toContainText('가로로 놓인 구간 선택하기');
  await expect(guide).toContainText('범위 선택과 채우기');
  await expect(cell(page, 1, 1)).toHaveText('1');
  await typeAt(page, 7, 1, '=SUM(C3:F3)');
  await submitButton(page).click();
  await expect(page.getByTestId('feedback-misconception')).toContainText('수요일보다 한 칸 앞');
  await typeAt(page, 7, 1, '=SUM(D3:F3)');
  await passAndContinue(page, '다음 문제');

  // 3번: 채우기 핸들로 D2를 D7까지
  await expect(task).toContainText('채우기로 금액 열 완성하기');
  // 이 문제는 채우기·복사만 허용한다. 수식을 새로 입력하면 거부된다.
  await typeAt(page, 6, 3, '=B7*C7');
  await expect(page.getByText('수식을 입력할 수 없습니다').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(cell(page, 6, 3)).toHaveText('');
  await cell(page, 1, 3).click();
  await expect(cell(page, 1, 3)).toHaveAttribute('aria-selected', 'true');
  const handle = await center(page.locator('[data-fill-handle]'));
  const target = await center(cell(page, 6, 3));
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  await expect(cell(page, 6, 3)).toHaveText('19000');
  await passAndContinue(page, '코스 마치기');

  await expect(
    page.getByRole('heading', { level: 1, name: '스프레드시트 첫걸음 완료' }),
  ).toBeVisible();
});

test('Level 2~3 코스는 열리고, Level 1은 준비 중이며, 없는 코스는 404 화면이다', async ({
  page,
}) => {
  for (const [level, title] of [
    [2, '쿠폰을 적용한 결제 금액'],
    [3, '정산이 덜 끝난 행사 지출 합계'],
  ] as const) {
    await page.goto(`/learn/level-${level}`);
    await expect(page.getByRole('complementary', { name: '문제와 힌트' })).toContainText(title);
  }

  await page.goto('/learn/level-1');
  await expect(page.getByRole('status')).toContainText('준비 중인 코스입니다');
  await expect(page.getByRole('grid')).toHaveCount(0);
  const switcher = page.getByRole('navigation', { name: '코스 선택' });
  await expect(switcher.getByText('Level 1 준비 중')).toHaveAttribute('aria-disabled', 'true');
  await expect(switcher.getByRole('link', { name: 'Level 1' })).toHaveCount(0);

  await page.goto('/learn/level-99');
  await expect(
    page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
  ).toBeVisible();
});

test('문제 화면은 정답 수식을 미리 보여 주지 않는다', async ({ page }) => {
  await page.goto('/learn/level-2');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  const task = page.getByRole('complementary', { name: '문제와 힌트' });
  await expect(task).not.toContainText('=B2*B3-B4');
});
