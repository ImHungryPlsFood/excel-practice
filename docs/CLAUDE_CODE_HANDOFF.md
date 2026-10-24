# CELLCRAFT Claude Code 인계 및 실행 지침서 (CLAUDE_CODE_HANDOFF)

- **문서 버전:** 1.0.0
- **작성일자:** 2026-10-22
- **역할 정의:** 본 문서는 수석 설계자(Antigravity)가 구현 담당자(Claude Code)에게 프로젝트 구현을 안전하고 누락 없이 위임하기 위한 공식 인계서이다.
- **최우선 원칙:** Claude Code는 본 문서의 작업 카드 순서와 규칙을 엄격히 준수하며, 테스트 약화·임의 하드코딩·설계 무단 변경을 절대 행하지 않는다.

---

## 1. Claude Code 작업 규칙 및 환경 가이드 (G-01 ~ G-05)

### [G-01] Claude Code 5대 절대 금지 규칙
1. **테스트 통과를 위한 테스트 약화·삭제·건너뛰기(`skip`, `only`) 절대 금지:** 테스트가 실패하면 구현 코드를 수정하여 통과시켜야 하며, 테스트 기대값을 낮추거나 주석 처리하지 않는다.
2. **정답 및 기대값 하드코딩 절대 금지:** 채점기나 수식 엔진 내부에서 특정 문제 ID(예: `if (id === 'MOD-SUM') return 150`)를 감지해 결과를 조작하는 행위를 엄격히 금지한다.
3. **실패 은폐성 예외 처리 금지:** 오류를 숨기는 무의미한 `try { ... } catch (e) {}`, TypeScript 컴파일을 회피하는 `@ts-ignore`, `@ts-nocheck`, 무분별한 `any` 타입 캐스팅, `eslint-disable` 주입을 금지한다. 불가피한 경우 설계 문서 근거와 주석을 반드시 명시한다.
4. **목업(Mock) 화면으로 완료 보고 금지:** 실제 동작하지 않는 가짜 버튼, 연결되지 않은 수식 입력줄을 만들고 구현이 완료되었다고 보고하지 않는다.
5. **`package.json`에 없는 패키지를 `npx`로 내려받아 실행 금지:** 의존성에 선언되지 않은 패키지를 `npx`로 임시 설치해 실행하지 않는다. 필요하면 먼저 사용자에게 묻고 승인을 받은 뒤 `package.json`에 명시적으로 추가한다.

### [G-02] 세션 종료 시 완료 보고 표준 양식
Claude Code는 각 작업 카드를 완료할 때마다 아래 마크다운 템플릿에 맞추어 사용자에게 보고해야 한다:

```markdown
### [작업 카드 완료 보고: {CARD-ID} - {카드 제목}]
1. **수정 및 생성된 파일 목록:**
   - `src/...`
   - `tests/...`
2. **실행한 검증 명령 및 실제 터미널 출력 요약:**
   - `npm run typecheck` (통과: 에러 0개)
   - `npm test` (통과: X개, 실패: 0개)
   - `npm run lint` (통과: 경고 0개)
3. **요구사항 추적표(`docs/REQUIREMENTS_TRACE.md`) 갱신 내역:**
   - 상태 변경: [계획됨] -> [완료됨] (해당 요구사항 ID 목록)
4. **발견된 특이사항 및 남은 과제:**
   - ...
5. **다음에 착수할 작업 카드:**
   - `{NEXT-CARD-ID}`
```

### [G-03] 루트 CLAUDE.md 연계
프로젝트 루트의 `CLAUDE.md`는 간결하게 유지되며, 세부 아키텍처와 규칙은 본 `docs/CLAUDE_CODE_HANDOFF.md`, `docs/TECHNICAL_DESIGN.md`, `docs/REQUIREMENTS_TRACE.md`를 참조한다.

### [G-04] 개발 환경 및 플랫폼 호환성 (Windows & Linux Cross-Platform)
- **개발 환경 및 프로젝트 위치:** 사용자는 **Windows 11 PC의 VS Code** 환경에서 작업하며, 로컬 작업 경로는 **`C:\dev\Excel Practice`**이다.
- **클라우드 동기화 폴더 금지 경고 (필수 준수):**
  - **OneDrive, Google Drive, Dropbox 등 클라우드 실시간 동기화 폴더 내부에서 `npm install` 실행을 엄격히 금지한다.**
  - 동기화 엔진이 `node_modules` 내부의 수만 개 파일과 심볼릭 링크를 지속적으로 락(Lock)하거나 인덱싱하여, 심각한 디스크 I/O 병목, 설치 중단(`EPERM` 오류) 및 패키지 변조를 유발한다. 프로젝트는 반드시 `C:\dev\Excel Practice`와 같은 독립 로컬 디렉터리에서만 실행해야 한다.
