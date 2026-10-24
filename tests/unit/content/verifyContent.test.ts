// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONTENT_DATASETS, type ContentDataset } from '@/content/datasets/sampleData';
import { verifyDatasets } from '@/content/datasets/verifyDatasets';
import { formatFailures, verifyContentSource, type ContentFailure } from '@/content/verifyContent';

import { course as badLevel0 } from '../../fixtures/bad-content/courses/bad-level0';
import { course as badLevel3 } from '../../fixtures/bad-content/courses/bad-level3';
import { problems as badProblems } from '../../fixtures/bad-content/exercises/bad';
import { course as schemaCourse } from '../../fixtures/bad-schema/courses/bad';
import { problems as schemaProblems } from '../../fixtures/bad-schema/exercises/bad';

/*
 * CARD-04E: verify-content가 정말 실패를 잡고 한국어로 이유를 알리는지 확인한다.
 * 일부러 틀린 문제는 tests/fixtures 아래에만 있고 src/content에는 없다.
 * 실제 콘텐츠가 100% 통과하는지는 `npm run verify-content`(CI)가 본다.
 */

const badSource = {
  courses: {
    '/courses/bad-level0.ts': { course: badLevel0 },
    '/courses/bad-level3.ts': { course: badLevel3 },
  },
  exercises: { '/exercises/bad.ts': { problems: badProblems } },
};

const failuresOf = (failures: readonly ContentFailure[], problemId: string) =>
  failures.filter((failure) => failure.problemId === problemId);

const has = (found: readonly ContentFailure[], check: string, ...parts: string[]) =>
  found.some((f) => f.check === check && parts.every((part) => f.message.includes(part)));

describe('verify-content가 틀린 문제를 잡는다', async () => {
  const { failures, problemCount } = await verifyContentSource(badSource);

  it('틀린 문제 9개를 모두 읽어 들였다', () => {
    expect(problemCount).toBe(9);
    expect(badProblems).toHaveLength(9);
  });

  it('allowedActions가 풀이 경로와 안 맞으면 어떤 작업이 빠졌는지 알린다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADACT-01');
    expect(has(found, '허용 작업', '자동 채우기(AUTOFILL)', 'allowedActions에 없습니다')).toBe(
      true,
    );
  });

  it('허용했지만 어떤 풀이에도 안 쓰이는 작업을 알린다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADACT-02');
    expect(
      has(found, '허용 작업', '행·열 삽입·삭제(INSERT_DELETE_ROW_COLUMN)', '쓰이지 않습니다'),
    ).toBe(true);
  });

  it('풀이에 필요한 작업(requiredActions)을 적지 않으면 알린다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADACT-03');
    expect(has(found, '허용 작업', 'requiredActions')).toBe(true);
  });

  it('대표 오답 판정 코드가 다르면 선언한 코드를 알린다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADMIS-01');
    expect(has(found, '대표 오답', 'DATA_DEPENDENT', '판정이')).toBe(true);
  });

  it('기준 정답이 채점을 통과하지 못하면 판정과 이유를 알린다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADPAS-01');
    expect(has(found, '기준 정답', '통과하지 못했습니다')).toBe(true);
  });

  it('expectedResult가 기준 정답 계산 결과와 다르면 알린다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADVAL-01');
    expect(has(found, '기준 정답 값', '999')).toBe(true);
  });

  it('데이터 때문에 소수가 되는 값을 &로 이으면 엔진으로 계산해 잡는다 (정적 검사로는 통과)', () => {
    const found = failuresOf(failures, 'PRB-L03-BADCAT-01');
    expect(has(found, '엔진 실행(소수를 글자로)', 'AVERAGE(B3:E3)', '86.3333')).toBe(true);
  });

  it('FILTER 빈 결과를 엔진으로 계산해 잡는다', () => {
    const found = failuresOf(failures, 'PRB-L00-BADFLT-01');
    expect(has(found, '엔진 실행(오류 값)', 'FILTER', 'IFERROR')).toBe(true);
  });

  it('UNIQUE 대상의 빈 셀을 잡는다', () => {
    const found = failuresOf(failures, 'PRB-L03-BADUNQ-01');
    expect(has(found, '엔진 실행(UNIQUE 빈 셀)', 'Sheet1!D3')).toBe(true);
  });

  it('모든 실패 문장은 문제 ID가 앞에 붙은 한국어다', () => {
    for (const line of formatFailures(failures)) {
      expect(line).toMatch(/^✗ (PRB-L\d\d-[A-Z]+-\d\d|\(콘텐츠 구성\)) \[[^\]]+\] /);
      expect(line).toMatch(/[가-힣]/);
    }
  });
});

