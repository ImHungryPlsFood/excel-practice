import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-03B 튜토리얼 조작 감지 E2E (/dev/tutorial, 실제 Chromium, R-01.06, R-07.01, R-07.05, R-07.06, R-07.13):
 * 설명을 읽거나 '다음'을 누르는 것만으로는 단계가 넘어가지 않고, 실제 셀 조작이 맞을 때만 넘어간다.
 * 조작: 셀 선택 → 수식 입력 중 포인트 모드로 범위 끌기 → 수식 확정 → 실행 취소 키.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const cellEditor = (page: Page) => page.getByRole('textbox', { name: /^작업 시트 / });
const stepTitle = (page: Page) => page.getByTestId('tutorial-step-title');
const progress = (page: Page) => page.getByRole('status', { name: '튜토리얼 진행' });
const nextButton = (page: Page) => page.getByRole('button', { name: '다음', exact: true });

async function openTutorial(page: Page) {
  await page.goto('/dev/tutorial');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  await expect(cell(page, 6, 1)).toHaveText('50');
  await expect(stepTitle(page)).toHaveText('B2 선택');
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('요소가 화면에 없습니다');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** B2 선택 → =SUM( 입력 → B3:B7 끌기. 마치면 'SUM 입력' 단계 */
async function reachFormulaStep(page: Page) {
  await cell(page, 1, 1).click();
  await expect(stepTitle(page)).toHaveText('범위 고르기');
  await page.keyboard.type('=SUM(');
  const from = await center(cell(page, 2, 1));
  const to = await center(cell(page, 6, 1));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await expect(cellEditor(page)).toHaveValue('=SUM(B3:B7');
  await expect(stepTitle(page)).toHaveText('SUM 입력');
}

test('설명 화면과 다음 버튼만으로는 단계가 넘어가지 않는다', async ({ page }) => {
  await openTutorial(page);
  await expect(progress(page)).toHaveText('단계 1/5');

  // 엉뚱한 셀을 고르면 안내만 나온다
  await cell(page, 4, 2).click();
  await expect(page.getByTestId('tutorial-failure')).toHaveText('B2 셀을 선택해야 합니다.');
  await expect(stepTitle(page)).toHaveText('B2 선택');

  // 실제로 B2를 고르면 넘어간다
  await cell(page, 1, 1).click();
  await expect(stepTitle(page)).toHaveText('범위 고르기');
  await expect(progress(page)).toHaveText('단계 2/5');
});

test('선택 → 범위 끌기 → 수식 확정 → 다음 확인 → 실행 취소 키로 끝까지 진행한다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTutorial(page);
  await reachFormulaStep(page);

  await page.keyboard.type(')');
  // 확정하기 전에는 다음 버튼이 눌리지 않는다
  await expect(nextButton(page)).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 1)).toHaveText('150');
  // 행동은 맞았지만 '다음'을 누르기 전까지 같은 단계다
  await expect(stepTitle(page)).toHaveText('SUM 입력');
  await expect(nextButton(page)).toBeEnabled();
  await nextButton(page).click();
  await expect(stepTitle(page)).toHaveText('실행 취소');

  // '다음'을 누른 직후 포커스는 그리드에 돌아와 있다(CARD-03C). 셀을 다시 클릭하지 않고 실행 취소 키를 누른다.
  await expect(cellEditor(page)).toBeFocused();
  await page.keyboard.press('Control+z');
  await expect(stepTitle(page)).toHaveText('먼 셀 선택');
  // 마지막 단계는 화면 밖 L60을 강조하며 그쪽으로 스크롤한다(CARD-03C).
  await cell(page, 59, 11).click();
  await expect(progress(page)).toHaveText('완료');
  // 실행 취소가 실제로 B2 입력을 되돌렸는지 맨 위로 돌아가 확인한다.
  await page.keyboard.press('Control+Home');
  await expect(cell(page, 1, 1)).toHaveText('');
  expect(errors).toEqual([]);
});

test('틀린 계산 결과나 다른 수식으로는 확정해도 넘어가지 않는다', async ({ page }) => {
  await openTutorial(page);
  await reachFormulaStep(page);

  await page.keyboard.type(')+1');
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 1)).toHaveText('151');
  await expect(page.getByTestId('tutorial-failure')).toBeVisible();
  await expect(stepTitle(page)).toHaveText('SUM 입력');
  await expect(nextButton(page)).toBeDisabled();
});

test('허용되지 않은 셀에는 입력이 반영되지 않는다', async ({ page }) => {
  await openTutorial(page);
  await reachFormulaStep(page);
  await page.keyboard.press('Escape');

  await cell(page, 4, 3).click();
  await page.keyboard.type('7');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tutorial-failure')).toHaveText('B2 셀에만 입력할 수 있습니다.');
  await page.keyboard.press('Escape');
  await expect(cell(page, 4, 3)).toHaveText('');
  await expect(stepTitle(page)).toHaveText('SUM 입력');
});

test('한글 조합 중 Enter는 단계에 영향을 주지 않는다', async ({ page }) => {
  await openTutorial(page);
  await reachFormulaStep(page);
  const cdp = await page.context().newCDPSession(page);

  await page.keyboard.type(')');
  await cdp.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 });
  await expect(cellEditor(page)).toHaveValue('=SUM(B3:B7)ㅎ');
  await page.keyboard.press('Enter');
  await expect(stepTitle(page)).toHaveText('SUM 입력');
  await expect(page.getByTestId('tutorial-failure')).toHaveCount(0);
  await expect(nextButton(page)).toBeDisabled();
});
