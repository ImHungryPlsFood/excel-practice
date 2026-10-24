import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-02E 포인트 모드 E2E (연습실 /sandbox, 실제 Chromium, R-08.02):
 * =SUM( 다음에 B3:B7을 끌면 =SUM(B3:B7이 들어가고 ) Enter로 결과가 보인다 — 셀 편집기와 수식 입력줄 양쪽.
 * 다른 시트 탭을 눌러 Sheet2!A1 참조를 넣는다. 넣을 수 없는 자리에서 셀을 누르면 확정·선택이다.
 * 한글 조합 중에는 포인트 모드가 켜지지 않는다(CDP Input.imeSetComposition, Q-05와 같은 방식).
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const formulaBar = (page: Page) => page.getByRole('textbox', { name: /^수식 입력줄/ });
const cellEditor = (page: Page) => page.getByRole('textbox', { name: /^연습실 시트 / });
const nameBox = (page: Page) => page.getByRole('textbox', { name: '이름 상자' });

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

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('요소가 화면에 없습니다');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function fillB3toB7(page: Page) {
  for (let row = 2; row <= 6; row += 1) await typeAt(page, row, 1, String(row - 1));
}

test('셀 편집기: =SUM( 다음 B3:B7을 끌면 참조가 들어가고 ) Enter로 결과가 보인다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openSandbox(page);
  await fillB3toB7(page);

  await cell(page, 0, 3).click();
  await page.keyboard.type('=SUM(');
  const from = await center(cell(page, 2, 1));
  const to = await center(cell(page, 6, 1));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await expect(cellEditor(page)).toHaveValue('=SUM(B3');
  await page.mouse.move(to.x, to.y, { steps: 6 });
  // 끄는 동안 실시간으로 바뀌고 색 테두리가 보인다
  await expect(cellEditor(page)).toHaveValue('=SUM(B3:B7');
  await expect(page.locator('[data-reference-range]')).toHaveCount(1);
  await page.mouse.up();
  await expect(formulaBar(page)).toHaveValue('=SUM(B3:B7');

  await page.keyboard.type(')');
  await page.keyboard.press('Enter');
  await expect(cell(page, 0, 3)).toHaveText('15');
  // 확정하면 편집을 시작한 셀 아래로 간다(포인트 모드는 선택을 옮기지 않는다)
  await expect(nameBox(page)).toHaveValue('D2');
  await expect(page.locator('[data-reference-range]')).toHaveCount(0);
  // 포인트 모드 중 이동은 실행 취소 대상이 아니다: 한 번이면 수식 입력 전으로 돌아간다
  await page.keyboard.press('Control+z');
  await expect(cell(page, 0, 3)).toHaveText('');
  await expect(cell(page, 6, 1)).toHaveText('5');
  expect(errors).toEqual([]);
});

test('수식 입력줄에서도 같은 동작이고, enter 모드에서는 화살표가 참조를 움직인다', async ({
  page,
}) => {
  await openSandbox(page);
  await fillB3toB7(page);

  await cell(page, 1, 3).click();
  await formulaBar(page).click();
  await page.keyboard.type('=SUM(');
  const from = await center(cell(page, 2, 1));
  const to = await center(cell(page, 4, 1));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
  await expect(formulaBar(page)).toBeFocused();
  await expect(formulaBar(page)).toHaveValue('=SUM(B3:B5');
  await page.keyboard.type(')');
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 3)).toHaveText('6');

  // 셀에 바로 타이핑(enter 모드): = 다음 ↑ ↑ → D1… 은 편집 셀(E3)에서 출발
  await cell(page, 2, 4).click();
  await page.keyboard.type('=');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(cellEditor(page)).toHaveValue('=B3');
  await page.keyboard.press('Shift+ArrowDown');
  await expect(cellEditor(page)).toHaveValue('=B3:B4');
  await page.keyboard.press('Enter');
  await expect(cell(page, 2, 4)).toHaveText('#VALUE!');
  await cell(page, 2, 4).click();
  await expect(formulaBar(page)).toHaveValue('=B3:B4');
});

test('다른 시트 탭을 누르면 Sheet2!A1처럼 시트 이름이 붙은 참조를 넣고, 확정하면 처음 시트로 돌아온다', async ({
  page,
}) => {
  await openSandbox(page);
  await page.getByRole('button', { name: '시트 추가' }).click();
  await typeAt(page, 0, 0, '100');
  await page.getByRole('tab', { name: 'Sheet1' }).click();

  await cell(page, 0, 4).click();
  await page.keyboard.type('=10+');
  await page.getByRole('tab', { name: 'Sheet2' }).click();
  await expect(page.getByRole('tab', { name: 'Sheet2' })).toHaveAttribute('aria-selected', 'true');
  await expect(formulaBar(page)).toBeFocused();
  await expect(formulaBar(page)).toHaveValue('=10+Sheet2!E1');
  await cell(page, 0, 0).click();
  await expect(formulaBar(page)).toHaveValue('=10+Sheet2!A1');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('tab', { name: 'Sheet1' })).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 0, 4)).toHaveText('110');
  await cell(page, 0, 4).click();
  await expect(formulaBar(page)).toHaveValue('=10+Sheet2!A1');
  // Sheet2의 A1은 그대로다
  await page.getByRole('tab', { name: 'Sheet2' }).click();
  await expect(cell(page, 0, 0)).toHaveText('100');
});

test('커서가 참조를 넣을 수 없는 자리면 셀 클릭은 확정·선택이다', async ({ page }) => {
  await openSandbox(page);
  await typeAt(page, 0, 0, '4');
  await cell(page, 0, 5).click();
  await page.keyboard.type('=A1');
  await cell(page, 4, 6).click();
  await expect(nameBox(page)).toHaveValue('G5');
  await expect(cell(page, 0, 5)).toHaveText('4');
  await cell(page, 0, 5).click();
  await expect(formulaBar(page)).toHaveValue('=A1');
});

test('한글 조합 중에는 셀을 눌러도 포인트 모드가 켜지지 않는다', async ({ page }) => {
  await openSandbox(page);
  await typeAt(page, 2, 1, '7');
  const cdp = await page.context().newCDPSession(page);

  await cell(page, 0, 7).click();
  await page.keyboard.type('=');
  await cdp.send('Input.imeSetComposition', { text: 'ㅎ', selectionStart: 1, selectionEnd: 1 });
  await expect(cellEditor(page)).toHaveValue('=ㅎ');
  await cell(page, 2, 1).click();
  // 참조가 들어가지 않았다: 조합 중 글자를 포함한 초안이 확정되고 누른 셀이 선택된다
  await expect(nameBox(page)).toHaveValue('B3');
  // 조합을 끝낸다(Input.insertText = 실제 IME의 확정). 확정된 글자로 B3 편집이 시작되므로 Esc로 취소한다.
  await cdp.send('Input.insertText', { text: 'ㅎ' });
  await page.keyboard.press('Escape');
  await expect(cell(page, 2, 1)).toHaveText('7');
  await cell(page, 0, 7).click();
  await expect(formulaBar(page)).not.toHaveValue(/B3/);

  // 조합이 끝난 뒤에는 다시 켜진다
  await cell(page, 1, 7).click();
  await page.keyboard.type('=');
  await cell(page, 2, 1).click();
  await expect(cellEditor(page)).toHaveValue('=B3');
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 7)).toHaveText('7');
});