describe('스키마를 어긴 문제', () => {
  it('어느 문제의 어느 항목이 틀렸는지 알리고 다음 검사로 넘어가지 않는다', async () => {
    const { failures } = await verifyContentSource({
      courses: { '/courses/bad.ts': { course: schemaCourse } },
      exercises: { '/exercises/bad.ts': { problems: schemaProblems } },
    });
    const found = failuresOf(failures, 'PRB-L00-BADSCH-01');
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((f) => f.check === '스키마')).toBe(true);
    const text = found.map((f) => f.message).join('\n');
    expect(text).toMatch(/goal/);
    expect(text).toMatch(/allowedActions/);
  });
});

describe('가상 데이터셋 점검', () => {
  it('실제 데이터셋은 모두 통과한다 (R-10.01~10)', async () => {
    expect(await verifyDatasets()).toEqual([]);
  });

  const withExtra = (extra: ContentDataset): ContentDataset[] => [...CONTENT_DATASETS, extra];

  it('전화번호·이메일·실존 기업 이름·규칙적인 숫자를 잡는다', async () => {
    const failures = await verifyDatasets(
      withExtra({
        id: 'bad',
        title: '나쁜 데이터',
        requirement: 'R-10.03',
        sheets: {
          Sheet1: [
            ['이름', '연락처', '메모', '값'],
            ['가', '010-1234-5678', '삼성 납품', '10'],
            ['나', 'a@b.com', '', '20'],
            ['다', '', '', '30'],
            ['라', '', '', '40'],
            ['마', '', '', '50'],
          ],
        },
      }),
    );
    const text = failures.map((f) => f.message).join('\n');
    expect(text).toMatch(/전화번호/);
    expect(text).toMatch(/이메일/);
    expect(text).toMatch(/삼성/);
    expect(text).toMatch(/일정하게 늘어납니다/);
  });

  it('필요한 데이터 종류가 빠지면 알린다', async () => {
    const failures = await verifyDatasets(
      CONTENT_DATASETS.filter((dataset) => dataset.requirement !== 'R-10.10'),
    );
    expect(failures.map((f) => f.message).join('\n')).toMatch(/R-10\.10/);
  });
});

describe('명령줄 verify-content', () => {
  const tsx = resolve('node_modules/tsx/dist/cli.mjs');
  const script = resolve('scripts/verify-content.ts');

  it('틀린 콘텐츠를 주면 종료 코드 1과 한국어 실패 이유를 출력한다', () => {
    const run = spawnSync(
      process.execPath,
      [tsx, script, `--content-root=${resolve('tests/fixtures/bad-content')}`],
      { encoding: 'utf8' },
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('콘텐츠 검증 실패');
    expect(run.stderr).toContain('✗ PRB-L00-BADACT-01 [허용 작업]');
    expect(run.stderr).toContain('✗ PRB-L03-BADCAT-01 [엔진 실행(소수를 글자로)]');
  }, 60_000);

  it('실제 콘텐츠는 종료 코드 0으로 통과한다', () => {
    const output = execFileSync(process.execPath, [tsx, script], { encoding: 'utf8' });
    expect(output).toContain('콘텐츠 검증 통과');
  }, 60_000);
});
