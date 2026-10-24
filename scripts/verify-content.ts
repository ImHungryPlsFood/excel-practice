import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { verifyContentSource, formatFailures } from '@/content/verifyContent';
import { verifyDatasets } from '@/content/datasets/verifyDatasets';
import type { ContentSource } from '@/engine/grading/problemLoader';

/*
 * 콘텐츠 자체 검증 (CARD-04E, Q-03). `npm run verify-content`
 * src/content 아래 모든 코스·문제 파일을 읽어 스키마, 기준 정답 통과, 대표 오답 판정, 허용 작업과 풀이 경로의 일치,
 * 엔진 실행 검증을 하고 가상 데이터셋도 점검한다. 하나라도 실패하면 어느 문제가 왜 실패했는지 한국어로 알리고
 * 종료 코드 1로 끝난다(CI 차단). 실제 로직은 src/content/verifyContent.ts에 있어 테스트가 같은 코드를 쓴다.
 */

const projectRoot = resolve(import.meta.dirname, '..');
// 테스트가 일부러 틀린 콘텐츠로 이 스크립트를 돌릴 수 있도록 --content-root=<폴더>를 받는다(그 폴더 아래 courses/, exercises/).
// 지정하지 않으면 src/content를 검사한다. 데이터셋 점검은 항상 src/content/datasets를 쓴다.
const customRoot = process.argv.find((arg) => arg.startsWith('--content-root='));
const contentRoot =
  customRoot === undefined
    ? join(projectRoot, 'src', 'content')
    : resolve(customRoot.slice('--content-root='.length));

function tsFilesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsFilesIn(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

async function loadModules(
  dir: string,
  skip: readonly string[] = [],
): Promise<Record<string, unknown>> {
  const modules: Record<string, unknown> = {};
  for (const file of tsFilesIn(join(contentRoot, dir))) {
    const key = `/${relative(contentRoot, file).replaceAll('\\', '/')}`;
    if (skip.includes(key)) continue;
    modules[key] = await import(pathToFileURL(file).href);
  }
  return modules;
}

const source: ContentSource = {
  courses: await loadModules('courses', ['/courses/index.ts']),
  exercises: await loadModules('exercises'),
};

const { problemCount, failures } = await verifyContentSource(source);
failures.push(...(await verifyDatasets()));

if (failures.length > 0) {
  console.error(`콘텐츠 검증 실패: ${failures.length}건 (문제 ${problemCount}개 검사)`);
  for (const line of formatFailures(failures)) console.error(line);
  process.exit(1);
}
console.log(
  `콘텐츠 검증 통과: 문제 ${problemCount}개의 스키마·기준 정답·대표 오답·허용 작업·엔진 실행 검증과 데이터셋 점검`,
);
