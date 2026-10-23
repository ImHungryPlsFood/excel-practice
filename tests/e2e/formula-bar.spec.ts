import { expect, test, type CDPSession, type Page } from '@playwright/test';

/*
 * CARD-02C 수식 입력줄·셀 편집·수식 엔진 연동 E2E. 개발 전용 화면(/dev/workspace)에서 실제 Chromium으로 검증한다.
 * 예제 데이터: A1:D4 = 품목/수량/단가/금액, 사과 3 1200 =B2*C2, 배 2 2500 =B3*C3, 합계 =SUM(D2:D3)
 * 한글 IME는 CDP Input.imeSetComposition(조합 중)과 Input.insertText(확정)로 실제 IME와 같은 이벤트 순서를 만든다.
 */

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const formulaBar = (page: Page) => page.getByRole('textbox', { name: /^수식 입력줄/ });
const nameBox = (page: Page) => page.getByRole('textbox', { name: '이름 상자' });
const cellEditor = (page: Page) => page.getByRole('textbox', { name: /^작업 시트 / });
const message = (page: Page) => page.locator('[role="status"][id]');
const workStatus = (page: Page) => page.getByRole('status', { name: '작업 상태' });

async function composeKorean(cdp: CDPSession, steps: readonly string[]) {
  for (const text of steps) {
    await cdp.send('Input.imeSetComposition', {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/workspace');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  // 엔진 초기화가 끝나면 수식 셀에 계산 결과가 보인다.
  await expect(cell(page, 1, 3)).toHaveText('3600');
});

test('셀을 고르면 이름 상자와 입력줄에 주소와 원문이 보이고, 셀에는 계산 결과가 보인다', async ({
  page,
}) => {
  await cell(page, 1, 3).click();
  await expect(nameBox(page)).toHaveValue('D2');
  await expect(formulaBar(page)).toHaveValue('=B2*C2');
  await expect(cell(page, 1, 3)).toHaveText('3600');
  await expect(cell(page, 3, 3)).toHaveText('8600');
  await expect(workStatus(page)).toHaveText('D2: 3600');
});

test('입력줄에서 수식을 입력하고 Enter를 누르면 셀에 결과가 보이고 아래 셀로 이동한다', async ({
  page,
}) => {
  await cell(page, 5, 1).click();
  await formulaBar(page).click();
  await formulaBar(page).fill('=D4/2');
  // 입력줄에서 치는 동안 셀 위 편집기에도 같은 초안이 보인다.
  await expect(cellEditor(page)).toHaveValue('=D4/2');
  await page.keyboard.press('Enter');
  await expect(cell(page, 5, 1)).toHaveText('4300');
  await expect(nameBox(page)).toHaveValue('B7');
  await expect(cellEditor(page)).toBeFocused();
});

test('셀에서 직접 입력해도 입력줄과 같은 결과가 나온다', async ({ page }) => {
  await cell(page, 5, 2).click();
  await page.keyboard.type('=D4/2');
  await expect(formulaBar(page)).toHaveValue('=D4/2');
  await page.keyboard.press('Enter');
  await expect(cell(page, 5, 2)).toHaveText('4300');
  await expect(nameBox(page)).toHaveValue('C7');
});

test('셀 편집 중 입력줄을 눌러도 같은 편집이 이어진다', async ({ page }) => {
  await cell(page, 6, 1).click();
  await page.keyboard.type('=B2');
  await formulaBar(page).click();
  await expect(cell(page, 6, 1)).toHaveText('');
  await page.keyboard.type('+10');
  await expect(cellEditor(page)).toHaveValue('=B2+10');
  await page.keyboard.press('Enter');
  await expect(cell(page, 6, 1)).toHaveText('13');
});

test('원본 셀 값을 바꾸면 의존 셀이 연쇄로 다시 계산된다', async ({ page }) => {
  await cell(page, 1, 1).click();
  await page.keyboard.type('10');
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 3)).toHaveText('12000');
  await expect(cell(page, 3, 3)).toHaveText('17000');
});

test('오류 셀은 오류 코드로 보이고, 고르면 한국어 안내가 나온다', async ({ page }) => {
  await cell(page, 5, 0).click();
  await page.keyboard.type('=B2/0');
  await page.keyboard.press('Enter');
  await expect(cell(page, 5, 0)).toHaveText('#DIV/0!');
  await expect(cell(page, 5, 0)).toHaveAttribute('aria-invalid', 'true');
  await cell(page, 5, 0).click();
  await expect(message(page)).toContainText('0으로 나눌 수 없습니다');
  await expect(workStatus(page)).toHaveText('A6: 오류 #DIV/0!');
});

