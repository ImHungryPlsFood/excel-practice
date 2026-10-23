import { expect, test, type CDPSession, type Page } from '@playwright/test';

/*
 * CARD-02A 그리드 E2E. 개발 전용 화면(/dev/grid)에서 실제 Chromium 레이아웃·입력으로 검증한다.
 * 한글 IME는 Chromium DevTools Protocol의 Input.imeSetComposition(조합 중 글자)과
 * Input.insertText(조합 확정)로 실제 IME와 같은 composition 이벤트 순서를 만든다.
 */

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const gridInput = (page: Page) => page.getByRole('textbox');
const expectActive = (page: Page, address: string, editing = false) =>
  expect(gridInput(page)).toHaveAccessibleName(
    `개발 확인용 시트 ${address} 셀${editing ? ' 편집 중' : ''}`,
  );

/** 개발 화면이 window에 걸어 둔 그리드 핸들로 좌표 API를 부른다. */
function getCellViewportRect(page: Page, row: number, col: number): Promise<Rect | null> {
  return page.evaluate(
    ([r, c]) => {
      const holder = globalThis as unknown as {
        __cellcraftGridRef?: {
          current: { getCellViewportRect: (row: number, col: number) => Rect | null } | null;
        };
      };
      const handle = holder.__cellcraftGridRef?.current;
      if (!handle) throw new Error('그리드 핸들이 없습니다');
      return handle.getCellViewportRect(r, c);
    },
    [row, col] as const,
  );
}

function scrollToCell(page: Page, row: number, col: number): Promise<void> {
  return page.evaluate(
    ([r, c]) => {
      const holder = globalThis as unknown as {
        __cellcraftGridRef?: {
          current: { scrollToCell: (row: number, col: number) => void } | null;
        };
      };
      const handle = holder.__cellcraftGridRef?.current;
      if (!handle) throw new Error('그리드 핸들이 없습니다');
      handle.scrollToCell(r, c);
    },
    [row, col] as const,
  );
}

async function expectRectMatchesCell(page: Page, row: number, col: number) {
  const target = cell(page, row, col);
  await expect(target).toBeVisible();
  const box = await target.boundingBox();
  const rect = await getCellViewportRect(page, row, col);
  expect(box).not.toBeNull();
  expect(rect).not.toBeNull();
  if (box === null || rect === null) return;
  expect(rect.left).toBeCloseTo(box.x, 0);
  expect(rect.top).toBeCloseTo(box.y, 0);
  expect(rect.width).toBeCloseTo(box.width, 0);
  expect(rect.height).toBeCloseTo(box.height, 0);
}

