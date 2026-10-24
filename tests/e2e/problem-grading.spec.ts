import { expect, test, type Page } from '@playwright/test';

/*
 * CARD-04C 문제 풀이 E2E (/dev/problem, 실제 Chromium, R-09.20~R-09.32, R-04.42):
 * 정답 제출, 오답 피드백(대표 오답 설명·범위 조언), 힌트 단계 공개, 재시작과 실행 취소.
 * 오답이어도 학생이 쓴 내용은 지워지지 않고, 힌트를 열어도 문제는 저절로 풀리지 않는다.
 */

const cell = (page: Page, row: number, col: number) =>
  page.locator(`[role="gridcell"][data-row="${row}"][data-col="${col}"]`);
const B7 = (page: Page) => cell(page, 6, 1);
const feedback = (page: Page) => page.getByRole('region', { name: '채점 결과' });
const resultDialog = (page: Page) => page.getByRole('dialog', { name: '문제 완료' });
const submitButton = (page: Page) => page.getByRole('button', { name: '제출', exact: true });
const workStatus = (page: Page) => page.getByRole('status', { name: '작업 상태' });

async function openProblem(page: Page) {
  await page.goto('/dev/problem');
  await expect(page.getByRole('grid', { name: '작업 시트' })).toBeVisible();
  await expect(cell(page, 5, 1)).toHaveText('120');
}