test('지원하지 않는 함수는 이름과 대체 방법을 안내한다', async ({ page }) => {
  await cell(page, 5, 0).click();
  await page.keyboard.type('=XMATCH(2,B2:B3)');
  await page.keyboard.press('Enter');
  await expect(cell(page, 5, 0)).toHaveText('#NAME?');
  await cell(page, 5, 0).click();
  await expect(message(page)).toContainText('XMATCH는 지원하지 않습니다');
});

test('한글 IME: 입력줄에서 조합 중 Enter는 확정하지 않는다', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cell(page, 6, 0).click();
  await formulaBar(page).click();
  await composeKorean(cdp, ['ㅎ', '하', '합', '합ㄱ', '합계']);
  await expect(formulaBar(page)).toHaveValue('합계');
  await page.keyboard.press('Enter'); // 조합 확정용 Enter: 셀은 아직 확정되지 않아야 한다
  await expect(cell(page, 6, 0)).toHaveText('');
  await expect(formulaBar(page)).toHaveAttribute('data-editing', 'true');
  await cdp.send('Input.insertText', { text: '합계' });
  await page.keyboard.press('Enter'); // 셀 확정용 Enter
  await expect(cell(page, 6, 0)).toHaveText('합계');
  await expect(nameBox(page)).toHaveValue('A8');
});

test('F4는 입력줄과 셀 편집기에서 참조 고정을 순환한다', async ({ page }) => {
  await cell(page, 7, 0).click();
  await formulaBar(page).click();
  await page.keyboard.type('=B2');
  await page.keyboard.press('F4');
  await expect(formulaBar(page)).toHaveValue('=$B$2');
  await page.keyboard.press('F4');
  await expect(formulaBar(page)).toHaveValue('=B$2');
  await page.keyboard.press('Escape');

  await cell(page, 7, 1).click();
  await page.keyboard.press('F2');
  await page.keyboard.type('=C3');
  await page.keyboard.press('F4');
  await expect(cellEditor(page)).toHaveValue('=$C$3');
  await page.keyboard.press('Enter');
  await expect(cell(page, 7, 1)).toHaveText('2500');
});

test('이름 상자에 주소를 넣으면 그 셀로 이동한다', async ({ page }) => {
  await nameBox(page).click();
  await nameBox(page).fill('C3');
  await page.keyboard.press('Enter');
  await expect(formulaBar(page)).toHaveValue('2500');
  await expect(cellEditor(page)).toBeFocused();
});

test('다시 시작은 처음 데이터로 되돌린다', async ({ page }) => {
  await cell(page, 1, 1).click();
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 3)).toHaveText('120000');
  await page.getByRole('button', { name: '다시 시작' }).click();
  await expect(cell(page, 1, 1)).toHaveText('3');
  await expect(cell(page, 1, 3)).toHaveText('3600');
});

test('getFormulaBarRect는 실제 수식 입력줄 좌표와 같다', async ({ page }) => {
  const rect = await page.evaluate(() => {
    const holder = globalThis as unknown as {
      __cellcraftWorkspaceRef?: { current: { getFormulaBarRect: () => Rect | null } | null };
    };
    const handle = holder.__cellcraftWorkspaceRef?.current;
    if (!handle) throw new Error('작업 공간 핸들이 없습니다');
    return handle.getFormulaBarRect();
  });
  const box = await page.getByRole('group', { name: '수식 입력 도구' }).boundingBox();
  expect(rect).not.toBeNull();
  expect(box).not.toBeNull();
  if (rect === null || box === null) return;
  expect(rect.left).toBeCloseTo(box.x, 0);
  expect(rect.top).toBeCloseTo(box.y, 0);
  expect(rect.width).toBeCloseTo(box.width, 0);
  expect(rect.height).toBeCloseTo(box.height, 0);
  // 입력 상자는 이 좌표 안에 있다.
  const input = await formulaBar(page).boundingBox();
  expect(input).not.toBeNull();
  if (input === null) return;
  expect(input.y).toBeGreaterThanOrEqual(rect.top);
  expect(input.y + input.height).toBeLessThanOrEqual(rect.top + rect.height + 0.5);
});

