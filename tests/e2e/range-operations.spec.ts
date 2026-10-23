import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-02E 범위 작업 E2E (연습실 /sandbox, 실제 Chromium):
 * 행·열 삽입·삭제와 수식 참조 갱신·#REF!(R-08.06), 열 너비 끌기, 복사·잘라내기·붙여넣기(R-08.07, R-08.17),
 * 채우기 핸들·Ctrl+D·Ctrl+R(R-08.10), 시트 순서·시트 이동 단축키. 모든 동작은 Ctrl+Z로 되돌아가야 한다.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const formulaBar = (page: Page) => page.getByRole('textbox', { name: /^수식 입력줄/ });
const tabNames = (page: Page) => page.getByRole('tablist', { name: '시트' }).getByRole('tab');

async function openSandbox(page: Page) {
  await page.goto('/sandbox');
  await expect(page.getByRole('grid', { name: '연습실 시트' })).toBeVisible();
  await expect(
    page
      .getByRole('toolbar', { name: '연습실 도구' })
      .getByRole('button', { name: '빈 스프레드시트' }),
  ).toBeEnabled();
}

async function typeAt(page: Page, row: number, col: number, text: string) {
  await cell(page, row, col).click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

async function rawOf(page: Page, row: number, col: number) {
  await cell(page, row, col).click();
  return formulaBar(page).inputValue();
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('요소가 화면에 없습니다');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test('행 삽입은 SUM 범위를 늘리고, 열 삭제는 사라진 참조를 #REF!로 바꾸며, 둘 다 Ctrl+Z로 되돌아간다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openSandbox(page);
  await typeAt(page, 0, 0, '1');
  await typeAt(page, 1, 0, '2');
  await typeAt(page, 2, 0, '3');
  await typeAt(page, 3, 0, '=SUM(A1:A3)');
  await typeAt(page, 0, 1, '=$A$3*10');
  await expect(cell(page, 3, 0)).toHaveText('6');

  // 2행 머리글 오른쪽 클릭 → 위에 행 삽입
  await page.getByRole('rowheader', { name: '2', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '위에 행 삽입' }).click();
  expect(await rawOf(page, 4, 0)).toBe('=SUM(A1:A4)');
  expect(await rawOf(page, 0, 1)).toBe('=$A$4*10');
  await typeAt(page, 1, 0, '100');
  await expect(cell(page, 4, 0)).toHaveText('106');

  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(cell(page, 3, 0)).toHaveText('6');
  expect(await rawOf(page, 3, 0)).toBe('=SUM(A1:A3)');

  // A열 삭제 → B1의 $A$3 참조가 사라져 #REF!
  await page.getByRole('columnheader', { name: 'A', exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '열 삭제' }).click();
  await expect(cell(page, 0, 0)).toHaveText('#REF!');
  expect(await rawOf(page, 0, 0)).toBe('=#REF!*10');
  await page.keyboard.press('Control+z');
  await expect(cell(page, 0, 1)).toHaveText('30');
  expect(errors).toEqual([]);
});

test('열 경계를 끌어 너비를 바꾸고 Ctrl+Z로 되돌린다', async ({ page }) => {
  await openSandbox(page);
  const header = page.getByRole('columnheader', { name: 'B', exact: true });
  const before = (await header.boundingBox())?.width ?? 0;
  const handle = header.locator('[data-resize-col]');
  const start = await center(handle);
  await drag(page, start, { x: start.x + 80, y: start.y });
  await expect
    .poll(async () => (await header.boundingBox())?.width ?? 0)
    .toBeGreaterThan(before + 60);
  const widened = (await cell(page, 0, 1).boundingBox())?.width ?? 0;
  expect(widened).toBeGreaterThan(before + 60);
  await cell(page, 0, 0).click();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await header.boundingBox())?.width ?? 0).toBe(before);
});

test('복사한 수식은 상대 참조가 옮겨진 채 붙여넣어지고, 잘라내기는 다른 수식 참조도 따라간다', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openSandbox(page);
  await typeAt(page, 0, 0, '1');
  await typeAt(page, 1, 0, '2');
  await typeAt(page, 0, 1, '=A1*10+$A$1');
  await expect(cell(page, 0, 1)).toHaveText('11');

  await cell(page, 0, 1).click();
  await page.keyboard.press('Control+c');
  await expect(page.locator('[data-copy-marquee]')).toBeVisible();
  // 시스템 클립보드에는 화면 표시값이 들어간다(Excel 방식)
  expect(await page.evaluate('navigator.clipboard.readText()')).toBe('11');
  await cell(page, 1, 1).click();
  await page.keyboard.press('Control+v');
  await expect(cell(page, 1, 1)).toHaveText('21');
  expect(await rawOf(page, 1, 1)).toBe('=A2*10+$A$1');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-copy-marquee]')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(cell(page, 1, 1)).toHaveText('');

  // 다른 프로그램에서 온 TSV는 그대로 넣는다
  // E2E 타입 검사(tsconfig.node.json)에는 DOM 타입이 없어 브라우저 쪽 코드는 문자열로 넘긴다.
  await page.evaluate('navigator.clipboard.writeText("가\\t나\\r\\n7\\t=A1+1\\r\\n")');
  await cell(page, 5, 0).click();
  await page.keyboard.press('Control+v');
  await expect(cell(page, 5, 1)).toHaveText('나');
  await expect(cell(page, 6, 1)).toHaveText('2');
  expect(await rawOf(page, 6, 1)).toBe('=A1+1');

  // 잘라내기: A1을 D4로 옮기면 B1 수식이 D4를 가리킨다
  await cell(page, 0, 0).click();
  await page.keyboard.press('Control+x');
  await cell(page, 3, 3).click();
  await page.keyboard.press('Control+v');
  await expect(cell(page, 0, 0)).toHaveText('');
  await expect(cell(page, 3, 3)).toHaveText('1');
  expect(await rawOf(page, 0, 1)).toBe('=D4*10+$D$4');
  await expect(cell(page, 0, 1)).toHaveText('11');
  await page.keyboard.press('Control+z');
  await expect(cell(page, 0, 0)).toHaveText('1');
  expect(await rawOf(page, 0, 1)).toBe('=A1*10+$A$1');
});

