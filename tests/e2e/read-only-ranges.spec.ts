import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-04D 읽기 전용 칸 E2E (/learn/level-0 첫 문제, 실제 Chromium).
 * 원본 표(A1:E4)는 직접 입력·삭제·붙여넣기·자동 채우기·잘라내기·행/열 삭제 어느 경로로도 바뀌지 않고,
 * 작업 칸(B6)은 정상적으로 편집된다.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);

async function openProblem(page: Page) {
  await page.goto('/learn/level-0');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  await expect(cell(page, 1, 1)).toHaveText('42');
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('요소가 화면에 없습니다');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** 원본 표 전체가 처음과 같은지 */
async function expectOriginalIntact(page: Page) {
  const rows = [
    ['분야', '1주', '2주', '3주', '4주'],
    ['소설', '42', '38', '51', '47'],
    ['과학', '17', '22', '19', '25'],
    ['역사', '9', '14', '11', '16'],
  ];
  for (const [r, values] of rows.entries()) {
    for (const [c, value] of values.entries()) {
      await expect(cell(page, r, c)).toHaveText(value);
    }
  }
}

const refusal = (page: Page) => page.getByText('수정할 수 없습니다').first();

test.describe('읽기 전용 칸', () => {
  test('원본 칸은 회색으로 표시되고 작업 칸은 아니다', async ({ page }) => {
    await openProblem(page);
    await expect(cell(page, 1, 1)).toHaveAttribute('data-readonly', 'true');
    await expect(cell(page, 5, 1)).not.toHaveAttribute('data-readonly', 'true');
  });

  test('원본 칸에 직접 입력하거나 Delete로 지울 수 없다', async ({ page }) => {
    await openProblem(page);
    await cell(page, 1, 1).click();
    await page.keyboard.type('999');
    await page.keyboard.press('Enter');
    await expect(refusal(page)).toBeVisible();
    await expect(cell(page, 1, 1)).toHaveText('42');

    await cell(page, 2, 3).click();
    await page.keyboard.press('Delete');
    await expectOriginalIntact(page);
  });

  test('원본 칸 위에 붙여넣을 수 없다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openProblem(page);
    await page.evaluate('navigator.clipboard.writeText("1\\t2\\r\\n3\\t4\\r\\n")');
    await cell(page, 1, 1).click();
    await page.keyboard.press('Control+v');
    await expect(refusal(page)).toBeVisible();
    await expectOriginalIntact(page);
  });

  test('자동 채우기가 원본 칸으로 이어지면 막힌다', async ({ page }) => {
    await openProblem(page);
    await cell(page, 5, 1).click();
    await page.keyboard.type('7');
    await page.keyboard.press('Enter');
    await cell(page, 5, 1).click();
    await expect(cell(page, 5, 1)).toHaveAttribute('aria-selected', 'true');
    const handle = await center(page.locator('[data-fill-handle]'));
    const target = await center(cell(page, 3, 1));
    await page.mouse.move(handle.x, handle.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
    await expect(refusal(page)).toBeVisible();
    await expectOriginalIntact(page);
    await expect(cell(page, 4, 1)).toHaveText('');
  });

  test('원본 칸을 잘라내 옮길 수 없다', async ({ page }) => {
    await openProblem(page);
    await cell(page, 1, 1).click();
    await page.keyboard.press('Control+x');
    await cell(page, 8, 6).click();
    await page.keyboard.press('Control+v');
    await expect(cell(page, 8, 6)).toHaveText('');
    await expectOriginalIntact(page);
  });

  test('원본 행·열을 지우거나 밀어낼 수 없다', async ({ page }) => {
    await openProblem(page);
    await page.getByRole('rowheader', { name: '2', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: '행 삭제' }).click();
    await expect(refusal(page)).toBeVisible();
    await expectOriginalIntact(page);

    await page.getByRole('columnheader', { name: 'B', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: '열 삭제' }).click();
    await expectOriginalIntact(page);

    await page.getByRole('rowheader', { name: '3', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: '위에 행 삽입' }).click();
    await expectOriginalIntact(page);
  });

  test('작업 칸은 정상적으로 입력되고 실행 취소된다', async ({ page }) => {
    await openProblem(page);
    await cell(page, 5, 1).click();
    await page.keyboard.type('=D3');
    await page.keyboard.press('Enter');
    await expect(cell(page, 5, 1)).toHaveText('19');
    await page.keyboard.press('Control+z');
    await expect(cell(page, 5, 1)).toHaveText('');
    await expectOriginalIntact(page);
  });
});
