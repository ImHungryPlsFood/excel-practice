import { expect, test, type Page } from '@playwright/test';

/*
 * CARD-02D 연습실 E2E (/sandbox, MASTER_PROMPT §4.5): 실제 Chromium에서
 * 빈 시트 입력·수식(R-04.45·47·48), 실행 취소(R-04.51), 여러 시트(R-04.49), 샘플(R-04.46),
 * 브라우저 저장 → 새로고침 → 불러오기, 파일 내려받기 → 올리기 왕복(R-04.52)을 확인한다.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const formulaBar = (page: Page) => page.getByRole('textbox', { name: /^수식 입력줄/ });
const toolbar = (page: Page) => page.getByRole('toolbar', { name: '연습실 도구' });
const tool = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true });
const notice = (page: Page) => page.getByRole('status', { name: '연습실 알림' });
const tabNames = (page: Page) => page.getByRole('tablist', { name: '시트' }).getByRole('tab');

async function typeAt(page: Page, row: number, col: number, text: string) {
  await cell(page, row, col).click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

async function openSandbox(page: Page) {
  await page.goto('/dashboard');
  await page
    .getByRole('navigation', { name: '주 메뉴' })
    .getByRole('link', { name: '연습실' })
    .click();
  await expect(page).toHaveURL(/\/sandbox$/);
  await expect(page.getByRole('grid', { name: '연습실 시트' })).toBeVisible();
  await expect(tool(page, '빈 스프레드시트')).toBeEnabled();
}

// 테스트마다 새 브라우저 컨텍스트라 localStorage는 비어 있다(Playwright 기본 격리).

test('빈 시트에 값과 수식을 입력하고 Ctrl+Z·Ctrl+Y로 되돌린다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openSandbox(page);

  await typeAt(page, 0, 0, '12');
  await typeAt(page, 0, 1, '=A1*3');
  await expect(cell(page, 0, 1)).toHaveText('36');

  await page.keyboard.press('Control+z');
  await expect(cell(page, 0, 1)).toHaveText('');
  await page.keyboard.press('Control+z');
  await expect(cell(page, 0, 0)).toHaveText('');
  await page.keyboard.press('Control+y');
  await page.keyboard.press('Control+y');
  await expect(cell(page, 0, 1)).toHaveText('36');
  await cell(page, 0, 1).click();
  await expect(formulaBar(page)).toHaveValue('=A1*3');
  expect(errors).toEqual([]);
});

test('시트 추가·이름 변경·삭제와 실행 취소, 다른 시트 참조', async ({ page }) => {
  await openSandbox(page);
  await typeAt(page, 0, 0, '5');

  await page.getByRole('button', { name: '시트 추가' }).click();
  await expect(tabNames(page)).toHaveText(['Sheet1', 'Sheet2']);
  await typeAt(page, 0, 0, '=Sheet1!A1*2');
  await expect(cell(page, 0, 0)).toHaveText('10');

  // Sheet1 이름을 바꾸면 Sheet2의 수식이 새 이름을 따른다.
  await page.getByRole('tab', { name: 'Sheet1' }).dblclick();
  await page.getByRole('textbox', { name: 'Sheet1 시트 새 이름' }).fill('자료');
  await page.keyboard.press('Enter');
  await expect(tabNames(page)).toHaveText(['자료', 'Sheet2']);
  await page.getByRole('tab', { name: 'Sheet2' }).click();
  await cell(page, 0, 0).click();
  await expect(formulaBar(page)).toHaveValue("='자료'!A1*2");
  await expect(cell(page, 0, 0)).toHaveText('10');

  // 한글 시트 이름을 따옴표 없이 써도 계산된다.
  await typeAt(page, 1, 0, '=자료!A1+1');
  await expect(cell(page, 1, 0)).toHaveText('6');

  // 값이 있는 시트 삭제는 확인 후, 실행 취소로 복원
  await page.getByRole('tab', { name: '자료' }).click();
  await page.getByRole('button', { name: '시트 삭제' }).click();
  await page
    .getByRole('alertdialog', { name: '시트 삭제 확인' })
    .getByRole('button', { name: '삭제' })
    .click();
  await expect(tabNames(page)).toHaveText(['Sheet2']);
  await expect(cell(page, 0, 0)).toHaveText('#REF!');

  await tool(page, '실행 취소').click();
  await expect(tabNames(page)).toHaveText(['자료', 'Sheet2']);
  await expect(cell(page, 0, 0)).toHaveText('5');
  await page.getByRole('tab', { name: 'Sheet2' }).click();
  await expect(cell(page, 0, 0)).toHaveText('10');
});

test('샘플을 불러오고, 원래 내용은 실행 취소로 되찾는다', async ({ page }) => {
  await openSandbox(page);
  await typeAt(page, 0, 0, '내 메모');
  await tool(page, '샘플 데이터').click();
  await page.getByRole('button', { name: '상품 재고 불러오기' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '샘플로 바꾸기' }).click();
  await expect(cell(page, 0, 0)).toHaveText('상품코드');
  await expect(cell(page, 2, 5)).toHaveText('보충 필요');
  await expect(cell(page, 7, 3)).toHaveText('3');
  await expect(cell(page, 1, 3)).toHaveCSS('text-align', 'right');

  await tool(page, '실행 취소').click();
  await expect(cell(page, 0, 0)).toHaveText('내 메모');
  await expect(cell(page, 0, 1)).toHaveText('');
});

test('브라우저에 저장하고 새로고침한 뒤 불러오면 값·수식·시트 구성이 같다', async ({ page }) => {
  await openSandbox(page);
  await tool(page, '샘플 데이터').click();
  await page.getByRole('button', { name: '판매 내역 불러오기' }).click();
  await page.getByRole('button', { name: '시트 추가' }).click();
  await typeAt(page, 0, 0, '=SUM(Sheet1!F2:F9)');
  await page.getByRole('tab', { name: 'Sheet2' }).dblclick();
  await page.getByRole('textbox', { name: 'Sheet2 시트 새 이름' }).fill('요약');
  await page.keyboard.press('Enter');
  const total = (await cell(page, 0, 0).textContent()) ?? '';
  expect(Number(total)).toBeGreaterThan(0);

  await tool(page, '저장').click();
  const form = page.getByRole('form', { name: '브라우저에 저장' });
  await form.getByRole('textbox', { name: '파일 이름' }).fill('판매 연습');
  await form.getByRole('button', { name: '저장' }).click();
  await expect(notice(page)).toContainText("'판매 연습'(으)로 브라우저에 저장했습니다");

  await page.reload();
  await expect(tool(page, '빈 스프레드시트')).toBeEnabled();
  await expect(tabNames(page)).toHaveText(['Sheet1']);
  await expect(cell(page, 0, 0)).toHaveText('');

  await tool(page, '저장한 파일 열기').click();
  await page.getByRole('button', { name: '판매 연습 불러오기' }).click();
  await expect(tabNames(page)).toHaveText(['Sheet1', '요약']);
  await expect(page.getByRole('tab', { name: '요약' })).toHaveAttribute('aria-selected', 'true');
  await expect(cell(page, 0, 0)).toHaveText(total);
  await cell(page, 0, 0).click();
  await expect(formulaBar(page)).toHaveValue('=SUM(Sheet1!F2:F9)');
  await page.getByRole('tab', { name: 'Sheet1' }).click();
  await cell(page, 1, 5).click();
  await expect(formulaBar(page)).toHaveValue('=D2*E2');
  await expect(cell(page, 1, 5)).toHaveText('72000');
});

test('파일로 내려받은 JSON을 다시 올리면 같은 내용이 복원되고, 손상된 파일은 거부한다', async ({
  page,
}, testInfo) => {
  await openSandbox(page);
  await typeAt(page, 0, 0, '7');
  await typeAt(page, 0, 1, '=A1*6');
  await page.getByRole('button', { name: '시트 추가' }).click();
  await typeAt(page, 2, 2, '두 번째 시트');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    tool(page, '파일로 내려받기').click(),
  ]);
  expect(download.suggestedFilename()).toBe('연습 1.cellcraft.json');
  const saved = testInfo.outputPath('sandbox.json');
  await download.saveAs(saved);

  await tool(page, '빈 스프레드시트').click();
  await expect(tabNames(page)).toHaveText(['Sheet1']);
  await expect(cell(page, 0, 1)).toHaveText('');

  const upload = page.getByLabel('연습실 파일 올리기');
  await upload.setInputFiles(saved);
  await expect(notice(page)).toContainText('파일을 불러왔습니다');
  await expect(tabNames(page)).toHaveText(['Sheet1', 'Sheet2']);
  await expect(cell(page, 2, 2)).toHaveText('두 번째 시트');
  await page.getByRole('tab', { name: 'Sheet1' }).click();
  await expect(cell(page, 0, 1)).toHaveText('42');

  await upload.setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      '{"format":"cellcraft-sandbox","version":1,"name":"x","savedAt":"2026-10-23","sheets":[{"name":"S","cells":{"ZZZ1":"1"}}]}',
    ),
  });
  await expect(notice(page)).toContainText('broken.json');
  await expect(notice(page)).toContainText('셀 주소');
  await expect(cell(page, 0, 1)).toHaveText('42');
});
