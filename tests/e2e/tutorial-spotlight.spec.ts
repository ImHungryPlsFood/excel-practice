import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * CARD-03C Spotlight·말풍선 E2E (/dev/tutorial, 실제 Chromium, MASTER_PROMPT §7.2, P-04).
 * 강조 테두리가 대상(셀·범위·UI)과 같은 자리에 그려지는지, 오버레이가 입력을 막지 않는지,
 * 화면 밖 대상으로 자동 스크롤·스크롤/창 크기 변경을 따라가는지, 키보드 조작(F6·Esc)과 '다음' 뒤 포커스 복귀,
 * 모션 감소 설정을 확인한다.
 */

// 테두리 사각형은 대상보다 SPOTLIGHT_PADDING(2px)만큼 크고, Chromium의 SVG 경계 상자는 선 두께의 절반(2px 선 → 1px)을 포함한다.
const PADDING = 2 + 1;

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const cellEditor = (page: Page) => page.getByRole('textbox', { name: /^작업 시트 / });
const stepTitle = (page: Page) => page.getByTestId('tutorial-step-title');
const ring = (page: Page) => page.getByTestId('spotlight-ring');
const callout = (page: Page) => page.getByTestId('tutorial-callout');
const nextButton = (page: Page) => page.getByRole('button', { name: '다음', exact: true });

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function box(locator: Locator): Promise<Box> {
  const result = await locator.boundingBox();
  if (result === null) throw new Error('요소가 화면에 없습니다');
  return result;
}

const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
};

/** 테두리가 대상 경계(+여백)와 1px 안에서 같아질 때까지 기다린다 */
async function expectRingAround(page: Page, target: () => Promise<Box>) {
  await expect
    .poll(async () => {
      const [r, t] = await Promise.all([ring(page).boundingBox(), target()]);
      if (r === null) return 'no-ring';
      const diffs = [
        r.x - (t.x - PADDING),
        r.y - (t.y - PADDING),
        r.width - (t.width + PADDING * 2),
        r.height - (t.height + PADDING * 2),
      ];
      return diffs.every((d) => Math.abs(d) <= 1) ? 'aligned' : diffs.map(Math.round).join(',');
    })
    .toBe('aligned');
}

/** 말풍선이 화면 안에 완전히 들어 있다 */
async function expectCalloutInsideViewport(page: Page) {
  const size = page.viewportSize();
  if (size === null) throw new Error('뷰포트 크기를 알 수 없습니다');
  await expect
    .poll(async () => {
      const b = await box(callout(page));
      return b.x >= 0 && b.y >= 0 && b.x + b.width <= size.width && b.y + b.height <= size.height;
    })
    .toBe(true);
}

/** 화면 한 점에 실제로 닿는 셀 (오버레이가 입력을 가로채지 않는지) */
// e2e tsconfig에는 DOM 타입이 없어 브라우저 쪽 코드는 문자열로 넘긴다(range-operations.spec과 같은 방식).
async function gridCellAt(page: Page, point: { x: number; y: number }) {
  return page.evaluate<string | null>(
    `(() => {
      const hit = document.elementFromPoint(${point.x}, ${point.y})?.closest('[role="gridcell"]');
      return hit ? hit.getAttribute('data-row') + ',' + hit.getAttribute('data-col') : null;
    })()`,
  );
}

const center = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

async function openTutorial(page: Page) {
  await page.goto('/dev/tutorial');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  await expect(stepTitle(page)).toHaveText('B2 선택');
}