- **Node.js 버전:** 현행 지원 중인 **Node LTS 24**를 사용하며, 루트 디렉터리의 `.nvmrc`에는 메이저 버전 **`24`**를 기재하고 `package.json`의 `engines` 필드에 `"node": ">=24.0.0"`을 명시하여 고정한다.
  - **결정 근거:** Node.js 공식 릴리스 일정(출처: https://nodejs.org/en/about/previous-releases 및 https://github.com/nodejs/release#release-schedule)에 따르면, Node 20(Iron)은 **2026년 4월 30일**에 지원이 공식 종료(End-of-Life)되었다. 따라서 현재 2026년 10월 시점의 공식 활성 LTS인 Node 24를 채택한다.
- **프로젝트 루트 폴더명 및 공백 처리:** 프로젝트 루트 폴더 이름은 `Excel Practice`로 **공백과 대문자**를 포함한다.
  - 초기화 시 폴더명이 그대로 패키지명으로 사용되어 npm 오류(`name can only contain URL-friendly characters`)가 발생하지 않도록, `package.json`의 `name`은 반드시 **`excel-practice`**(소문자 및 하이픈)로 지정해야 한다.
  - 모든 npm 스크립트, Vite 설정, 테스트 러너 설정은 공백이 포함된 경로(`C:\dev\Excel Practice\...`)에서도 문제없이 동작하도록 **경로 문자열 따옴표 처리(`"..."`) 또는 상대 경로**를 엄격히 사용한다.
  - Windows PowerShell과 Linux bash 양쪽에서 동작하도록 npm 스크립트에 OS 종속적인 명령어(`rm -rf` 대신 `rimraf` 또는 node 스크립트, `SET VAR=VAL` 대신 `cross-env`)를 사용한다.

### [G-05] Git 형상 관리 전략
- **브랜치 규칙:** 각 작업 카드마다 기능 브랜치(`feat/CARD-01A`, `feat/CARD-02A` 등)를 생성하거나, 단일 메인 트렁크 전략 사용 시 각 작업 카드 단위로 원자적(Atomic) 커밋을 생성한다.
- **커밋 메시지 규칙:** Conventional Commits 준수.
  - 형식: `feat({CARD-ID}): {간결한 구현 요약}` (예: `feat(CARD-01A): setup vite react ts project and tooling`)
- **Phase 릴리즈 태그:** 각 Phase의 모든 카드가 완료되고 통합 테스트가 통과하면 태그를 발행한다 (예: `git tag -a v0.1-phase1 -m "Phase 1 Foundation Complete"`).

---

## 2. Phase 1 ~ Phase 8 전체 작업 카드 (Task Cards)

---

### [Phase 1: 프로젝트 기반]

#### CARD-01A: 프로젝트 초기화 및 도구 체계 구축 (Project Tooling & Scaffolding)
- **관련 요구사항 ID:** R-03.0-01, R-03.0-03, R-12.1-01, R-15.0-01, R-15.0-02, S-08, S-10, S-11, Q-08, G-04
- **선행 카드:** 없음 (프로젝트 최초 시작 카드)
- **생성·수정할 파일:**
  - `LICENSE` (GNU General Public License v3.0 전문 배치 — 사용자 결정 2026-10-22)
  - `package.json` (`name: "excel-practice"`, `license: "GPL-3.0-or-later"`, `engines: { "node": ">=24.0.0" }`)
  - `.nvmrc` (`24`)
  - `tsconfig.json`, `tsconfig.node.json` (strict: true, noImplicitAny: true)
  - `vite.config.ts` (React 플러그인, 경로 별칭 `@/*` -> `./src/*`)
  - `tailwind.config.js`, `postcss.config.js`
  - `.eslintrc.cjs` (`no-eval: error`, `no-new-func: error`, `react/no-danger: error`)
  - `.prettierrc`
  - `.gitignore` (`.env*` 제외, `dist/`, `node_modules/`, `coverage/`)
  - `.env.example`
  - `vitest.config.ts`, `playwright.config.ts`
- **구현 지침 및 금지 사항:**
  - `npm init vite@latest . -- --template react-ts` 시 공백 폴더명 이슈가 없도록 주의.
  - `npm install` 실행 시 정확한 버전으로 설치.
  - HyperFormula GPLv3 채택에 따라 `package.json` 라이선스를 `"GPL-3.0-or-later"`로 명시하고 루트 `LICENSE` 파일을 생성할 것.
  - 모든 npm 의존성의 라이선스가 GPLv3와 호환(MIT, Apache 2.0, BSD 등)되는지 검사하는 `license-checker` 설정.
  - ESLint에 `dangerouslySetInnerHTML`, `eval`, `new Function` 사용 차단 룰 반드시 활성화.
- **완료 조건:**
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` 명령이 모두 에러 0건으로 종료되고 GPL-3.0 LICENSE 파일이 존재한다.
- **실행할 검증 명령:**
  ```powershell
  npm run typecheck
  npm run lint
  npm test
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-01B: 디자인 토큰 및 랜딩 페이지 구현 (Design Tokens & Landing Page)
- **관련 요구사항 ID:** R-01.0-05, R-04.1-01, R-04.1-02, R-12.0-01, R-12.1-01, R-12.3-01
- **선행 카드:** CARD-01A
- **생성·수정할 파일:**
  - `src/styles/tokens.css` (색상, 그림자, 간격, 둥글기, 폰트, 모션 변수 정의)
  - `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`
  - `src/components/landing/HeroSection.tsx`, `SpreadsheetPreviewMock.tsx`, `CurriculumRoadmap.tsx`
  - `src/pages/LandingPage.tsx`
  - `tests/unit/components/Button.test.tsx`
- **구현 지침 및 금지 사항:**
  - 랜딩 페이지 7대 필수 요소(로고, 소개, 미리보기, 시작버튼, 과정소개, 성장경로, 자격증안내)를 온전히 포함할 것.
  - 기존 상용 서비스의 로고나 캐릭터 복제 금지. 과도한 애니메이션 배제.
  - GPLv3 배포 의무에 따라 랜딩 페이지 푸터(Footer)에 소스코드 공개 저장소 링크(GitHub 등)를 필수 제공할 것.
  - 데스크톱 화면에서 전문적인 생산성 도구의 인상을 줄 것.
- **완료 조건:**
  - 랜딩 페이지 7개 섹션이 렌더링되고, 단위 테스트가 100% 통과한다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/components/Button.test.tsx
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-01C: SPA 라우팅 및 대시보드 뷰 구축 (Routing & Dashboard View)
- **관련 요구사항 ID:** R-04.2-01, R-04.2-02, R-17.1-01, Q-09
- **선행 카드:** CARD-01B
- **생성·수정할 파일:**
  - `src/app/routes.tsx` (React Router DOM: `/`, `/dashboard`, `/learn/:courseId`, `/sandbox`)
  - `src/components/layout/AppHeader.tsx`, `AppSidebar.tsx`, `ErrorBoundary.tsx`
  - `src/pages/DashboardPage.tsx`
  - `src/features/dashboard/components/NextActionCard.tsx`, `DailyGoalWidget.tsx`, `ProgressSummary.tsx`
  - `tests/unit/pages/DashboardPage.test.tsx`
- **구현 지침 및 금지 사항:**
  - 대시보드 9대 정보(현재단계, 이어하기, 일일목표, 진행률, 최근학습, 복습개념, 오답다시풀기, 도전과제, 성취기록) 완비.
  - 최상단에 명확한 '이어서 학습하기' 액션 카드를 배치하여 다음 행동 유도.
- **완료 조건:**
  - Phase 1 완료 조건 충족: 프로젝트가 정상 실행 및 빌드되고 라우팅 간 전환이 매끄럽게 동작한다.
- **실행할 검증 명령:**
  ```powershell
  npm run typecheck
  npm test
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

### [Phase 2: 실제 스프레드시트 코어]

#### CARD-02A: 가상화 스프레드시트 그리드 코어 (Virtualized Grid Core)
- **관련 요구사항 ID:** R-01.0-04, R-07.2-06, R-08.1-01, R-12.2-01, R-12.2-02, Q-04, Q-05, Q-06, P-05, P-06, ADR-002
- **선행 카드:** CARD-01C
- **생성·수정할 파일:**
  - `src/components/spreadsheet/SpreadsheetGrid.tsx`
  - `src/components/spreadsheet/GridHeader.tsx` (행 번호 1..N, 열 문자 A..Z)
  - `src/components/spreadsheet/GridCell.tsx`
  - `src/components/spreadsheet/hooks/useVirtualGrid.ts` (`@tanstack/react-virtual` 2D)
  - `src/components/spreadsheet/hooks/useCellSelection.ts` (선택, 범위 드래그, 키보드 내비게이션)
  - `src/components/spreadsheet/hooks/useImeInput.ts` (한글 `isComposing` 감지)
  - `src/components/spreadsheet/types.ts` (`SpreadsheetGridHandle`, `getCellViewportRect` API)
  - `tests/unit/spreadsheet/GridSelection.test.ts`
  - `tests/unit/spreadsheet/ImeInput.test.ts`
  - `tests/perf/virtual-scroll.perf.ts`
- **구현 지침 및 금지 사항:**
  - Handsontable 등 상용 그리드 라이브러리 직접 의존 금지 (ADR-002).
  - 한글 입력 시 Enter 누름으로 인한 마지막 글자 유실/중복 방지 (`compositionstart`/`end` 처리).
  - Spotlight 오버레이를 위한 `getCellViewportRect(row, col)` 좌표 변환 API 반드시 노출.
- **완료 조건:**
  - 셀 선택, 범위 드래그, 화살표 이동, 한글 입력이 정상 동작하고 가상화 상태에서 좌표 변환 API가 정확한 `DOMRect`를 반환한다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/spreadsheet/
  npm run typecheck
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-02B: 수식 계산 엔진 어댑터 및 평가기 (Formula Engine Adapter)
- **관련 요구사항 ID:** R-03.06, R-03.13, R-03.15, R-08.14~R-08.25, R-08.26~R-08.29(엔진 범위), S-09, Q-01, Q-07, ADR-001 (옛 표기 R-08.2-01~05 → R-08.14~25, R-08.3-01·02 → R-08.26~32)
- **선행 카드:** CARD-02A
- **생성·수정할 파일:**
  - `src/engine/spreadsheet/FormulaEngineAdapter.ts` (추상 인터페이스)
  - `src/engine/spreadsheet/adapters/HyperFormulaAdapter.ts` (ADR-001: HyperFormula, `licenseKey: 'gpl-v3'`)
  - `src/engine/spreadsheet/adapters/excelCompatPlugin.ts` (CONCAT 구현, INDEX 범위 밖 #REF!)
  - `src/engine/spreadsheet/evaluator/dependencyGraph.ts` (DAG 순환참조 감지)
  - `src/engine/spreadsheet/supportedFunctions.ts`, `errorMessages.ts`, `dateSerial.ts`, `numberFormat.ts`
  - `docs/EXCEL_DIFFERENCES.md`
  - `scripts/golden/make-golden-formulas.mjs` → `tests/fixtures/golden-formulas.xlsx` (수식만, 결과 값 없음)
  - `tests/fixtures/golden-excel-calculations.xlsx` (사용자가 Excel에서 계산한 기준 파일)
  - `tests/unit/helpers/xlsx/readXlsx.ts` (새 패키지 없는 xlsx 읽기 도구)
  - `tests/unit/engine/formula-eval.test.ts`, `dependencyGraph.test.ts`, `dateSerial.test.ts`, `golden-formulas.test.ts`
  - `tests/unit/engine/golden-excel.test.ts` (Q-01 골든 테스트)
- **구현 지침 및 금지 사항:**
  - `eval()` 또는 `new Function()` 사용 엄격 금지 (S-09).
  - 셀 수식(`formula`)과 계산 결과(`value`)를 분리 저장.
  - 순환 참조 발생 시 무한 루프에 빠지지 않고 `#CYCLE!` 반환.
  - S-09 상한: 수식 1,000자, 시트 1,000행 × 50열. Worker 2초 타임아웃은 이 카드 범위에서 제외(사용자 결정 2026-10-23).
  - 지원하지 않는 함수·연산자는 임의 값 없이 오류와 한국어 안내로 알린다(R-08.25).
  - 골든 불일치는 테스트를 약화하지 않고 원인을 조사한다. 엔진 한계로 확인된 차이만 `EXCEL_DIFFERENCES.md`에 근거와 함께 기록하고, 테스트 예외는 기록된 셀 하나 단위로만 둔다.
- **완료 조건:**
  - 기본 사칙연산, 셀 참조(`A1+B1`), 범위 함수(`SUM(A1:A5)`), 1900년 윤년 및 날짜 일련번호 계산이 통과하고 골든 테스트가 검증된다.
  - `npm run audit:licenses`가 통과한다(R-03.13, R-03.15).
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/engine/
  npm run typecheck
  npm run audit:licenses
  ```
- **외부 사용자 조치:** `golden-formulas.xlsx`를 Excel에서 열어 계산한 뒤 `tests/fixtures/golden-excel-calculations.xlsx`로 저장해 제공 (2026-10-23 완료).

---

#### CARD-02C: 수식 입력줄 및 인라인 에디터 통합 (Formula Bar & Inline Editor)
- **관련 요구사항 ID:** R-04.38~R-04.44, R-08.11 (구 표기 R-04.4-01·R-04.4-02·R-08.1-01, 2026-10-23 정정). 함께 처리: R-08.22 화면 표시, Q-06·Q-04 F4, ADR-002 getFormulaBarRect
- **선행 카드:** CARD-02B
- **생성·수정할 파일:**
  - `src/components/spreadsheet/FormulaBar.tsx` (이름 상자 + fx 버튼 + 수식 입력 인풋)
  - `src/components/spreadsheet/CellEditor.tsx` (셀 더블클릭/F2 시 활성화되는 인라인 오버레이 인풋)
  - `src/features/learning/components/LearningLayout.tsx` (데스크톱 3분할 5영역 워크스페이스)
  - `tests/unit/spreadsheet/FormulaBar.test.tsx`
  - (구현 시 추가, 2026-10-23) `src/components/spreadsheet/Spreadsheet.tsx`, `hooks/useCellEditing.ts`, `hooks/useWorkbook.ts`, `formulaReference.ts`, `editorFocus.ts`, `src/pages/dev/WorkspaceHarnessPage.tsx`, `tests/e2e/formula-bar.spec.ts`
- **구현 지침 및 금지 사항:**
  - 활성 셀 변경 시 수식 입력줄과 셀 에디터 간 양방향 실시간 동기화.
  - Enter 입력 시 계산 결과 반영 및 아래 행 셀로 포커스 자동 이동.
- **완료 조건:**
  - 수식 입력줄에서 수식을 입력하거나 셀에서 직접 입력했을 때 동일하게 엔진에 반영되고 결과가 렌더링된다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/spreadsheet/FormulaBar.test.tsx
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-02D: Undo/Redo 스택, 다중 시트 및 연습실 모드 (Undo/Redo & Sandbox)
- **관련 요구사항 ID:** R-04.45, R-04.46, R-04.47, R-04.48, R-04.49, R-04.51, R-04.52, R-17.14·R-17.15(Phase 2 게이트 기여), Q-04, R-08.22(셀 기본 정렬, 2026-10-23 추가). 구현 시 추가(2026-10-23): R-04.43(하단 실행 취소), Q-06(Ctrl+Z/Y), R-08.08, R-08.12 (옛 표기 R-04.5-01·R-04.5-02 → R-04.45~R-04.53, R-17.2-01 → R-17.14·R-17.15)
- **선행 카드:** CARD-02C
- **생성·수정할 파일:**
  - `src/engine/spreadsheet/history/historyManager.ts` (Command 패턴 기반 Undo/Redo)
  - `src/components/spreadsheet/SheetTabs.tsx` (시트 추가, 이름 변경, 활성 탭 전환)
  - `src/pages/SandboxPage.tsx` (R-04.45: '빈 스프레드시트 만들기'와 R-04.46: '샘플 데이터 불러오기' 진입 동작 포함)
  - `src/content/sandbox/sampleDatasets.ts` (R-04.46: 판매 내역·상품 재고·출석 기록 등 원문 10장 데이터셋 중 핵심 몇 종의 가상 샘플)
  - `src/components/sandbox/SampleDataPicker.tsx` (샘플 선택 및 현재 시트로 불러오기)
  - `src/services/sandbox/sandboxFileStore.ts` (R-04.52: 연습실 학습 파일 저장·불러오기. 시트·셀 값·수식을 버전 필드가 있는 JSON으로 저장하고 복원 시 스키마 검증. 학습 모드 저장소와 분리)
  - `tests/unit/history/historyManager.test.ts` (속성 기반 50회 왕복 테스트)
  - `tests/unit/sandbox/sandboxFileStore.test.ts` (저장 후 복원 왕복, 손상된 파일 거부)
  - `tests/unit/sandbox/sampleDatasets.test.ts` (스키마·가상 데이터 검증, 불러오기 후 셀 값 일치)
  - (2026-10-23 추가) `src/components/spreadsheet/GridCell.tsx`, `src/components/spreadsheet/types.ts`(`CellDisplay`에 값 종류 추가), `src/components/spreadsheet/Spreadsheet.tsx` (R-08.22: 셀 기본 정렬)
  - (2026-10-23 추가) `tests/unit/spreadsheet/cellAlignment.test.tsx`, `tests/e2e/formula-bar.spec.ts`에 정렬 확인 추가
  - (구현 시 추가, 2026-10-23) `src/components/spreadsheet/workbookModel.ts`(여러 시트 + 실행 취소 명령), `hooks/useWorkbook.ts`, `SpreadsheetGrid.tsx`(Ctrl+Z/Y), `src/engine/spreadsheet/FormulaEngineAdapter.ts`·`adapters/HyperFormulaAdapter.ts`(`loadSheets`, D-16 회피), `formulaPreprocess.ts`(D-15 한글 시트 이름), `src/pages/dev/WorkspaceHarnessPage.tsx`(하단 실행 취소·다시 실행, R-04.43), `src/app/routes.tsx`, `src/components/layout/AppSidebar.tsx`(연습실 링크)
  - (구현 시 추가, 2026-10-23) `tests/unit/spreadsheet/workbookModel.test.ts`, `tests/unit/spreadsheet/SheetTabs.test.tsx`, `tests/unit/pages/SandboxPage.test.tsx`, `tests/unit/helpers/layoutStubs.ts`, `tests/e2e/sandbox.spec.ts`
- **구현 지침 및 금지 사항:**
  - Undo 실행 시 직전 셀 값 및 수식이 100% 복원되어야 함.
  - 연습실 모드와 학습 모드의 상태 저장소를 명확히 분리.
  - 샘플 데이터(R-04.46)는 원문 10장에 따라 개인정보나 실제 기업의 기밀 데이터를 쓰지 않고 독창적인 가상 데이터만 사용한다. 실존 기업명·실존 인물명·실제 연락처 형식의 값을 넣지 않으며 테스트가 이를 점검한다. 빈 셀·중복 등 오류가 섞인 데이터를 넣더라도 난이도에 맞지 않는 불필요한 혼란은 만들지 않는다.
  - 빈 스프레드시트(R-04.45)와 샘플 불러오기는 연습실 저장소에만 쓰고 학습 모드 상태를 건드리지 않는다.
  - 셀 편집(R-04.47)과 수식 입력(R-04.48) 구현은 CARD-02B(수식 엔진)·CARD-02C(입력줄)가 맡는다. 02D는 새로 구현하지 않고 연습실에서 연결·검증만 한다.
  - 셀 기본 정렬(R-08.22, 2026-10-23 추가): 서식을 지정하지 않은 셀은 Excel 기본 표시 동작대로 숫자(날짜 일련번호 포함)는 오른쪽, 문자열은 왼쪽, 논리값과 오류 값은 가운데 정렬한다. 원문 글자가 아니라 엔진 계산 결과의 값 종류(`CellResult.value`의 타입과 `error`)로 판정하므로, 작은따옴표로 입력한 숫자(`'123`)나 문자로 저장된 숫자는 왼쪽에 놓인다. 이것은 셀 서식(사용자가 정하는 정렬, Phase 7)이 아니라 기본 표시이며, 원문 Level 4 "데이터 형식 통일"(R-05.55)에서 숫자처럼 보이는 문자를 찾는 학습의 전제다.
  - 학습 파일 저장(R-04.52)은 `eval` 없이 JSON만 사용한다. 내구성 있는 IndexedDB 연동과 공통 직렬화 모듈은 CARD-06B(`cellStateSerializer.ts`)에서 통합한다.
  - (구현 시 추가, 2026-10-23) 저장 방식(사용자 결정): 브라우저 저장(연습실 전용 localStorage 키)과 JSON 파일 내려받기·올리기. 불러오는 내용은 신뢰할 수 없는 입력으로 보고 크기·형식·버전·셀 주소·수식 길이를 검사한다.
  - (구현 시 추가, 2026-10-23) 여러 시트(R-04.49): Excel 시트 이름 규칙(31자, `[]:*?/\` 금지, 앞뒤 작은따옴표 금지, 대소문자 무시 중복 금지), 시트 20개 상한, 마지막 시트 삭제 불가, 값이 있는 시트 삭제는 확인. 이름을 바꾸면 다른 시트 수식의 시트 이름도 바뀐다.
  - (구현 시 추가, 2026-10-23) 실행 취소(MASTER_PROMPT §9.2): 셀 값·수식·시트 추가/삭제/이름 변경·샘플·빈 스프레드시트·파일 불러오기·학습 화면 "다시 시작" 모두 실행 취소 대상. 편집 중이 아닐 때 Ctrl+Z, Ctrl+Y·Ctrl+Shift+Z(Q-06). 학습 화면 하단 바에 실행 취소·다시 실행 버튼(R-04.43).
- **완료 조건:**
  - 사용자가 브라우저에서 실제로 데이터를 입력하고 수식을 계산하며, 다중 시트 전환 및 Undo/Redo가 안정적으로 동작한다.
  - 연습실(`/sandbox`)에서 빈 스프레드시트를 만들고 가상 샘플 데이터를 불러올 수 있다(R-04.45, R-04.46).
  - 연습실에서 셀 편집과 수식 입력이 동작한다(R-04.47, R-04.48. 구현은 02B·02C).
  - 연습실(`/sandbox`)에서 작업한 내용을 학습 파일로 저장하고, 새로고침 후 다시 불러오면 값·수식·시트 구성이 동일하게 복원된다(R-04.52). (Phase 2 완료 판정은 CARD-02E 이후)
  - 숫자·날짜는 오른쪽, 문자열(문자로 저장된 숫자 포함)은 왼쪽, TRUE/FALSE와 `#DIV/0!` 같은 오류는 가운데 정렬되어 보이고, 수식 결과가 바뀌면 정렬도 결과 종류에 맞게 바뀐다(R-08.22). 단위 테스트와 Chromium E2E로 확인한다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/history/
  npm test tests/unit/spreadsheet/cellAlignment.test.tsx
  npm test tests/unit/sandbox/
  npm run typecheck
  npm run lint
  npm run build
  npx playwright test
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-02E: 행·열 조작, 복사·붙여넣기 및 자동 채우기 (Range Operations)
- **관련 요구사항 ID:** R-08.06, R-08.07, R-08.10, R-08.17, Q-04, R-08.02(수식 편집 중 범위 선택 = 포인트 모드, 2026-10-23 추가. 튜토리얼 R-07.05·R-07.06의 전제). 구현 시 추가(2026-10-23): Q-06(Ctrl+C/X/V, Ctrl+D/R, 시트 이동 단축키), R-17.10~R-17.16(Phase 2 완료 게이트 판정)
- **선행 카드:** CARD-02D
- **생성·수정할 파일:**
  - `src/engine/spreadsheet/operations/referenceShift.ts` (수식 참조 이동 공통 로직, 상대/절대 참조 구분)
  - `src/engine/spreadsheet/operations/rowColumnOps.ts` (행·열 삽입, 삭제, 크기 조절, 수식 참조 갱신)
  - `src/engine/spreadsheet/operations/clipboard.ts` (복사, 잘라내기, 붙여넣기, TSV 변환, 붙여넣을 때 상대 참조 이동)
  - `src/engine/spreadsheet/operations/autoFill.ts` (숫자·날짜 시퀀스와 수식 채우기)
  - `src/components/spreadsheet/hooks/useClipboard.ts` (Ctrl+C/X/V 연결)
  - `src/components/spreadsheet/hooks/useFillHandle.ts` (채우기 핸들 드래그, Ctrl+D/R)
  - `src/components/spreadsheet/GridHeader.tsx` (행·열 머리글 메뉴: 삽입, 삭제, 너비·높이 조절)
  - `tests/unit/engine/rowColumnOps.test.ts`
  - `tests/unit/engine/clipboard.test.ts`
  - `tests/unit/engine/autoFill.test.ts` (fast-check: 채우기 수식 주소 오프셋 속성 테스트)
  - `tests/e2e/range-operations.spec.ts`
  - (2026-10-23 추가, 포인트 모드) `src/components/spreadsheet/hooks/usePointMode.ts` (수식 편집 중 셀 클릭·드래그·Shift+클릭·화살표로 참조 삽입·교체), `src/components/spreadsheet/formulaReference.ts` (커서 위치 참조 삽입·교체 함수 추가), `src/components/spreadsheet/SpreadsheetGrid.tsx`, `src/components/spreadsheet/FormulaBar.tsx`, `src/components/spreadsheet/SheetTabs.tsx` (다른 시트 탭 클릭 시 시트 참조 삽입)
  - (2026-10-23 추가, 포인트 모드) `tests/unit/spreadsheet/pointMode.test.ts`, `tests/e2e/point-mode.spec.ts`
  - (구현 시 추가, 2026-10-23) `src/components/spreadsheet/workbookModel.ts`(행·열·크기·붙여넣기·잘라내기·채우기·시트 순서 명령), `hooks/useWorkbook.ts`, `hooks/useCellEditing.ts`(편집 시트·커서·조합 상태), `hooks/useClipboard.ts`, `hooks/useCellSelection.ts`(행·열 전체 선택), `hooks/useVirtualGrid.ts`(행·열별 크기), `hooks/useImeInput.ts`(조합 표시 초기화), `GridOverlays.tsx`(참조 색 테두리·복사 점선·채우기 핸들), `ContextMenu.tsx`(우클릭·Shift+F10 메뉴, 크기 입력), `GridHeader.tsx`(전체 선택·크기 손잡이), `CellEditor.tsx`, `Spreadsheet.tsx`, `types.ts`, `src/services/sandbox/sandboxFileStore.ts`(열 너비·행 높이 선택 필드), `src/styles/tokens.css`·`src/index.css`(참조 색 토큰)
  - (구현 시 추가, 2026-10-23) 테스트 `tests/unit/engine/referenceShift.test.ts`(HyperFormula 교차 검증 포함), 기존 `historyManager.test.ts`(50회 왕복에 새 동작 7종)·`SheetTabs.test.tsx`·`sandboxFileStore.test.ts`·`useCellEditing.test.ts` 보강
- **구현 지침 및 금지 사항:**
  - 모든 변경은 CARD-02D의 historyManager 명령으로 실행해 Undo/Redo가 되어야 한다.
  - 참조 계산은 CARD-02B 엔진을 사용하고 수식 문자열을 정규식으로만 치환하는 방식 금지(`$A$1`, 시트 간 참조 포함).
  - 문제 ID별 정답 하드코딩 금지. 삭제된 셀을 가리키는 참조는 `#REF!`로 처리한다.
  - `fast-check`는 CARD-02C에서 4.10.2(공개 2주 이상 지난 버전, S-10)로 설치했다. 이 카드는 그것을 그대로 쓴다.
  - 포인트 모드(2026-10-23 추가): 수식을 편집 중이고 커서가 참조를 넣을 수 있는 자리(`=`, 연산자, `(`, `,`, `:` 바로 뒤, 또는 직전에 포인트 모드로 넣은 참조 위)에 있을 때만 켠다. 그 밖에 셀을 클릭하면 지금처럼 편집을 확정하고 그 셀을 고른다(CARD-02C 동작 유지).
  - 포인트 모드에서 셀을 클릭하면 `B3`, 드래그하거나 Shift+클릭하면 `B3:B7`이 커서 자리에 들어가고, 드래그하는 동안 실시간으로 바뀐다. 셀에서 바로 타이핑해 시작한 편집(enter 모드)에서는 화살표 키도 참조를 움직인다. 다른 시트 탭을 누르면 `Sheet2!A1`처럼 시트 이름을 붙이고, 공백·특수문자가 있으면 작은따옴표로 감싼다. 넣은 참조 범위는 색 테두리로 보여 준다.
  - 셀 편집기와 수식 입력줄 어느 쪽에서 편집 중이어도 같은 동작이어야 한다(CARD-02C 공유 편집 컨트롤러 사용). 한글 조합 중에는 포인트 모드로 바꾸지 않는다(useImeInput).
  - 참조 삽입·교체는 `formulaReference.ts`의 토큰 단위 처리로 하고 정규식 치환을 쓰지 않는다. 포인트 모드 중 이동은 Undo 대상이 아니며, Enter로 확정한 수식만 historyManager 명령이 된다. 확정하면 편집을 시작한 셀로 돌아간다.
  - 튜토리얼(CARD-03B)이 "범위를 드래그해 SUM 인수 넣기" 같은 단계를 검증할 수 있도록, 포인트 모드 시작·참조 변경·종료를 그리드 외부에서 구독할 수 있는 이벤트로 알린다.
  - (구현 시 추가, 2026-10-23, 사용자 승인) 시트 탭 순서 바꾸기(탭 끌어 놓기 + "◀ 이동"/"이동 ▶" 버튼, 실행 취소 가능)와 시트 이동 단축키를 이 카드에서 처리한다. Ctrl+PageUp/PageDown은 Chromium 예약 단축키(`IDC_SELECT_*_TAB`)라 일반 창의 웹 페이지가 받지 못하므로 대체 단축키 Ctrl+Shift+PageUp/PageDown을 두고 시트 탭에 안내한다(TEST_STRATEGY Q-06).
  - (구현 시 추가) 수식 참조 변환은 엔진 API(addRows, copy/paste)가 아니라 원문 토큰 변환으로 하고, 같은 결과인지 HyperFormula API와 속성 테스트로 맞대어 본다(TECHNICAL_DESIGN §3.1, EXCEL_DIFFERENCES D-18·D-19). Excel 실측이 필요한 결과는 EXCEL_DIFFERENCES "다음 골든 라운드 확인 목록" 10~14번에 둔다.
- **완료 조건:**
  - 행·열을 삽입·삭제하면 수식 참조가 갱신되고, 복사한 수식은 상대 참조가 이동한 채 붙여넣어지며, 채우기 핸들로 숫자·날짜·수식이 확장된다. 세 동작 모두 Undo로 복원된다.
  - `=SUM(`까지 입력한 상태에서 B3:B7을 드래그하면 `=SUM(B3:B7`이 들어가고, `)`와 Enter로 확정하면 결과가 보인다. 셀 편집기와 수식 입력줄에서 모두 된다. 다른 시트 탭을 눌러 `Sheet2!A1` 참조를 넣을 수 있다. 커서가 참조를 넣을 수 없는 자리면 셀 클릭은 확정·선택으로 동작한다. Chromium E2E(`point-mode.spec.ts`)로 확인한다.
  - (구현 시 추가) 시트 탭 순서를 바꾸고 되돌릴 수 있으며, Ctrl+Shift+PageUp/PageDown으로 시트를 옮겨 다닌다. Phase 2 완료 게이트(R-17.10~R-17.16)를 근거 테스트와 함께 판정한다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/engine/
  npm test tests/unit/spreadsheet/pointMode.test.ts
  npm run typecheck
  npm run lint
  npx playwright test tests/e2e/range-operations.spec.ts tests/e2e/point-mode.spec.ts
  # 구현 시 추가: 전체 회귀
  npm test
  npm run format:check
  npm run build
  npx playwright test
  npm run test:perf
  ```
- **외부 사용자 조치:** 없음.

---

### [Phase 3: 튜토리얼 엔진]

#### CARD-03A: 선언적 튜토리얼 스키마 및 상태 머신 러너 (Tutorial Schema & FSM Runner)
- **관련 요구사항 ID:** R-07.02~R-07.13 (옛 표기 R-07.1-01~03)
- **선행 카드:** CARD-02E
- **생성·수정할 파일:**
  - `src/types/tutorial.schema.ts` (Zod 기반 `TutorialStepSchema`)
  - `src/engine/tutorials/tutorialRunner.ts` (XState 또는 경량 FSM 상태 머신)
  - `src/features/learning/context/TutorialContext.tsx`
  - `tests/unit/tutorials/tutorialRunner.test.ts`
- **구현 지침 및 금지 사항:**
  - 단순 텍스트 상자 표시용 모달 형태 구현 금지.
  - 코드가 아닌 선언적 데이터 스키마로 각 단계의 타깃 셀과 기대 조작 정의.
- **완료 조건:**
  - 튜토리얼 단계가 데이터 스키마대로 로드되고 올바른 이벤트 수신 시에만 다음 단계로 전이된다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/tutorials/tutorialRunner.test.ts
  npm run typecheck
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-03B: 사용자 셀 조작 감지기 및 강제 검증기 (Action Detector & Validator)
- **관련 요구사항 ID:** R-01.0-06, R-07.1-02, R-07.1-03
- **선행 카드:** CARD-03A
- **생성·수정할 파일:**
  - `src/engine/tutorials/actionDetector.ts` (셀 선택 이벤트, 입력 완료 이벤트, 단축키 감지)
  - `src/features/learning/components/TutorialStepGuards.tsx`
  - `tests/unit/tutorials/actionDetector.test.ts`
  - (구현 시 추가, 2026-10-24) `src/components/spreadsheet/Spreadsheet.tsx`(onUserAction·inputGuard·단축키 감지), `SpreadsheetGrid.tsx`·`types.ts`(onSelectionChange), `hooks/useCellEditing.ts`(onCommitted), `hooks/useWorkbook.ts`(getResultOf), `src/engine/tutorials/tutorialRunner.ts`(허용 입력 판정 우선·export), `src/pages/dev/TutorialHarnessPage.tsx`(/dev/tutorial), `src/app/routes.tsx`, `tests/e2e/tutorial-actions.spec.ts`, `tests/unit/spreadsheet/useCellEditing.test.ts` 보강
- **구현 지침 및 금지 사항:**
  - '다음' 버튼 클릭만으로 단계가 넘어가는 행위 절대 금지 (R-07.1-03).
  - 타깃 셀(예: B2)에 기대된 수식(예: `=SUM(B3:B7)`)이 입력되고 계산 결과가 일치해야 통과.
- **완료 조건:**
  - 오직 올바른 셀 입력 조작이 완료되었을 때만 다음 단계가 트리거된다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/tutorials/actionDetector.test.ts
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-03C: 비침해적 Spotlight 오버레이 및 동적 말풍선 (Spotlight & Callout)
- **관련 요구사항 ID:** R-01.0-03, R-07.2-01, R-07.2-02, R-07.2-03, R-07.2-04, R-07.2-05, P-04
- **선행 카드:** CARD-03B
- **생성·수정할 파일:**
  - `src/components/tutorial/SpotlightOverlay.tsx` (SVG mask 기반 배경 어두움 처리)
  - `src/components/tutorial/CalloutTooltip.tsx` (가장자리 Flip 충돌 방어)
  - `src/components/tutorial/hooks/useSpotlightPosition.ts` (`ResizeObserver` 및 스크롤 연동)
  - `tests/unit/components/CalloutTooltip.test.tsx`
  - (CARD-03B 후속, 2026-10-24) `src/features/learning/components/TutorialStepGuards.tsx`(말풍선 안 '다음' 버튼 연결), `tests/e2e/tutorial-actions.spec.ts`(포커스 확인 추가), `src/components/spreadsheet/Spreadsheet.tsx`(포커스 복귀용 핸들 노출이 필요하면)
- **구현 지침 및 금지 사항:**
  - (CARD-03B 후속, R-07.13) 말풍선의 '다음' 버튼을 눌러 단계가 넘어간 뒤 키보드 포커스를 그리드(`SpreadsheetHandle.focus()`)로 되돌린다. 03B의 개발 확인 화면에서는 '다음'을 누르면 포커스가 버튼에 남아 이어지는 `Ctrl+Z` 등 단축키가 그리드에 닿지 않는다. 단계가 안 넘어가는 경우(비활성)에는 포커스를 옮기지 않는다. 말풍선·'다음' 버튼은 `TutorialStepGuards`의 규칙(행동이 맞은 confirm 단계에서만 활성)을 그대로 따른다.
  - 오버레이가 사용자의 마우스/키보드 입력을 차단하지 않도록 `pointer-events` 제어.
  - 가상 스크롤 상태에서 대상 셀이 화면 밖일 경우 자동 스크롤 후 하이라이트.
- **완료 조건:**
  - 대상 셀 위치에 정확히 하이라이트 경계선이 그려지고 말풍선이 화면 밖으로 잘리지 않는다.
  - (CARD-03B 후속) '다음'을 누른 직후 포커스가 그리드에 있어 Ctrl+Z 같은 단축키 단계가 셀을 다시 클릭하지 않고도 동작함을 E2E로 확인한다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/components/CalloutTooltip.test.tsx
  npm run typecheck
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-03D: 자연스러운 모션 전환 및 접근성 (Motion Transitions & Accessibility)
- **관련 요구사항 ID:** R-07.3-01, R-07.3-02, R-07.3-03, R-07.3-04, R-07.3-05, R-17.3-01, P-03
- **선행 카드:** CARD-03C
- **생성·수정할 파일:**
  - `src/styles/motion.ts` (Motion for React 토큰)
  - `src/components/tutorial/MotionWrapper.tsx`
  - `src/features/settings/hooks/useReducedMotion.ts` (`prefers-reduced-motion` 및 인앱 설정)
  - `tests/e2e/tutorial-flow.spec.ts` (Playwright E2E)
  - (CARD-03B 후속, 2026-10-24) `src/components/spreadsheet/Spreadsheet.tsx`·`SpreadsheetGrid.tsx`(같은 셀 클릭 이벤트, 붙여넣기·채우기 차단, 실행 취소 알림), `src/engine/tutorials/actionDetector.ts`, `src/features/learning/components/TutorialStepGuards.tsx`, `tests/unit/tutorials/actionDetector.test.ts`, `tests/unit/spreadsheet/SpreadsheetGrid.test.tsx`
- **구현 지침 및 금지 사항:**
  - (CARD-03B 후속, R-07.05) **이미 선택된 셀 클릭:** 03B는 선택이 바뀔 때만 `SELECT_CELL`을 보내서, 목표 셀이 이미 선택돼 있으면 "셀 선택" 단계를 끝낼 수 없다(첫 튜토리얼에서 학생이 갇힐 수 있다). 그리드가 셀을 누르는 순간(편집 중이 아니고 포인트 모드가 처리하지 않은 클릭)에도 선택 변경 여부와 관계없이 `selectionChanged`를 보내도록 고친다. **단계가 시작될 때 이미 목표가 선택돼 있다고 자동 완료하는 방식은 쓰지 않는다**("사용자가 직접 조작해야 한다" 원칙, R-01.06). 처음 그려질 때·프로그램이 선택을 옮길 때(`selectCell` 핸들, 편집 확정 뒤 이동)는 보내지 않는다. 같은 클릭이 두 번 알려지지 않게 한다.
  - (CARD-03B 후속, R-07.06) **붙여넣기·채우기 차단:** `allowedInput.cells` 차단이 `applyChanges` 경로(입력 확정·Delete)에만 걸려 있다. 붙여넣기(`workbook.paste`·`moveCells`), 채우기 핸들·`Ctrl+D/R`(`fill`·`fillFromEdge`)도 영향받는 대상 범위가 허용 셀 밖이면 반영 전에 같은 기준(`violatesAllowedInput`)으로 막고 안내 문장을 보여 준다. 막은 시도도 틀린 시도로 기록한다. 붙여넣기는 `ENTER_VALUE`로 위장하지 말고 판정 기준을 한곳(허용 셀 범위 검사)에 모은다.
  - (CARD-03B 후속, R-07.05) **실행 취소 감지:** 실행 취소를 `Ctrl+Z` 키로만 감지하므로 도구 모음 버튼으로 한 실행 취소는 러너가 모른다. 키·버튼 어느 쪽이든 `workbook.undo()`가 실제로 실행된 때 한 곳에서 알리도록 한다(예: 그리드의 `handleUndo`와 도구 모음 버튼이 같은 알림 경로를 쓴다). 스키마 `PRESS_KEY: Ctrl+Z`와의 관계는 사용자 결정 사항이다: 기존 단계 데이터를 깨지 않도록 (a) 실행 취소 실행을 `Ctrl+Z` 키 이벤트로도 환산해 보내거나 (b) `UNDO` 기대 조작 타입을 스키마에 추가한다. 선택은 계획 승인 때 받는다. 둘 다 실제로 실행 취소가 일어났을 때만 알리고(되돌릴 것이 없으면 알리지 않는다), 키와 버튼이 겹쳐 두 번 알려지지 않게 한다.
  - `transform`, `opacity` 속성만 움직이고 과도한 바운스/파티클 효과 배제.
  - 모션 감소 활성화 시 모든 전환 시간 즉시 0으로 축소.
- **완료 조건:**
  - Phase 3 완료 조건 충족: 사용자가 실제 셀을 조작해야만 다음 단계로 진행되는 튜토리얼이 매끄럽게 완성된다.
  - (CARD-03B 후속) 목표 셀이 이미 선택된 상태에서 그 셀을 클릭해 "셀 선택" 단계를 끝낼 수 있고, 허용 셀 밖 붙여넣기·채우기는 막히며, 도구 모음 버튼과 Ctrl+Z 어느 쪽의 실행 취소든 인식된다. 각각 `tutorial-flow.spec.ts`(또는 `tutorial-actions.spec.ts`)와 단위 테스트로 확인한다.
- **실행할 검증 명령:**
  ```powershell
  npx playwright test tests/e2e/tutorial-flow.spec.ts
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

### [Phase 4: 문제와 채점]

#### CARD-04A: 문제 스키마 정의 및 독립 로더 (Problem Schema & Loader)
- **관련 요구사항 ID:** R-06.0-01, R-06.0-02, R-06.0-03, R-09.0-01, S-04
- **선행 카드:** CARD-03D
- **생성·수정할 파일:**
  - `src/types/problem.schema.ts` (14대 속성 포함 Zod 스키마)
  - `src/engine/grading/problemLoader.ts`
  - `src/content/courses/` (기본 코스 메타데이터)
  - `tests/unit/grading/problemSchema.test.ts`
- **구현 지침 및 금지 사항:**
  - 문제 정의를 UI 컴포넌트에 하드코딩하지 말 것.
  - 문제 데이터 추가/수정 시 UI 컴포넌트를 수정할 필요가 없도록 완전 분리.
- **완료 조건:**
  - Zod 스키마로 문제 데이터 유효성이 검증되고 독립 로더를 통해 데이터가 로드된다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/grading/problemSchema.test.ts
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-04B: 데이터 교란 채점 엔진 구현 (Perturbation Scoring Engine)
- **관련 요구사항 ID:** R-01.0-08, R-09.1-01, R-09.1-02, R-09.2-01, R-09.2-02, Q-02
- **선행 카드:** CARD-04A
- **생성·수정할 파일:**
  - `src/engine/grading/PerturbationScorer.ts`
  - `src/engine/grading/diagnostics/misconceptionClassifier.ts`
  - `tests/unit/grading/PerturbationScorer.test.ts`
- **구현 지침 및 금지 사항:**
  - 단순 문자열 비교 금지.
  - 5대 판정(완전 정답, 대체 수식 정답, 하드코딩 숫자 오답, 범위 누락 오답, 참조 오류) 감별.
  - 오답 발생 시 사용자가 작성한 시트 데이터를 무조건 삭제하거나 초기화하지 말 것.
- **완료 조건:**
  - 하드코딩 값 주입 시 `HARDCODED_VALUE` 진단 및 맞춤 피드백 반환, 올바른 수식 시 통과 판정.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/grading/PerturbationScorer.test.ts
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-04C: 4단계 아코디언 힌트 및 결과 모달 (Hints & Results Modal)
- **관련 요구사항 ID:** R-01.0-09, R-09.3-01, R-09.3-02
- **선행 카드:** CARD-04B
- **생성·수정할 파일:**
  - `src/features/learning/components/HintAccordion.tsx` (개념 -> 범위 -> 수식골격 -> 완전정답)
  - `src/features/learning/components/GradingFeedbackPanel.tsx`
  - `src/features/learning/components/ProblemResultModal.tsx`
  - `tests/unit/components/HintAccordion.test.tsx`
- **구현 지침 및 금지 사항:**
  - 사용자가 '힌트 보기'를 클릭하기 전에는 절대 정답이나 힌트를 노출하지 말 것.
  - 힌트를 열었다고 문제를 자동 완료 처리하지 말 것.
- **완료 조건:**
  - 힌트가 순차적으로 열리고, 문제 완료 시 정답 이유와 함께 결과 모달이 노출된다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/components/HintAccordion.test.tsx
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-04D: 기초 10대 검증 문항 콘텐츠 제작 (Foundational Problems Content)
- **관련 요구사항 ID:** R-05.0-01, R-05.0-02, R-05.1-01, R-05.2-01, R-05.3-01, R-05.3-02, R-09.4-01, R-09.4-02, R-10.0-04, R-10.0-05
- **선행 카드:** CARD-04C
- **생성·수정할 파일:**
  - `src/content/exercises/level0/intro-cells.ts` (Level 0: 셀 선택, 데이터 입력, 채우기 3문항)
  - `src/content/exercises/level1/formatting-basic.ts` (Level 1: 숫자 표시형식, 테두리 2문항)
  - `src/content/exercises/level2/formula-refs.ts` (Level 2: 기본 사칙연산, 상대/절대참조 3문항)
  - `src/content/exercises/level3/sum-average.ts` (Level 3: SUM, AVERAGE 실무 2문항)
- **구현 지침 및 금지 사항:**
  - 단순 숫자/주소만 바꾼 복붙 문제 금지.
  - 각 문제마다 기준 정답(`canonicalFormula`) 및 대표 오답 최소 2종 포함.
- **완료 조건:**
  - Level 0~3 영역의 검증된 10개 문항이 Zod 스키마를 만족하며 생성된다.
- **실행할 검증 명령:**
  ```powershell
  npm run typecheck
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-04E: 콘텐츠 자체 검증 CI 파이프라인 (Content Self-Validation Script)
- **관련 요구사항 ID:** R-10.0-01, R-10.0-02, R-10.0-03, R-17.4-01, Q-03
- **선행 카드:** CARD-04D
- **생성·수정할 파일:**
  - `scripts/verify-content.ts` (모든 문제의 스키마, 기준정답 통과, 대표오답 실패 자동 검증 스크립트)
  - `src/content/datasets/sampleData.ts` (가상 실무 데이터셋)
  - `package.json` (`"verify-content": "tsx scripts/verify-content.ts"`)
- **구현 지침 및 금지 사항:**
  - 단 1개의 문제라도 기준 정답이 채점을 통과하지 못하면 CI 빌드 차단.
- **완료 조건:**
  - Phase 4 완료 조건 충족: 최소 10개의 검증된 기초 문제를 실제로 풀 수 있고, 자체 검증 스크립트가 100% 통과한다.
- **실행할 검증 명령:**
  ```powershell
  npm run verify-content
  npm test
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

### [Phase 5: 학습 경로와 게임화]

#### CARD-05A: 분기형 학습 경로 맵 구축 (Branching Path DAG Map)
- **관련 요구사항 ID:** R-01.0-01, R-04.3-01, R-04.3-02
- **선행 카드:** CARD-04E
- **생성·수정할 파일:**
  - `src/features/learning/components/LearningPathMap.tsx`
  - `src/features/learning/components/CourseNode.tsx` (6대 상태 UI)
  - `src/features/learning/hooks/useCourseProgress.ts`
  - `tests/unit/features/LearningPathMap.test.tsx`
- **구현 지침 및 금지 사항:**
  - 단순 선형 일직선 배치 금지. 선수 관계에 따른 분기형 노드 렌더링.
  - 6단계 상태(`LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`, `REVIEW_RECOMMENDED`, `MASTERED`) 시각화.
- **완료 조건:**
  - 선행 단원 완료 시 다음 단원이 잠금 해제되는 학습 맵이 정상 렌더링된다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/features/LearningPathMap.test.tsx
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-05B: 진단 평가 및 간격 반복 복습 큐 (Placement & Spaced Repetition)
- **관련 요구사항 ID:** R-04.3-03, R-11.4-01, R-11.5-01, R-11.5-02
- **선행 카드:** CARD-05A
- **생성·수정할 파일:**
  - `src/engine/review/spacedRepetition.ts` (에빙하우스 망각 곡선 알고리즘)
  - `src/features/learning/components/DiagnosticTestModal.tsx`
  - `src/features/learning/components/ReviewQueueWidget.tsx`
  - `tests/unit/review/spacedRepetition.test.ts`
- **구현 지침 및 금지 사항:**
  - 영구 완료 처리 금지. 틀린 문제는 1일 뒤, 힌트 사용 문제는 3일 뒤 복습 큐에 재진입.
- **완료 조건:**
  - 복습 일정 계산 및 진단 평가를 통한 단원 조기 해금이 정상 동작한다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/review/spacedRepetition.test.ts
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-05C: 경험치(XP), 연속 학습일(Streak) 및 업적 코어 (Gamification Core)
- **관련 요구사항 ID:** R-11.1-01, R-11.2-01, R-11.3-01, R-17.5-01
- **선행 카드:** CARD-05B
- **생성·수정할 파일:**
  - `src/features/gamification/xpManager.ts` (어뷰징 방지 상한 로직)
  - `src/features/gamification/streakManager.ts` (연속 학습일 및 결석 완화 정책)
  - `src/features/gamification/achievementRegistry.ts` (7대 핵심 업적)
  - `src/features/gamification/components/AchievementToast.tsx`
  - `tests/unit/gamification/xpManager.test.ts`
  - `tests/e2e/learning-journey.spec.ts` (전체 학습 여정 완주 E2E)
- **구현 지침 및 금지 사항:**
  - 쉬운 문제 반복을 통한 무한 파밍 방지 (문제당 1회 최초 성공 XP + 복습 제한 XP).
- **완료 조건:**
  - Phase 5 완료 조건 충족: 사용자가 첫 단원부터 마지막 문제까지 하나의 학습 흐름을 완주하며 경험치, 업적, 연속 학습일이 누적된다.
- **실행할 검증 명령:**
  ```powershell
  npx playwright test tests/e2e/learning-journey.spec.ts
  npm test
  npm run build
  ```
- **외부 사용자 조치:** 없음.

---

### [Phase 6: Firebase 연동 및 보안]

#### CARD-06A: Firebase SDK 연동, 인증 및 게스트 모드 (Auth & Guest Mode)
- **관련 요구사항 ID:** R-03.0-02, R-13.1-01, R-14.0-03, S-05, S-06, S-13
- **선행 카드:** CARD-05C
- **생성·수정할 파일:**
  - `src/services/firebase/firebaseApp.ts` (SDK 초기화, App Check debug/reCAPTCHA)
  - `src/services/firebase/authService.ts` (이메일/비번, 재설정, 게스트 익명 로그인)
  - `src/features/auth/components/AuthModal.tsx`
  - `src/features/auth/hooks/useAuth.ts`
  - `tests/unit/services/authService.test.ts`
- **구현 지침 및 금지 사항:**
  - Firebase 설정이 없는 로컬 개발 환경에서도 에러 없이 '게스트 모드(로컬 저장소)'로 완전 작동하도록 폴백 구성 (R-14.0-03).
  - 이메일 열거 방지: 로그인 실패 시 모호한 일반 오류 메시지 반환 (S-13).
- **완료 조건:**
  - 로그인/회원가입 및 게스트 체험 모드가 동작하고 환경 변수 미설정 시에도 앱이 다운되지 않는다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/services/authService.test.ts
  npm run build
  ```
- **외부 사용자 조치:** (Firebase 프로젝트 생성 시) 사용자가 Firebase 콘솔에서 Web App 생성 후 `.env.local`에 키 입력.

---

#### CARD-06B: Firestore 진도 모델, 오프라인 캐시 및 탈퇴 처리 (Firestore Progress & Privacy)
- **관련 요구사항 ID:** R-13.2-01, R-13.2-02, R-13.4-01, R-13.4-02, R-08.13, S-12, Q-09
- **선행 카드:** CARD-06A
- **생성·수정할 파일:**
  - `src/services/firebase/progressService.ts` (디바운스 쓰기, 일괄 읽기 최적화)
  - `src/services/storage/offlineStorage.ts` (IndexedDB / localStorage 캐시)
  - `src/engine/spreadsheet/serialization/cellStateSerializer.ts` (R-08.13: 수식·값·서식·시트 구성을 버전 필드가 있는 JSON으로 직렬화·복원)
  - `tests/unit/engine/cellStateSerializer.test.ts` (저장 후 복원한 수식과 값이 원본과 같은지, 알 수 없는 버전 거부)
  - `src/features/profile/components/DataExportButton.tsx` (데이터 JSON 다운로드)
  - `src/features/profile/components/DeleteAccountModal.tsx` (계정 및 진도 영구 삭제)
  - `tests/unit/services/progressService.test.ts`
- **구현 지침 및 금지 사항:**
  - 모든 문제를 매번 Firestore에서 새로 불러오지 말고 로컬 캐시 우선 사용 (R-13.4-01).
  - 네트워크 단절 시 오프라인 캐시를 유지하고 복구 시 지수 백오프로 재시도 (Q-09).
  - 셀 상태 직렬화는 `eval` 없이 JSON만 사용하고 복원 시 스키마를 검증한다.
- **완료 조건:**
  - 진도 데이터가 오프라인에서도 보존되고, 계정 탈퇴 시 사용자 데이터가 영구 삭제된다. 저장한 셀 상태를 새로고침 후 복원하면 수식과 값이 동일하다.
- **실행할 검증 명령:**
  ```powershell
  npm test tests/unit/services/progressService.test.ts tests/unit/engine/cellStateSerializer.test.ts
  npm run typecheck
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-06C: Firestore 보안 규칙 및 Local Emulator 테스트 (Security Rules & Emulator)
- **관련 요구사항 ID:** R-13.3-01, R-13.3-02, R-13.3-03, R-17.6-01, S-01, S-02, S-03, S-14
- **선행 카드:** CARD-06B
- **생성·수정할 파일:**
  - `firestore.rules` (Default Deny, 본인 소유권 강제, XP 상한 제한)
  - `firebase.json` (에뮬레이터 설정)
  - `tests/rules/firestore.rules.test.ts` (`@firebase/rules-unit-testing`)
  - `package.json` (`"test:rules": "firebase emulators:exec --only firestore 'vitest run tests/rules'"`)
- **구현 지침 및 금지 사항:**
  - 단순 로그인 여부 검사 금지. 본인 UID 일치, 공용 콘텐츠 쓰기 금지, 불변 필드 보호, XP 조작 차단 검증.
- **완료 조건:**
  - Phase 6 완료 조건 충족: 서로 다른 계정의 데이터가 분리되고, Firestore 보안 규칙 테스트 5종이 Local Emulator에서 100% 통과한다.
- **실행할 검증 명령:**
  ```powershell
  npm run test:rules
  ```
- **외부 사용자 조치:** Firebase CLI (`npm install -g firebase-tools`) 및 Java 런타임(에뮬레이터 구동용) 설치 필요 시 안내.

---

### [Phase 7: 확장 (Post-MVP Expansion)]

#### CARD-07A: Level 4 데이터 정리 및 정제 모듈 (Level 4 Data Wrangling)
- **관련 요구사항 ID:** R-05.4-01
- **선행 카드:** Phase 6 완료
- **생성·수정할 파일:**
  - `src/content/exercises/level4/` (정렬, 필터, 중복제거, 텍스트나누기, 데이터유효성검사 12개 모듈)
- **완료 조건:** Level 4 전체 모듈 단위 테스트 및 자체 검증 스크립트 통과.

---

#### CARD-07B: Level 5 차트 및 시각화 엔진 (Level 5 Charts)
- **관련 요구사항 ID:** R-05.5-01, R-05.5-02, R-04.50, P-02
- **선행 카드:** CARD-07A
- **생성·수정할 파일:**
  - `src/components/charts/ChartView.tsx` (Recharts / Canvas 기반)
  - `src/content/exercises/level5/` (차트 선택 및 대시보드 8개 모듈)
  - `src/components/sandbox/FormatChartToolbar.tsx` (R-04.50: 연습실의 셀 서식 및 차트 삽입. Phase 2에서 연기됨, MASTER_PROMPT 17장 Phase 7)
  - `tests/unit/sandbox/formatChartToolbar.test.tsx`
- **완료 조건:** 차트 컴포넌트 렌더링 및 올바른 차트 유형 판정 채점 통과. 연습실에서 셀 서식과 차트 삽입이 실제로 동작한 범위만 R-04.50을 완료로 표시한다.

---

#### CARD-07C: Level 6 분석 도구 및 시뮬레이션 (Level 6 Analytics Simulation)
- **관련 요구사항 ID:** R-05.6-01, R-05.6-02
- **선행 카드:** CARD-07B
- **생성·수정할 파일:**
  - `src/components/spreadsheet/PivotTableView.tsx` (피벗 테이블 인터페이스)
  - `src/content/exercises/level6/` (피벗, 고급필터, 목표값찾기 9개 모듈)
- **완료 조건:** 피벗 요약 계산 및 시뮬레이션 인터페이스 검증 통과.

---

#### CARD-07D: Level 7 고급 업무 활용 및 자동화 개념 (Level 7 Advanced Concepts)
- **관련 요구사항 ID:** R-05.7-01, R-05.7-02
- **선행 카드:** CARD-07C
- **생성·수정할 파일:**
  - `src/content/exercises/level7/` (동적배열, 시트참조, VBA/GAS/PowerQuery 기초 10개 모듈)
- **완료 조건:** 브라우저 시뮬레이션과 실제 프로그램 환경 안내 분리 검증 통과.

---

#### CARD-07E: Level 8 기업 실무 캡스톤 프로젝트 11종 (Level 8 Capstone Projects)
- **관련 요구사항 ID:** R-05.8-01, R-05.8-02
- **선행 카드:** CARD-07D
- **생성·수정할 파일:**
  - `src/content/projects/` (PRJ-01~11 종합 비즈니스 과제 데이터셋 및 채점 기준표)
- **완료 조건:** 11종 실무 프로젝트 검증 스크립트 통과.

---

#### CARD-07F: Level 9 컴퓨터활용능력 자격증 시험 모드 (Level 9 Korcham Certification)
- **관련 요구사항 ID:** R-05.9-01, R-05.9-02, R-05.9-03, R-05.9-04, R-05.9-05, S-04
- **선행 카드:** CARD-07E
- **생성·수정할 파일:**
  - `src/features/certification/ExamRunner.tsx` (40분/45분 타이머, 실기 전용 모드)
  - `src/content/certification/korcham2024.ts` (MS Office 2021 LTSC 기준)
  - `src/content/certification/korcham2027.ts` (Windows 11 / AI 개념 반영)
- **완료 조건:** 자격증 모의시험 타이머, 제출 후 채점, 정답 은닉 파이프라인 검증 통과.

---

#### CARD-07G: Level 10 고난도 챔피언십 챌린지 (Level 10 Championship)
- **관련 요구사항 ID:** R-05.10-01, R-05.10-02, R-05.10-03, R-05.10-04, R-17.7-01
- **선행 카드:** CARD-07F
- **생성·수정할 파일:**
  - `src/content/exercises/level10/` (수식 오류 디버깅, 코드 골프 등 7종)
- **완료 조건:** Phase 7 완료 조건 충족: 확장된 모든 기능이 테스트를 통과하고 구현된 범위만 정확히 완료 표시된다.

---

#### CARD-07H: 격리된 XLSX Web Worker 파이프라인 (Secure XLSX Worker Pipeline)
- **관련 요구사항 ID:** R-04.5-01, R-04.53, S-09, ADR-003
- **선행 카드:** Phase 2 완료 후 독립 병행 가능
- **생성·수정할 파일:**
  - `src/workers/xlsx.worker.ts` (`Object.freeze`, 5초 타임아웃, 5MB 상한, 매크로 제거)
  - `src/services/spreadsheet/xlsxService.ts`
  - `src/components/sandbox/XlsxTransferModal.tsx` (R-04.53: 연습실 XLSX 가져오기·내보내기 모달과 지원 기능·제한 안내. Phase 2에서 연기됨, MASTER_PROMPT 17장 Phase 7)
  - `tests/unit/xlsx/xlsx-security.test.ts` (악성 Zip bomb 샘플 방어 테스트)
- **구현 지침 및 금지 사항:**
  - `npm install xlsx` 표준 레지스트리 설치 금지 (ADR-003). 공식 CDN tarball 고정.
- **완료 조건:**
  - 비정상 파일 업로드 시 메인 스레드 프리징 없이 안전하게 거부되고 정상 파일만 로드된다.
  - 연습실에서 정상 XLSX를 가져오고 내보낼 수 있다(R-04.53).

---

### [Phase 8: 배포와 최종 검수]

#### CARD-08A: Netlify 프로덕션 빌드 및 배포 구성 (Netlify Deployment)
- **관련 요구사항 ID:** R-14.0-01, R-14.0-02, R-14.0-04, S-07, P-02
- **선행 카드:** Phase 6 완료
- **생성·수정할 파일:**
  - `netlify.toml` (SPA 리디렉션 `/* /index.html 200`, 빌드 명령, 배포 디렉터리)
  - `public/_headers` (CSP 정책, HSTS, WASM `wasm-unsafe-eval` 허용)
  - `scripts/check-bundle-size.ts`
- **완료 조건:**
  - Netlify 배포 후 임의의 하위 경로(`/learn/L01`, `/sandbox`)에서 새로고침 시 200 OK로 정상 진입한다.
- **외부 사용자 조치:** Netlify 계정 연결 및 빌드 환경 변수 등록.

---

#### CARD-08B: 종합 성능, 접근성 및 E2E 브라우저 검증 (Audit & Browser Verification)
- **관련 요구사항 ID:** R-12.4-01, R-16.1-01, R-16.2-01, R-16.3-01, R-16.3-02, P-01
- **선행 카드:** CARD-08A
- **생성·수정할 파일:**
  - `tests/e2e/comprehensive-journey.spec.ts` (10대 E2E 핵심 시나리오)
  - `lighthouserc.js` (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1)
- **완료 조건:**
  - Playwright 10대 시나리오 100% 통과, Lighthouse 성능 지표 90점 이상 달성.
- **실행할 검증 명령:**
  ```powershell
  npx playwright test
  npm run test:all
  ```
- **외부 사용자 조치:** 없음.

---

#### CARD-08C: 최종 완성 점검 및 릴리즈 보고서 (Final Release & Checklist)
- **관련 요구사항 ID:** R-17.8-01, R-19.0-01, R-19.0-02
- **선행 카드:** CARD-08B
- **생성·수정할 파일:**
  - `docs/RELEASE_REPORT.md` (제19장 9대 필수 항목 포함)
  - `docs/FINAL_CHECKLIST.md` (16대 완성 기준 점검표)
- **완료 조건:**
  - 16대 최종 완성 기준이 100% 충족되었음을 증명하고 배포 URL을 포함한 최종 보고서가 완성된다.
- **외부 사용자 조치:** 서비스 최종 인수 확인.

---

## 3. Claude Code에게 첫 번째로 넘길 작업 카드 (First Actionable Card)

### 카드 식별자: **`CARD-01A`**
### 제목: **프로젝트 초기화 및 도구 체계 구축 (Project Tooling & Scaffolding)**

- **즉시 실행 지침:**
  Claude Code는 아래 절차에 따라 작업을 시작하라:
  1. 루트 디렉터리의 `.nvmrc`를 생성하고 Node LTS (`24`)를 고정한다.
  2. Vite를 사용하여 TypeScript 기반 React 프로젝트를 초기화한다 (`package.json`의 `name`은 반드시 `excel-practice`로 설정).
  3. `tailwind.config.js`, `postcss.config.js`, `tsconfig.json` (strict 모드), `.eslintrc.cjs` (금지 규칙 3종 포함)를 설정한다.
  4. Vitest, React Testing Library, Playwright, Zod 의존성을 설치한다.
  5. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` 스크립트를 구성하고 0개의 에러로 통과시킴을 확인한다.
  6. 완료 후 G-02 양식에 맞추어 보고하라.

