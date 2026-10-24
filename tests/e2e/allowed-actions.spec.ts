import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-04E allowedActions 강제 E2E (/learn/*, 실제 Chromium).
 * 문제가 허용하지 않은 작업은 거부되고 한국어 안내가 나오며, 허용한 작업은 그대로 동작한다.
 * 마지막 테스트는 10문항 모두 권장 풀이대로 풀 수 있는지(강제가 정답 풀이를 막지 않는지) 확인한다.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const submitButton = (page: Page) => page.getByRole('button', { name: '제출', exact: true });
const resultDialog = (page: Page) => page.getByRole('dialog', { name: '문제 완료' });
const task = (page: Page) => page.getByRole('complementary', { name: '문제와 힌트' });

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

/** 채우기 핸들을 (fromRow, fromCol) 칸에서 (toRow, toCol) 칸까지 끈다. */
async function dragFill(
  page: Page,
  from: { row: number; col: number },
  to: { row: number; col: number },
) {
  await cell(page, from.row, from.col).click();
  await expect(cell(page, from.row, from.col)).toHaveAttribute('aria-selected', 'true');
  const handle = await center(page.locator('[data-fill-handle]'));
  const target = await center(cell(page, to.row, to.col));
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
}

async function open(page: Page, courseId: string) {
  await page.goto(`/learn/${courseId}`);
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
}

async function submitAndContinue(page: Page) {
  await submitButton(page).click();
  await expect(resultDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(resultDialog(page)).toHaveCount(0);
  const next = page.getByRole('button', { name: '다음 문제' });
  if ((await next.count()) > 0) await next.click();
  else await page.getByRole('button', { name: '코스 마치기' }).click();
}

const notice = (page: Page, text: string) => page.getByText(text).first();

/** 거부될 입력을 시도한다. 거부되면 편집기가 열려 있으므로 Esc로 닫는다. */
async function typeRefused(page: Page, row: number, col: number, text: string, message: string) {
  await typeAt(page, row, col, text);
  await expect(notice(page, message)).toBeVisible();
  await page.keyboard.press('Escape');
}

test.describe('수식 입력만 허용한 문제 (Level 0 첫 문제)', () => {
  test('붙여넣기·잘라내기·채우기·행 삽입은 거부되고, 값 입력은 채점으로 안내한다', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, 'level-0');

    // 값 입력은 거부하지 않고 채점해 HARDCODED_VALUE 안내를 보여 준다
    await typeAt(page, 5, 1, '19');
    await expect(cell(page, 5, 1)).toHaveText('19');
    await submitButton(page).click();
    await expect(page.getByRole('region', { name: '채점 결과' })).toContainText(
      '아직 완성되지 않았어요',
    );
    await expect(page.getByTestId('feedback-misconception')).toContainText('직접 입력하셨습니다');
    await cell(page, 5, 1).click();
    await page.keyboard.press('Delete');
    await expect(cell(page, 5, 1)).toHaveText('');

    // 수식 입력은 된다
    await typeAt(page, 5, 1, '=D3');
    await expect(cell(page, 5, 1)).toHaveText('19');

    // 붙여넣기
    await page.evaluate('navigator.clipboard.writeText("5")');
    await cell(page, 7, 1).click();
    await page.keyboard.press('Control+v');
    await expect(notice(page, '복사·붙여넣기와 잘라내기를 쓸 수 없습니다')).toBeVisible();
    await expect(cell(page, 7, 1)).toHaveText('');

    // 잘라내기(자기 칸을 옮긴다)
    await cell(page, 5, 1).click();
    await page.keyboard.press('Control+x');
    await cell(page, 8, 6).click();
    await page.keyboard.press('Control+v');
    await expect(cell(page, 8, 6)).toHaveText('');
    await expect(cell(page, 5, 1)).toHaveText('19');

    // 자동 채우기: 핸들 끌기, Ctrl+D
    await dragFill(page, { row: 5, col: 1 }, { row: 8, col: 1 });
    await expect(notice(page, '자동 채우기를 쓸 수 없습니다')).toBeVisible();
    await expect(cell(page, 7, 1)).toHaveText('');
    await cell(page, 5, 1).click();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Control+d');
    await expect(cell(page, 6, 1)).toHaveText('');

    // 행 삽입
    await page.getByRole('rowheader', { name: '10', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: '위에 행 삽입' }).click();
    await expect(notice(page, '행이나 열을 삽입하거나 삭제할 수 없습니다')).toBeVisible();

    // 실행 취소는 항상 된다
    await page.keyboard.press('Control+z');
    await expect(cell(page, 5, 1)).toHaveText('');
  });
});