/** 한 글자씩 조합한 뒤 확정한다. 마지막 글자는 확정하지 않고 조합 중으로 남길 수 있다. */
async function composeKorean(
  cdp: CDPSession,
  syllables: ReadonlyArray<{ steps: readonly string[] }>,
  leaveLastComposing = false,
) {
  for (const [index, { steps }] of syllables.entries()) {
    for (const text of steps) {
      await cdp.send('Input.imeSetComposition', {
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
    }
    const isLast = index === syllables.length - 1;
    if (!(isLast && leaveLastComposing)) {
      await cdp.send('Input.insertText', { text: steps[steps.length - 1] ?? '' });
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/grid');
  await expect(page.getByRole('grid', { name: '개발 확인용 시트' })).toBeVisible();
});

test('셀 클릭, 화살표, Enter, Tab으로 활성 셀을 옮긴다', async ({ page }) => {
  await cell(page, 2, 1).click();
  await expectActive(page, 'B3');
  await expect(gridInput(page)).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expectActive(page, 'C4');
  await page.keyboard.press('Enter');
  await expectActive(page, 'C5');
  await page.keyboard.press('Shift+Enter');
  await expectActive(page, 'C4');
  await page.keyboard.press('Tab');
  await expectActive(page, 'D4');
  await page.keyboard.press('Shift+Tab');
  await expectActive(page, 'C4');
  // Tab이 그리드 밖으로 포커스를 빼앗기지 않는다
  await expect(gridInput(page)).toBeFocused();

  // 이미 활성인 셀도 더블클릭으로 편집할 수 있다 (투명 입력 상자가 마우스를 가로채지 않음)
  await cell(page, 3, 2).dblclick();
  await expectActive(page, 'C4', true);
  await page.keyboard.press('Escape');
  await expectActive(page, 'C4');
});

test('마우스 드래그와 Shift+화살표로 범위를 선택한다', async ({ page }) => {
  const from = await cell(page, 1, 1).boundingBox();
  const to = await cell(page, 3, 2).boundingBox();
  if (from === null || to === null) throw new Error('셀 위치를 찾지 못했습니다');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  await expectActive(page, 'C4');
  for (const [row, col] of [
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 2],
    [3, 2],
  ] as const) {
    await expect(cell(page, row, col)).toHaveAttribute('aria-selected', 'true');
  }
  await expect(cell(page, 4, 2)).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('columnheader', { name: 'B' })).toHaveClass(/bg-selected-bg/);

  await page.keyboard.press('Shift+ArrowDown');
  await expect(cell(page, 4, 2)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-selected', 'false');
});

test('셀에 입력하고 Enter로 확정하며, Delete로 범위 내용을 지운다', async ({ page }) => {
  await cell(page, 0, 0).click();
  await page.keyboard.type('1250');
  await expectActive(page, 'A1', true);
  await page.keyboard.press('Enter');
  await expect(cell(page, 0, 0)).toHaveText('1250');
  await expectActive(page, 'A2');

  await page.keyboard.type('지점');
  await page.keyboard.press('Tab');
  await expect(cell(page, 1, 0)).toHaveText('지점');

  await cell(page, 0, 0).dblclick();
  await expectActive(page, 'A1', true);
  await page.keyboard.press('End');
  await page.keyboard.type('0');
  await page.keyboard.press('Enter');
  await expect(cell(page, 0, 0)).toHaveText('12500');

  await cell(page, 0, 0).click();
  await cell(page, 1, 0).click({ modifiers: ['Shift'] });
  await page.keyboard.press('Delete');
  await expect(cell(page, 0, 0)).toHaveText('');
  await expect(cell(page, 1, 0)).toHaveText('');
});

test('한글 IME: 조합 중 Enter는 확정하지 않고, "합계"·"홍길동"이 깨지거나 중복되지 않는다', async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cell(page, 0, 0).click();

  // 합계: 마지막 글자 '계'를 조합 중인 상태에서 Enter
  await composeKorean(cdp, [{ steps: ['ㅎ', '하', '합'] }, { steps: ['ㄱ', '계'] }], true);
  await expect(gridInput(page)).toHaveValue('합계');
  await page.keyboard.press('Enter'); // 조합 확정용 Enter: 셀은 그대로 편집 중이어야 한다
  await expectActive(page, 'A1', true);
  await expect(cell(page, 0, 0)).toHaveText('');

  await cdp.send('Input.insertText', { text: '계' });
  await page.keyboard.press('Enter'); // 셀 확정용 Enter
  await expect(cell(page, 0, 0)).toHaveText('합계');
  await expectActive(page, 'A2');

  // 홍길동: 모두 확정한 뒤 Enter 한 번이면 한 칸만 이동
  await composeKorean(cdp, [
    { steps: ['ㅎ', '호', '홍'] },
    { steps: ['ㄱ', '기', '길'] },
    { steps: ['ㄷ', '도', '동'] },
  ]);
  await page.keyboard.press('Enter');
  await expect(cell(page, 1, 0)).toHaveText('홍길동');
  await expectActive(page, 'A3');
  await expect(cell(page, 2, 0)).toHaveText('');
});

test('좌표 API는 스크롤 전후 모두 실제 셀 DOMRect와 일치한다', async ({ page }) => {
  await expectRectMatchesCell(page, 0, 0);
  await expectRectMatchesCell(page, 3, 2);

  const grid = page.getByRole('grid', { name: '개발 확인용 시트' });
  await grid.hover();
  await page.mouse.wheel(250, 700);
  await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const first = await grid.evaluate((element) => ({
    top: element.scrollTop,
    left: element.scrollLeft,
  }));
  const row = Math.floor(first.top / 24) + 5;
  const col = Math.floor(first.left / 96) + 2;
  await expectRectMatchesCell(page, row, col);

  // 아직 렌더링되지 않은(가상화로 DOM에 없는) 셀로 이동한 뒤에도 일치한다.
  await expect(cell(page, 180, 24)).toHaveCount(0);
  await scrollToCell(page, 180, 24);
  await expectRectMatchesCell(page, 180, 24);
});

test('그리드 셀은 카드 컴포넌트 스타일(둥글기·그림자)을 쓰지 않는다 (R-12.25)', async ({
  page,
}) => {
  const target = cell(page, 1, 1);
  await expect(target).toHaveCSS('border-top-left-radius', '0px');
  await expect(target).toHaveCSS('box-shadow', 'none');
});