test('채우기 핸들로 숫자·날짜·수식을 늘리고, Ctrl+D·Ctrl+R로 채우며, 모두 되돌린다', async ({
  page,
}) => {
  await openSandbox(page);
  await typeAt(page, 0, 0, '1');
  await typeAt(page, 1, 0, '3');
  await typeAt(page, 0, 1, '2024-01-30');
  await typeAt(page, 0, 2, '=A1*2');

  // A1:A2 선택 후 핸들을 A5까지 → 5, 7, 9
  await cell(page, 0, 0).click();
  await cell(page, 1, 0).click({ modifiers: ['Shift'] });
  await drag(
    page,
    await center(page.locator('[data-fill-handle]')),
    await center(cell(page, 4, 0)),
  );
  await expect(cell(page, 2, 0)).toHaveText('5');
  await expect(cell(page, 4, 0)).toHaveText('9');

  // 날짜 한 칸 → 하루씩
  await cell(page, 0, 1).click();
  await drag(
    page,
    await center(page.locator('[data-fill-handle]')),
    await center(cell(page, 2, 1)),
  );
  expect(await rawOf(page, 2, 1)).toBe('2024-02-01');

  // 수식 → 상대 참조 이동
  await cell(page, 0, 2).click();
  await drag(
    page,
    await center(page.locator('[data-fill-handle]')),
    await center(cell(page, 4, 2)),
  );
  expect(await rawOf(page, 4, 2)).toBe('=A5*2');
  await expect(cell(page, 4, 2)).toHaveText('18');

  await page.keyboard.press('Control+z');
  await expect(cell(page, 4, 2)).toHaveText('');
  await expect(cell(page, 2, 1)).not.toHaveText('');

  // Ctrl+D: D1 수식을 D1:D3에
  await typeAt(page, 0, 3, '=A1+100');
  await cell(page, 0, 3).click();
  await cell(page, 2, 3).click({ modifiers: ['Shift'] });
  await page.keyboard.press('Control+d');
  expect(await rawOf(page, 2, 3)).toBe('=A3+100');
  await expect(cell(page, 2, 3)).toHaveText('105');
  // Ctrl+R: A1을 A1:C1 → B1·C1이 1로
  await cell(page, 5, 0).click();
  await page.keyboard.type('x');
  await page.keyboard.press('Enter');
  await cell(page, 5, 0).click();
  await cell(page, 5, 2).click({ modifiers: ['Shift'] });
  await page.keyboard.press('Control+r');
  await expect(cell(page, 5, 2)).toHaveText('x');
  await page.keyboard.press('Control+z');
  await expect(cell(page, 5, 2)).toHaveText('');
  // 페이지가 새로고침되거나 북마크 창이 뜨지 않았다
  await expect(page).toHaveURL(/\/sandbox$/);
});

test('시트 탭을 끌어 순서를 바꾸고, Ctrl+Shift+PageDown/PageUp으로 시트를 옮겨 다닌다', async ({
  page,
}) => {
  await openSandbox(page);
  await page.getByRole('button', { name: '시트 추가' }).click();
  await page.getByRole('button', { name: '시트 추가' }).click();
  await expect(tabNames(page)).toHaveText(['Sheet1', 'Sheet2', 'Sheet3']);

  await page.getByRole('tab', { name: 'Sheet3' }).dragTo(page.getByRole('tab', { name: 'Sheet1' }));
  await expect(tabNames(page)).toHaveText(['Sheet3', 'Sheet1', 'Sheet2']);
  await cell(page, 0, 0).click();
  await page.keyboard.press('Control+z');
  await expect(tabNames(page)).toHaveText(['Sheet1', 'Sheet2', 'Sheet3']);

  await page.getByRole('tab', { name: 'Sheet1' }).click();
  await cell(page, 0, 0).click();
  await page.keyboard.press('Control+Shift+PageDown');
  await expect(page.getByRole('tab', { name: 'Sheet2' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Control+Shift+PageUp');
  await expect(page.getByRole('tab', { name: 'Sheet1' })).toHaveAttribute('aria-selected', 'true');
});