test('강조 테두리가 단계마다 대상 셀·범위·UI와 같은 자리에 그려지고 입력은 그대로 통과한다', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTutorial(page);
  await expect(page.getByTestId('spotlight-overlay')).toBeVisible();

  // 1단계: B2
  await expectRingAround(page, () => box(cell(page, 1, 1)));
  await expectCalloutInsideViewport(page);
  // 구멍 안(B2)과 어두운 영역(A11) 모두 실제 셀이 포인터를 받는다
  expect(await gridCellAt(page, center(await box(cell(page, 1, 1))))).toBe('1,1');
  expect(await gridCellAt(page, center(await box(cell(page, 10, 0))))).toBe('10,0');
  await cell(page, 1, 1).click();

  // 2단계: B3:B7 범위
  await expect(stepTitle(page)).toHaveText('범위 고르기');
  await expectRingAround(page, async () =>
    union(await box(cell(page, 2, 1)), await box(cell(page, 6, 1))),
  );
  await page.keyboard.type('=SUM(');
  const from = center(await box(cell(page, 2, 1)));
  const to = center(await box(cell(page, 6, 1)));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();

  // 3단계: B2 수식
  await expect(stepTitle(page)).toHaveText('SUM 입력');
  await expectRingAround(page, () => box(cell(page, 1, 1)));
  await page.keyboard.type(')');
  await page.keyboard.press('Enter');
  await nextButton(page).click();

  // 4단계: 실행 취소 버튼(UI 요소). '다음' 뒤 포커스는 그리드에 있다.
  await expect(stepTitle(page)).toHaveText('실행 취소');
  await expect(cellEditor(page)).toBeFocused();
  await expectRingAround(page, () => box(page.getByTestId('undo-button')));
  await expectCalloutInsideViewport(page);
  await page.keyboard.press('Control+z');

  // 5단계: 처음에는 화면 밖(가상 스크롤로 DOM에 없음)이던 L60 — 자동 스크롤 후 정확히 강조
  await expect(stepTitle(page)).toHaveText('먼 셀 선택');
  await expect(cell(page, 59, 11)).toBeInViewport({ ratio: 1 });
  await expectRingAround(page, () => box(cell(page, 59, 11)));
  await expectCalloutInsideViewport(page);
  await cell(page, 59, 11).click();
  await expect(page.getByRole('status', { name: '튜토리얼 진행' })).toHaveText('완료');
  await expect(page.getByTestId('spotlight-overlay')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('그리드 스크롤과 창 크기 변경을 따라가고, 가려진 대상은 보기 버튼으로 다시 보여 준다', async ({
  page,
}) => {
  await openTutorial(page);
  await expectRingAround(page, () => box(cell(page, 1, 1)));
  const grid = page.getByRole('grid', { name: '작업 시트' });
  const gridCenter = center(await box(grid));
  await page.mouse.move(gridCenter.x, gridCenter.y);

  // 가로로 조금 스크롤: B2는 여전히 보이고 테두리가 함께 움직인다
  const before = await box(ring(page));
  await page.mouse.wheel(60, 0);
  await expect.poll(async () => (await box(ring(page))).x).toBeLessThan(before.x - 30);
  await expectRingAround(page, () => box(cell(page, 1, 1)));

  // 창 크기 변경
  await page.setViewportSize({ width: 1000, height: 640 });
  await expectRingAround(page, () => box(cell(page, 1, 1)));
  await expectCalloutInsideViewport(page);

  // 세로로 크게 스크롤해 B2가 머리글 뒤로 사라지면 테두리를 숨기고 안내한다
  await page.mouse.wheel(0, 600);
  await expect(ring(page)).toHaveCount(0);
  await expect(callout(page)).toContainText('강조 대상이 화면 밖에 있습니다.');
  await callout(page).getByRole('button', { name: '보기', exact: true }).click();
  await expectRingAround(page, () => box(cell(page, 1, 1)));
});

test('좁은 화면에서도 말풍선이 잘리지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 640 });
  await openTutorial(page);
  await expectRingAround(page, () => box(cell(page, 1, 1)));
  await expectCalloutInsideViewport(page);
});

test('키보드: 화살표로 단계 진행, F6으로 말풍선 오가기, Esc는 그리드로만 돌아가고 단계는 그대로다', async ({
  page,
}) => {
  await openTutorial(page);
  await cellEditor(page).focus();

  // F6 → 말풍선, Tab → 힌트 버튼, Enter로 힌트 공개
  await page.keyboard.press('F6');
  await expect(callout(page)).toBeFocused();
  await page.keyboard.press('Tab');
  const hintButton = callout(page).getByRole('button', { name: /^힌트 보기/ });
  await expect(hintButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tutorial-hints')).toHaveText('열 B, 행 2의 교차점입니다.');

  // 말풍선 안 Esc → 그리드로, 단계는 그대로
  await page.keyboard.press('Escape');
  await expect(cellEditor(page)).toBeFocused();
  await expect(stepTitle(page)).toHaveText('B2 선택');
  // 그리드 안 Esc도 단계를 바꾸지 않는다
  await page.keyboard.press('Escape');
  await expect(stepTitle(page)).toHaveText('B2 선택');

  // F6 두 번: 말풍선 → 그리드
  await page.keyboard.press('F6');
  await expect(callout(page)).toBeFocused();
  await page.keyboard.press('F6');
  await expect(cellEditor(page)).toBeFocused();

  // 키보드만으로 B2 선택 (A1에서 오른쪽·아래)
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(stepTitle(page)).toHaveText('범위 고르기');
});

test("키보드로 '다음'을 눌러도 포커스가 그리드로 돌아와 단축키가 바로 동작한다", async ({
  page,
}) => {
  await openTutorial(page);
  await cell(page, 1, 1).click();
  await page.keyboard.type('=SUM(');
  const from = center(await box(cell(page, 2, 1)));
  const to = center(await box(cell(page, 6, 1)));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.type(')');
  await page.keyboard.press('Enter');

  await nextButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(stepTitle(page)).toHaveText('실행 취소');
  await expect(cellEditor(page)).toBeFocused();
  await page.keyboard.press('Control+z');
  await expect(stepTitle(page)).toHaveText('먼 셀 선택');
});

test('비활성 다음 버튼은 포커스를 옮기지 않는다', async ({ page }) => {
  await openTutorial(page);
  await cell(page, 1, 1).click();
  await page.keyboard.type('=SUM(');
  const from = center(await box(cell(page, 2, 1)));
  const to = center(await box(cell(page, 6, 1)));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await expect(stepTitle(page)).toHaveText('SUM 입력');
  await page.keyboard.press('Escape');
  await expect(nextButton(page)).toBeDisabled();
  await page.keyboard.press('F6');
  await expect(callout(page)).toBeFocused();
  await nextButton(page).click({ force: true });
  await expect(stepTitle(page)).toHaveText('SUM 입력');
  await expect(callout(page)).toBeFocused();
});

test('운영체제 모션 감소와 앱 모션 감소 속성 모두에서 말풍선 전환을 끈다', async ({ page }) => {
  const transition = () =>
    page.evaluate<string | undefined>(
      `(() => {
        const element = document.querySelector('[data-testid="tutorial-callout"]');
        return element ? getComputedStyle(element).transitionProperty : undefined;
      })()`,
    );
  const duration = () =>
    page.evaluate<string>(
      `getComputedStyle(document.documentElement).getPropertyValue('--motion-duration-fast').trim()`,
    );

  await openTutorial(page);
  await expect.poll(transition).toBe('transform, opacity');
  expect(await duration()).toBe('200ms');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(transition).toBe('none');
  expect(await duration()).toBe('0.001ms');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(transition).toBe('transform, opacity');

  // 앱 설정(CARD-03D)이 쓸 속성
  await page.evaluate(`document.documentElement.dataset.motion = 'reduce'`);
  await expect.poll(transition).toBe('none');
  expect(await duration()).toBe('0.001ms');
});