test('학습 화면 레이아웃: 상단·작업 공간·하단이 있고 작업 공간이 가장 넓다', async ({ page }) => {
  await expect(page.getByRole('banner')).toContainText('나가기');
  await expect(page.getByRole('contentinfo')).toContainText('다시 시작');
  const main = await page.getByRole('main', { name: '작업 공간' }).boundingBox();
  const viewport = page.viewportSize();
  expect(main).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (main === null || viewport === null) return;
  expect(main.width).toBeGreaterThan(viewport.width * 0.9);
  // 내용이 없는 학습 안내·문제 패널은 그리지 않는다(R-04.44).
  await expect(page.getByRole('complementary')).toHaveCount(0);
});

// ---- CARD-02D: 셀 기본 정렬(R-08.22), 실행 취소(R-04.43·R-04.51, Q-06) ----

const expectAlign = (page: Page, row: number, col: number, align: string) =>
  expect(cell(page, row, col)).toHaveCSS('text-align', align);

async function typeAt(page: Page, row: number, col: number, text: string) {
  await cell(page, row, col).click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

test('서식 없는 셀은 값 종류에 따라 정렬된다: 숫자·날짜 오른쪽, 문자 왼쪽, 논리값·오류 가운데', async ({
  page,
}) => {
  await typeAt(page, 6, 0, '2024-03-15');
  await typeAt(page, 6, 1, "'123");
  await typeAt(page, 6, 2, 'TRUE');
  await typeAt(page, 6, 3, '=1/0');
  await expect(cell(page, 6, 3)).toHaveText('#DIV/0!');

  await expectAlign(page, 1, 1, 'right'); // 3
  await expectAlign(page, 1, 3, 'right'); // 수식 결과 3600
  await expectAlign(page, 0, 0, 'left'); // 품목
  await expectAlign(page, 6, 0, 'right'); // 날짜
  await expectAlign(page, 6, 1, 'left'); // 문자로 저장된 숫자
  await expect(cell(page, 6, 1)).toHaveText('123');
  await expectAlign(page, 6, 2, 'center');
  await expectAlign(page, 6, 3, 'center');

  // 수식 결과 종류가 바뀌면 정렬도 바뀐다.
  await typeAt(page, 7, 0, '=IF(B2>5,"많음",B2)');
  await expectAlign(page, 7, 0, 'right');
  await typeAt(page, 1, 1, '9');
  await expect(cell(page, 7, 0)).toHaveText('많음');
  await expectAlign(page, 7, 0, 'left');
});

test('Ctrl+Z·Ctrl+Y와 하단 실행 취소·다시 실행 버튼으로 값과 수식을 되돌린다', async ({ page }) => {
  const undo = page.getByRole('contentinfo').getByRole('button', { name: '실행 취소' });
  const redo = page.getByRole('contentinfo').getByRole('button', { name: '다시 실행' });
  await expect(undo).toBeDisabled();

  await typeAt(page, 1, 1, '10');
  await expect(cell(page, 1, 3)).toHaveText('12000');
  await typeAt(page, 1, 3, '=B2+1');
  await expect(cell(page, 1, 3)).toHaveText('11');

  await page.keyboard.press('Control+z');
  await expect(cell(page, 1, 3)).toHaveText('12000');
  await cell(page, 1, 3).click();
  await expect(formulaBar(page)).toHaveValue('=B2*C2');

  await undo.click();
  await expect(cell(page, 1, 1)).toHaveText('3');
  await expect(cell(page, 3, 3)).toHaveText('8600');
  await expect(undo).toBeDisabled();

  await redo.click();
  await expect(cell(page, 1, 1)).toHaveText('10');
  await cell(page, 0, 0).click();
  await page.keyboard.press('Control+y');
  await expect(cell(page, 1, 3)).toHaveText('11');
});

test('다시 시작도 실행 취소로 되돌릴 수 있다 (MASTER_PROMPT §9.2)', async ({ page }) => {
  await typeAt(page, 5, 0, '내가 쓴 값');
  await page.getByRole('button', { name: '다시 시작' }).click();
  await expect(cell(page, 5, 0)).toHaveText('');
  await page.getByRole('contentinfo').getByRole('button', { name: '실행 취소' }).click();
  await expect(cell(page, 5, 0)).toHaveText('내가 쓴 값');
});