test.describe('채우기·복사만 허용한 문제 (Level 0 세 번째 문제)', () => {
  test('복사해 붙여넣어 풀 수 있고, 값과 수식을 새로 입력하는 것은 거부된다', async ({ page }) => {
    await open(page, 'level-0');
    await typeAt(page, 5, 1, '=D3');
    await submitAndContinue(page);
    await typeAt(page, 7, 1, '=SUM(D3:F3)');
    await submitAndContinue(page);
    await expect(task(page)).toContainText('채우기로 금액 열 완성하기');

    // 값 입력은 채점으로 안내한다
    await typeAt(page, 6, 3, '19000');
    await submitButton(page).click();
    await expect(page.getByTestId('feedback-misconception')).toContainText('직접 입력하셨습니다');
    await cell(page, 6, 3).click();
    await page.keyboard.press('Delete');
    await expect(cell(page, 6, 3)).toHaveText('');
    // 수식 입력은 거부하되 무엇을 하면 되는지 알려 준다
    await typeRefused(
      page,
      6,
      3,
      '=B7*C7',
      '수식을 입력할 수 없습니다. 이 문제는 채우기 핸들을 끌어 보거나 복사해 붙여넣어 보세요.',
    );
    await expect(cell(page, 6, 3)).toHaveText('');

    // 복사해 붙여넣기: D2를 복사해 D3:D7에 붙여넣는다
    await cell(page, 1, 3).click();
    await page.keyboard.press('Control+c');
    await cell(page, 2, 3).click();
    await page.keyboard.down('Shift');
    await cell(page, 6, 3).click();
    await page.keyboard.up('Shift');
    await page.keyboard.press('Control+v');
    await expect(cell(page, 6, 3)).toHaveText('19000');

    // 행 삽입은 허용 목록에 없다
    await page.getByRole('rowheader', { name: '10', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: '위에 행 삽입' }).click();
    await expect(notice(page, '행이나 열을 삽입하거나 삭제할 수 없습니다')).toBeVisible();

    await submitAndContinue(page);
  });
});

/** 문제 제목 → 권장 풀이를 화면에서 실제로 수행하는 방법 */
const SOLUTIONS: Record<string, (page: Page) => Promise<void>> = {
  '표에서 칸 하나 가져오기': (page) => typeAt(page, 5, 1, '=D3'),
  '가로로 놓인 구간 선택하기': (page) => typeAt(page, 7, 1, '=SUM(D3:F3)'),
  '채우기로 금액 열 완성하기': (page) => dragFill(page, { row: 1, col: 3 }, { row: 6, col: 3 }),
  '쿠폰을 적용한 결제 금액': (page) => typeAt(page, 4, 1, '=B2*B3-B4'),
  '수식을 옆 열로 복사하기': (page) => dragFill(page, { row: 6, col: 1 }, { row: 6, col: 3 }),
  '전체 예산에서 차지하는 비율': async (page) => {
    await typeAt(page, 1, 2, '=B2/$B$6');
    await dragFill(page, { row: 1, col: 2 }, { row: 4, col: 2 });
  },
  '정산이 덜 끝난 행사 지출 합계': (page) => typeAt(page, 10, 2, '=SUM(C2:C9)'),
  '시험을 못 본 회차를 뺀 평균': (page) => typeAt(page, 6, 6, '=AVERAGE(B3:E3)'),
  '소수점 둘째 자리까지 반올림하기': (page) => typeAt(page, 1, 3, '=ROUND(B2/C2,2)'),
  '금액 뒤에 단위를 붙인 글자 만들기': (page) => typeAt(page, 1, 2, '=B2&"원"'),
};

test.describe('allowedActions를 켜도 10문항 모두 권장 풀이로 풀 수 있다', () => {
  for (const [courseId, titles] of [
    [
      'level-0',
      ['표에서 칸 하나 가져오기', '가로로 놓인 구간 선택하기', '채우기로 금액 열 완성하기'],
    ],
    [
      'level-2',
      ['쿠폰을 적용한 결제 금액', '수식을 옆 열로 복사하기', '전체 예산에서 차지하는 비율'],
    ],
    [
      'level-3',
      [
        '정산이 덜 끝난 행사 지출 합계',
        '시험을 못 본 회차를 뺀 평균',
        '소수점 둘째 자리까지 반올림하기',
        '금액 뒤에 단위를 붙인 글자 만들기',
      ],
    ],
  ] as const) {
    test(`${courseId}: ${titles.length}문항`, async ({ page }) => {
      await open(page, courseId);
      for (const title of titles) {
        await expect(task(page)).toContainText(title);
        const solve = SOLUTIONS[title];
        if (solve === undefined) throw new Error(`풀이가 없는 문제: ${title}`);
        await solve(page);
        await submitAndContinue(page);
      }
      await expect(page.getByRole('heading', { level: 1 })).toContainText('완료');
    });
  }
});