/** B7을 눌러 선택한 뒤 입력하고 Enter로 확정한다 */
async function typeIntoB7(page: Page, text: string) {
  await B7(page).click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

test.describe('문제 풀이 (CARD-04C)', () => {
  test('문제 조건과 목표는 보이고, 힌트와 채점 결과는 요청 전에는 없다 (R-04.42)', async ({
    page,
  }) => {
    await openProblem(page);
    const task = page.getByRole('complementary', { name: '문제와 힌트' });
    await expect(task).toContainText('B2:B6의 매출 합계를 B7에 구하세요.');
    await expect(task).toContainText('표의 숫자를 직접 더해 입력하지 않습니다.');
    await expect(page.getByTestId('hint-step-1')).toHaveCount(0);
    await expect(task).not.toContainText('SUM 함수로');
    await expect(feedback(page)).toHaveCount(0);
  });

  test('정답 제출: 통과 모달에 정답 이유가 나온다 (R-09.15)', async ({ page }) => {
    await openProblem(page);
    await typeIntoB7(page, '=SUM(B2:B6)');
    await expect(B7(page)).toHaveText('850');
    await submitButton(page).click();

    const dialog = resultDialog(page);
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('result-explanation')).toContainText('SUM은 범위 안의 숫자를');
    await expect(page.getByTestId('result-points')).toHaveText('20/20점');
    await expect(dialog).not.toContainText('=SUM(B2:B6)');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(workStatus(page)).toHaveText('문제를 해결했습니다');
  });

  test('오답: 대표 오답 설명이 나오고 작성한 내용은 남으며, 고쳐서 다시 제출하면 통과한다 (R-09.20, 21, 23, 25)', async ({
    page,
  }) => {
    await openProblem(page);
    await typeIntoB7(page, '850');
    await submitButton(page).click();

    await expect(feedback(page)).toContainText('아직 완성되지 않았어요');
    await expect(page.getByTestId('feedback-misconception')).toContainText(
      '계산된 값을 직접 입력하셨습니다',
    );
    await expect(B7(page)).toHaveText('850');
    await expect(resultDialog(page)).toHaveCount(0);

    await typeIntoB7(page, '=SUM(B2:B6)');
    await submitButton(page).click();
    await expect(resultDialog(page)).toBeVisible();
    await expect(resultDialog(page)).toContainText('2번');
  });

  test('범위가 필요 이상으로 넓은 정답은 통과하고 범위 조언을 보여 준다 (04B 범위 조언)', async ({
    page,
  }) => {
    await openProblem(page);
    await typeIntoB7(page, '=SUM(B1:B6)');
    await submitButton(page).click();
    await expect(resultDialog(page)).toContainText('범위 조언');
    await expect(resultDialog(page)).toContainText('B1');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('feedback-advice')).toContainText('B1');
  });

  test('범위 오답은 구체적인 이유를 보여 주고 정답 수식은 보여 주지 않는다 (R-09.18, R-09.23)', async ({
    page,
  }) => {
    await openProblem(page);
    await typeIntoB7(page, '=SUM(B2:B5)');
    await submitButton(page).click();
    await expect(feedback(page)).toContainText('아직 완성되지 않았어요');
    await expect(page.getByTestId('feedback-reason')).not.toBeEmpty();
    await expect(feedback(page)).not.toContainText('=SUM(B2:B6)');
    await expect(B7(page)).toHaveText('730');
  });

  test('힌트: 요청한 만큼만 한 단계씩 열리고, 4단계까지 열어도 저절로 풀리지 않는다 (R-09.27~31)', async ({
    page,
  }) => {
    await openProblem(page);
    const hintStatus = page.getByRole('status', { name: '힌트 사용' });
    await expect(hintStatus).toContainText('0/4');

    await page.getByRole('button', { name: '힌트 보기' }).click();
    await expect(page.getByTestId('hint-step-1')).toContainText('여러 칸을 한 번에 더하는 함수');
    await expect(page.getByTestId('hint-step-2')).toHaveCount(0);

    await page.getByRole('button', { name: /다음 힌트 보기/ }).click();
    await expect(page.getByTestId('hint-step-2')).toContainText('B열의 데이터 범위');
    await expect(page.getByTestId('hint-step-3')).toHaveCount(0);

    await page.getByRole('button', { name: /다음 힌트 보기/ }).click();
    await page.getByRole('button', { name: /다음 힌트 보기/ }).click();
    await expect(page.getByTestId('hint-step-4')).toContainText('SUM 함수로 금액 범위 전체');
    await expect(hintStatus).toContainText('4/4');

    // 마지막 도움까지 봐도 시트는 비어 있고 완료되지 않았다. 직접 입력하고 제출해야 통과한다.
    await expect(B7(page)).toHaveText('');
    await expect(resultDialog(page)).toHaveCount(0);
    await expect(workStatus(page)).toHaveText('풀이 중');
    await submitButton(page).click();
    await expect(feedback(page)).toContainText('아직 완성되지 않았어요');

    await typeIntoB7(page, '=SUM(B2:B6)');
    await submitButton(page).click();
    await expect(resultDialog(page)).toBeVisible();
    await expect(page.getByTestId('result-points')).toHaveText('12/20점');
    await expect(resultDialog(page)).toContainText('4/4단계 사용');
  });

  test('재시작: 확인을 받고, 취소하면 그대로이며, 시작한 뒤에도 실행 취소로 되찾는다 (R-09.22, 25, 26)', async ({
    page,
  }) => {
    await openProblem(page);
    await typeIntoB7(page, '850');
    await page.getByRole('button', { name: '힌트 보기' }).click();

    const restart = page.getByRole('button', { name: '다시 시작', exact: true });
    await restart.click();
    const confirm = page.getByRole('dialog', { name: '다시 시작' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: '취소' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(B7(page)).toHaveText('850');

    await restart.click();
    await confirm.getByRole('button', { name: '다시 시작' }).click();
    await expect(B7(page)).toHaveText('');
    await expect(cell(page, 1, 1)).toHaveText('100');
    await expect(workStatus(page)).toContainText('실행 취소로');
    // 힌트 기록은 그대로다
    await expect(page.getByTestId('hint-step-1')).toBeVisible();

    await page.getByRole('button', { name: '실행 취소', exact: true }).click();
    await expect(B7(page)).toHaveText('850');
  });

  test('안전 상태: 마지막 제출 상태로 돌리고 실행 취소로 다시 되찾는다 (R-09.24)', async ({
    page,
  }) => {
    await openProblem(page);
    await typeIntoB7(page, '850');
    await submitButton(page).click();
    await expect(feedback(page)).toContainText('아직 완성되지 않았어요');

    await typeIntoB7(page, '=B2');
    await expect(B7(page)).toHaveText('100');
    await page.getByRole('button', { name: '마지막 제출 상태로' }).click();
    await expect(B7(page)).toHaveText('850');
    await expect(workStatus(page)).toContainText('마지막 제출 상태로 돌렸습니다');

    await page.getByRole('button', { name: '실행 취소', exact: true }).click();
    await expect(B7(page)).toHaveText('100');
  });
});
