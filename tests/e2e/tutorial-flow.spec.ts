import { expect, test, type Page } from '@playwright/test';

/*
 * CARD-03D 튜토리얼 흐름 E2E (/dev/tutorial?scenario=03d, 실제 Chromium, R-07.05, R-07.06, R-07.23~31):
 * 이미 선택된 셀을 다시 눌러 단계를 끝내기, 허용 셀 밖 붙여넣기·채우기 차단, 도구 모음 버튼 실행 취소 인식,
 * 모션 감소 설정에서 단계 전환 애니메이션이 즉시 끝나는 것.
 * 시나리오: A1 재클릭 → B2에만 5 입력(허용 셀 B2) → 실행 취소 버튼.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const stepTitle = (page: Page) => page.getByTestId('tutorial-step-title');
const progress = (page: Page) => page.getByRole('status', { name: '튜토리얼 진행' });
const failure = (page: Page) => page.getByTestId('tutorial-failure');

async function openScenario(page: Page) {
  await page.goto('/dev/tutorial?scenario=03d');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  await expect(cell(page, 6, 1)).toHaveText('50');
  await expect(stepTitle(page)).toHaveText('A1 선택');
}

/** A1 재클릭으로 첫 단계를 끝내고 'B2 입력' 단계로 간다 */
async function reachEnterStep(page: Page) {
  await cell(page, 0, 0).click();
  await expect(stepTitle(page)).toHaveText('B2 입력');
}

test('이미 선택된 셀은 단계가 시작돼도 자동 완료되지 않고, 다시 눌러야 끝난다', async ({
  page,
}) => {
  await openScenario(page);
  // A1은 처음부터 선택돼 있지만 사용자가 누르기 전에는 넘어가지 않는다
  await page.waitForTimeout(300);
  await expect(stepTitle(page)).toHaveText('A1 선택');
  await expect(progress(page)).toHaveText('단계 1/3');

  await cell(page, 0, 0).click();
  await expect(stepTitle(page)).toHaveText('B2 입력');
  await expect(progress(page)).toHaveText('단계 2/3');
});

test('허용 셀 밖으로의 붙여넣기와 채우기는 막히고 값이 바뀌지 않는다', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openScenario(page);
  await reachEnterStep(page);

  // 붙여넣기: A3(합계 아래 'a')를 복사해 C5에 붙여넣으려 한다
  await cell(page, 2, 0).click();
  await page.keyboard.press('Control+c');
  await cell(page, 4, 2).click();
  await page.keyboard.press('Control+v');
  await expect(page.getByText('B2 셀에만 쓸 수 있습니다.').first()).toBeVisible();
  await expect(cell(page, 4, 2)).toHaveText('');
  await expect(failure(page)).toHaveText('B2 셀에만 쓸 수 있습니다.');

  // Ctrl+D 채우기: A3:A4를 고르고 아래로 채우려 한다 → A4는 그대로
  await cell(page, 2, 0).click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Control+d');
  await expect(cell(page, 3, 0)).toHaveText('b');

  // 채우기 핸들 끌기: A3을 아래 두 칸으로 끌어도 반영되지 않는다
  await cell(page, 2, 0).click();
  const handle = await page.locator('[data-fill-handle]').boundingBox();
  const target = await cell(page, 4, 0).boundingBox();
  if (handle === null || target === null) throw new Error('채우기 핸들이 보이지 않습니다');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(cell(page, 3, 0)).toHaveText('b');
  await expect(cell(page, 4, 0)).toHaveText('c');

  // 틀린 시도로 기록됐을 뿐 단계는 그대로다
  await expect(stepTitle(page)).toHaveText('B2 입력');
});

test('도구 모음 실행 취소 버튼으로 한 실행 취소도 단계에서 인식된다', async ({ page }) => {
  await openScenario(page);
  await reachEnterStep(page);

  await cell(page, 1, 1).click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 1)).toHaveText('5');
  await expect(stepTitle(page)).toHaveText('버튼으로 실행 취소');

  await page.getByTestId('undo-button').click();
  await expect(cell(page, 1, 1)).toHaveText('');
  await expect(progress(page)).toHaveText('완료');
});

test('키로 한 실행 취소도 단계에서 인식된다', async ({ page }) => {
  await openScenario(page);
  await reachEnterStep(page);

  await cell(page, 1, 1).click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(stepTitle(page)).toHaveText('버튼으로 실행 취소');

  await page.keyboard.press('Control+z');
  await expect(cell(page, 1, 1)).toHaveText('');
  await expect(progress(page)).toHaveText('완료');
  // 되돌릴 것이 더 없을 때는 아무 일도 일어나지 않는다
  await expect(failure(page)).toHaveCount(0);
});

test('되돌릴 것이 없을 때의 실행 취소는 단계를 넘기지 않는다', async ({ page }) => {
  await openScenario(page);
  await reachEnterStep(page);
  // B2 입력 단계에서는 Ctrl+Z가 기대 조작이 아니므로 어떤 경우에도 이 단계에 머문다
  await page.keyboard.press('Control+z');
  await expect(stepTitle(page)).toHaveText('B2 입력');
  await expect(failure(page)).toHaveCount(0);
});

const guardsStyle = (page: Page, property: 'animationName' | 'animationDuration') =>
  page.evaluate(
    `getComputedStyle(document.querySelector('[data-testid="tutorial-step-guards"]')).${property}`,
  );

test('모션 감소 설정이면 단계 전환 애니메이션 시간이 0이다', async ({ page }) => {
  await page.addInitScript("window.localStorage.setItem('cellcraft.motion', 'reduce')");
  await openScenario(page);
  expect(parseFloat(String(await guardsStyle(page, 'animationDuration')))).toBeLessThan(0.001);
});

test('기본 설정에서는 단계 전환이 transform·opacity 애니메이션으로 실행된다', async ({ page }) => {
  await openScenario(page);
  expect(await guardsStyle(page, 'animationName')).toBe('cc-enter');
  expect(parseFloat(String(await guardsStyle(page, 'animationDuration')))).toBeGreaterThan(0);
});
