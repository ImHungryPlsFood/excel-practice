import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * P-06 대규모 데이터 가상 스크롤 성능 벤치마크 (UX_MOTION_PERF P-06).
 * 10,000행 × 100열(1,000,000칸)을 모두 채운 상태에서 스크롤하는 동안 requestAnimationFrame 간격을 기록한다.
 * - 평균 프레임 레이트 ≥ 58 FPS (60 FPS 목표에서 측정 오차 허용)
 * - 드롭 프레임(간격이 1.5프레임 = 25ms 초과) 비율 < 5%
 * 실행: npm run test:perf (playwright.perf.config.ts)
 */

const ROWS = 10_000;
const COLS = 100;
const FRAME_MS = 1000 / 60;
const DROPPED_FRAME_MS = FRAME_MS * 1.5;
const MIN_AVERAGE_FPS = 58;
const MAX_DROPPED_RATIO = 0.05;
/** 가시 영역(1280×720 기준 약 28행 × 13열)과 overscan을 넉넉히 잡은 상한. 가상화가 깨지면 수만 개가 된다. */
const MAX_RENDERED_CELLS = 1_500;

interface FrameStats {
  frames: number;
  durationMs: number;
  averageFps: number;
  droppedRatio: number;
  worstFrameMs: number;
}

/** 브라우저 쪽 코드에서 쓰는 전역만 좁게 선언한다 (이 tsconfig에는 DOM 타입이 없다). */
interface RecorderGlobals {
  requestAnimationFrame: (callback: (time: number) => void) => number;
  __frameTimes?: number[];
  __recording?: boolean;
}

async function startRecording(page: Page) {
  await page.evaluate(() => {
    const browser = globalThis as unknown as RecorderGlobals;
    browser.__frameTimes = [];
    browser.__recording = true;
    const tick = (time: number) => {
      if (!browser.__recording) return;
      browser.__frameTimes?.push(time);
      browser.requestAnimationFrame(tick);
    };
    browser.requestAnimationFrame(tick);
  });
}

async function stopRecording(page: Page): Promise<FrameStats> {
  const times = await page.evaluate(() => {
    const browser = globalThis as unknown as RecorderGlobals;
    browser.__recording = false;
    return browser.__frameTimes ?? [];
  });
  const intervals = times.slice(1).map((time, index) => time - (times[index] ?? time));
  const durationMs = (times[times.length - 1] ?? 0) - (times[0] ?? 0);
  return {
    frames: intervals.length,
    durationMs,
    averageFps: durationMs > 0 ? (intervals.length / durationMs) * 1000 : 0,
    droppedRatio:
      intervals.length > 0
        ? intervals.filter((interval) => interval > DROPPED_FRAME_MS).length / intervals.length
        : 1,
    worstFrameMs: Math.max(0, ...intervals),
  };
}

function report(name: string, stats: FrameStats) {
  const line =
    `${name}: ${stats.frames}프레임 / ${stats.durationMs.toFixed(0)}ms, ` +
    `평균 ${stats.averageFps.toFixed(1)} FPS, 드롭 ${(stats.droppedRatio * 100).toFixed(2)}%, ` +
    `최악 ${stats.worstFrameMs.toFixed(1)}ms`;
  console.log(line);
  test.info().annotations.push({ type: 'perf', description: line });
}

function expectWithinBudget(stats: FrameStats) {
  expect(stats.frames).toBeGreaterThan(30);
  expect(stats.averageFps).toBeGreaterThanOrEqual(MIN_AVERAGE_FPS);
  expect(stats.droppedRatio).toBeLessThan(MAX_DROPPED_RATIO);
}

async function expectVirtualized(page: Page, grid: Locator) {
  const rendered = await page.locator('[role="gridcell"]').count();
  expect(rendered).toBeGreaterThan(0);
  expect(rendered).toBeLessThan(MAX_RENDERED_CELLS);
  // 스크롤한 위치에 실제로 셀이 그려져 있어야 한다(빈 화면 아님).
  const { top, left } = await grid.evaluate((element) => ({
    top: element.scrollTop as number,
    left: element.scrollLeft as number,
  }));
  const row = Math.min(ROWS - 1, Math.floor(top / 24) + 3);
  const col = Math.min(COLS - 1, Math.floor(left / 96) + 2);
  await expect(page.locator(`[data-row="${row}"][data-col="${col}"]`)).toHaveText(
    String((row + 1) * (col + 1)),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto(`/dev/grid?rows=${ROWS}&cols=${COLS}&fill=1`);
  await expect(page.getByRole('grid', { name: '개발 확인용 시트' })).toHaveAttribute(
    'aria-rowcount',
    String(ROWS + 1),
  );
});

test('마우스 휠 스크롤 중 60 FPS·드롭 프레임 5% 미만을 유지한다', async ({ page }) => {
  const grid = page.getByRole('grid', { name: '개발 확인용 시트' });
  await grid.hover();
  await startRecording(page);
  for (let i = 0; i < 80; i += 1) await page.mouse.wheel(0, 480);
  for (let i = 0; i < 30; i += 1) await page.mouse.wheel(480, 0);
  for (let i = 0; i < 40; i += 1) await page.mouse.wheel(-240, -480);
  const stats = await stopRecording(page);
  report('휠', stats);
  expectWithinBudget(stats);
  await expectVirtualized(page, grid);
});

test('PageDown 연타 중 60 FPS·드롭 프레임 5% 미만을 유지한다', async ({ page }) => {
  const grid = page.getByRole('grid', { name: '개발 확인용 시트' });
  await page.locator('[data-row="1"][data-col="1"]').click();
  await startRecording(page);
  for (let i = 0; i < 60; i += 1) await page.keyboard.press('PageDown');
  const stats = await stopRecording(page);
  report('PageDown', stats);
  expectWithinBudget(stats);
  await expectVirtualized(page, grid);
});

test('매 프레임 새 행·열이 나타나는 연속 스크롤에서도 예산을 지킨다', async ({ page }) => {
  const grid = page.getByRole('grid', { name: '개발 확인용 시트' });
  await startRecording(page);
  // 매 프레임 240px(10행)·96px(1열)씩 3초 동안 스크롤해 가상화가 매 프레임 다시 그리게 한다.
  await grid.evaluate(
    (element, durationMs) =>
      new Promise<void>((resolve) => {
        const browser = globalThis as unknown as RecorderGlobals & {
          performance: { now(): number };
        };
        const start = browser.performance.now();
        const step = () => {
          element.scrollTop += 240;
          element.scrollLeft += 96;
          if (browser.performance.now() - start < durationMs) browser.requestAnimationFrame(step);
          else resolve();
        };
        browser.requestAnimationFrame(step);
      }),
    3_000,
  );
  const stats = await stopRecording(page);
  report('연속 스크롤', stats);
  expectWithinBudget(stats);
  await expectVirtualized(page, grid);
});
