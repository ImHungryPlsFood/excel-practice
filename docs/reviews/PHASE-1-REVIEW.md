# Phase 1 교차 검수 보고서 (PHASE-1-REVIEW)

- **검수 범위:** `plan-v1` 태그 → `phase-1` 태그 사이 커밋 (CARD-01A ~ CARD-01C)
- **검수 기준 문서:** `docs/MASTER_PROMPT.md`, `docs/REQUIREMENTS_TRACE.md`, `docs/CLAUDE_CODE_HANDOFF.md`, `docs/THREAT_MODEL.md`, `docs/TEST_STRATEGY.md`
- **검수일:** 2026-10-22
- **검수자 역할:** 수석 설계자 (Antigravity) — 코드 무수정, 문서만 작성

---

## 요약 대시보드

| 심각도 | 건수 | 항목 |
|:---|:---:|:---|
| 🔴 **CRITICAL** | 1 | 추적표 완료 표시이나 실제 미구현 (R-03.03 Motion 라이브러리) |
| 🟠 **HIGH** | 3 | 기능 없는 네비게이션 링크(사이드바), 포커스 표시 일부 누락, ARIA label 불완전 |
| 🟡 **MEDIUM** | 4 | 부분 완료 항목의 과장 표시, reduced-motion 미적용 컴포넌트, favicon 404, 테스트 범위 공백 |
| 🟢 **LOW / INFO** | 3 | 안내 문구 개선 여지, ErrorBoundary 오류 메시지 한글 깨짐(터미널 인코딩), 테스트 하드코딩 값 설명 부족 |
| **합계** | **11** | |

---

## [CRITICAL] C-01 · R-03.03 Motion 라이브러리 — 추적표 '계획됨' 상태 불일치

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-03.03 |
| **추적표 상태** | `계획됨` |
| **실제 코드** | `package.json`에 Motion for React(`motion`) 미설치, `src/styles/tokens.css`의 `--motion-duration-*` 토큰만 존재 |
| **심각도** | 🟡 MEDIUM (추적표 상태는 정확히 `계획됨`이므로 불일치는 아님) |

> [!NOTE]
> 재검토 결과: 추적표는 정확히 `계획됨` 상태로 표시되어 있어 허위 표시가 아님. CARD-03D에서 설치 예정임도 명시됨. **이 항목은 제거 — 실제 불일치 없음.**

---

## [CRITICAL] C-01 · 실제 CRITICAL 항목: 사이드바 "학습"·"샌드박스" 링크가 구현되지 않은 기능으로 연결

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-15.11 (`기능이 없는 버튼을 만들지 않는다`), R-15.12 (`화면만 구현하고 실제 동작을 미루지 않는다`) |
| **파일** | [`src/components/layout/AppSidebar.tsx`](file:///c:/dev/Excel%20Practice/src/components/layout/AppSidebar.tsx) |
| **내용** | 사이드바에 `학습 (/learn/level-0)`, `샌드박스 (/sandbox)` NavLink가 노출되어 있으나, 두 경로 모두 `NotImplementedPage` ("이 화면은 아직 구현되지 않았습니다")로 연결됨. 사용자는 클릭 가능한 메뉴를 보고 동작을 기대하지만 미구현 화면만 보게 됨 |
| **심각도** | 🔴 **CRITICAL** — G-01 규칙 4항 "가짜 버튼 완료 보고 금지" 위반 |
| **Claude Code 수정 지시문** | `AppSidebar.tsx`에서 `/learn/level-0`, `/sandbox` 링크를 제거하거나, Phase 2 완료 전까지 비활성화(`aria-disabled`, `pointer-events-none`, 회색 처리)하고 툴팁으로 "아직 준비 중입니다"를 표시하라. 단순 삭제가 가장 안전하며, 대시보드에 이미 "이어서 학습하기" 액션 카드가 있으므로 기능적 퇴행은 없다. |

---

## [HIGH] H-01 · `<a>` 외부 링크에 `aria-label` 또는 보조 텍스트 미보완

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-12.35 (적절한 ARIA 레이블) |
| **파일** | [`src/pages/LandingPage.tsx`](file:///c:/dev/Excel%20Practice/src/pages/LandingPage.tsx) L174–L190 |
| **내용** | 푸터의 GPL/GitHub 링크는 `target="_blank" rel="noopener noreferrer"`를 올바르게 적용했으나, 스크린리더 사용자에게 "새 탭에서 열림"을 알리는 `(새 탭에서 열림)` 보조 텍스트 또는 `aria-label`이 없음. WCAG 2.1 SC 3.2.2 준수 관점에서 권고 사항 |
| **심각도** | 🟠 HIGH |
| **Claude Code 수정 지시문** | 외부 링크 `<a>` 요소에 `aria-label="소스 코드 저장소 (GitHub, 새 탭에서 열림)"` 또는 `<span className="sr-only"> (새 탭에서 열림)</span>`을 추가하라. |

---

## [HIGH] H-02 · `SpreadsheetPreviewMock` 셀 클릭 핸들러에 키보드 진입점 없음

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-07.20 (키보드와 마우스로 모두 사용), R-12.31 (키보드만으로 주요 기능 사용) |
| **파일** | [`src/components/landing/SpreadsheetPreviewMock.tsx`](file:///c:/dev/Excel%20Practice/src/components/landing/SpreadsheetPreviewMock.tsx) L199–L215 |
| **내용** | 개별 `<td>` 셀에 `onClick`만 있고 `onKeyDown`/`role="gridcell"`/`tabIndex`는 상위 `<table>`에만 있음. 테이블 자체에 `aria-activedescendant`가 올바르게 구현되어 화살표 키로 이동 가능하지만, 개별 `gridcell`에 `tabIndex="-1"`이 없어서 보조기술이 포커스 이동을 추적하기 어려울 수 있음. 단, 랜딩 소개용 미리보기이므로 Phase 1 맥락에서 완전한 구현을 기대하기 어려움 |
| **심각도** | 🟠 HIGH |
| **Claude Code 수정 지시문** | `<td role="gridcell">` 요소에 `tabIndex={-1}`을 추가하여 `aria-activedescendant` 방식과 보조기술 호환성을 높여라. 실제 그리드는 CARD-02A에서 완전 구현하므로, 랜딩 미리보기는 최소 수정으로 대응해도 무방하다. |

---

## [HIGH] H-03 · `ProgressSummary` 진행 바 색상만으로 상태 구분

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-12.33 (색상만으로 정답과 오답을 구분하지 않는다) |
| **파일** | [`src/features/dashboard/components/ProgressSummary.tsx`](file:///c:/dev/Excel%20Practice/src/features/dashboard/components/ProgressSummary.tsx) L38–L40, [`src/features/dashboard/components/DailyGoalWidget.tsx`](file:///c:/dev/Excel%20Practice/src/features/dashboard/components/DailyGoalWidget.tsx) L30 |
| **내용** | `progressbar`의 내부 `<div>`가 `bg-brand` (파란색) 단색으로만 진행률을 표시. `aria-valuenow`와 텍스트 퍼센트는 있으나, 색맹 사용자를 위한 패턴 또는 아이콘 없음. Phase 1에서 완전한 접근성 감사는 Phase 8(CARD-08B) 예정이지만 기초 구조 단계에서 지적할 가치 있음 |
| **심각도** | 🟠 HIGH |
| **Claude Code 수정 지시문** | `progressbar` div에 `aria-label`을 직접 붙이고, 달성 여부를 텍스트로도 명확히 제공하라 (이미 `DailyGoalWidget`에는 "오늘의 목표를 달성했습니다" 텍스트가 있음 — 이 패턴을 `ProgressSummary`에도 일관되게 적용). |

---

## [MEDIUM] M-01 · `@media (prefers-reduced-motion)` 적용 범위 — 인라인 `style` 애니메이션

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-12.36 (애니메이션 감소 설정을 존중한다), P-03 |
| **파일** | [`src/features/dashboard/components/ProgressSummary.tsx`](file:///c:/dev/Excel%20Practice/src/features/dashboard/components/ProgressSummary.tsx) L39, [`src/features/dashboard/components/DailyGoalWidget.tsx`](file:///c:/dev/Excel%20Practice/src/features/dashboard/components/DailyGoalWidget.tsx) L30 |
| **내용** | 진행 바 `<div style={{ width: '${percent}%' }}`가 CSS `transition`이 붙은 상태에서 렌더될 경우 모션 감소 설정을 무시할 수 있음. 현재 토큰 CSS에 `@media (prefers-reduced-motion: reduce) { --motion-duration-*: 0.001ms }` 블록이 있고 `tokens.test.ts`로 검증하지만, `tokens.css`의 Tailwind `transition-colors` 유틸리티를 인라인 `width` 전환에 적용할 경우 별도 `transition-width` 클래스가 추가되면 reduced motion이 차단됨. 현재는 인라인 스타일에 `transition` 없어 직접 문제가 없으나, 미래 확장 시 위험 |
| **심각도** | 🟡 MEDIUM |
| **Claude Code 수정 지시문** | 진행 바 `<div>`에 향후 `transition` 속성을 추가할 경우 반드시 `duration-(--motion-duration-fast)` 토큰을 사용하고, `prefers-reduced-motion`이 토큰을 0으로 만드는 방식으로 자동 처리되는지 확인하라. 현재 코드는 안전하므로 즉시 수정 불필요. |

---

## [MEDIUM] M-02 · 추적표 '완료됨' 표시 항목 중 테스트 근거 약한 항목

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-04.03 (실제 스프레드시트가 보이는 미리보기) |
| **추적표 상태** | `완료됨` |
| **근거** | `LandingPage.test.tsx`의 테스트 3번이 `grid` role과 columnheader를 확인하지만, "실제 스프레드시트처럼 보이는가"는 시각적 검증이 필요한 요구사항 |
| **실제 코드** | `SpreadsheetPreviewMock`은 정적 데이터 기반의 인터랙티브 미리보기로, 수식 엔진 없이 계산값을 직접 내장함 |
| **심각도** | 🟡 MEDIUM — 기능 자체는 충실하지만 "실제 스프레드시트"와 목업의 차이를 사용자에게 명확히 안내하는가의 문제 |
| **Claude Code 수정 지시문** | `SpreadsheetPreviewMock` figcaption의 "미리보기" 안내 문구(현재: "셀을 클릭하거나 방향키로 이동해 수식을 확인해 보세요. 학습 화면에서는 직접 수식을 입력하고 채점받습니다.")는 충분히 적절함. 추가 조치 불필요. |

---

## [MEDIUM] M-03 · `favicon.ico` 404 — 알려진 미해결 한계

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | 해당 없음 (비기능 품질) |
| **파일** | `public/` 디렉터리 |
| **내용** | CARD-01B와 CARD-01C 완료 보고에서 "favicon.ico 없음 (브라우저 자동 요청 404 1건)"으로 명시됨. 브라우저 콘솔 오류 발생 |
| **심각도** | 🟡 MEDIUM |
| **Claude Code 수정 지시문** | `public/favicon.ico` 또는 `public/favicon.svg`를 생성하라. `Logo.tsx`의 SVG를 기반으로 32×32 단색 버전을 사용해도 된다. `index.html`에 `<link rel="icon" ...>` 태그를 추가하라. |

---

## [MEDIUM] M-04 · `DashboardPage.test.tsx` 하드코딩 기대값 설명 필요

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | G-01 (정답 및 기대값 하드코딩 금지) |
| **파일** | [`tests/unit/pages/DashboardPage.test.tsx`](file:///c:/dev/Excel%20Practice/tests/unit/pages/DashboardPage.test.tsx) L32, L57 |
| **내용** | 테스트에서 `'Level 0 · 완전한 입문 (시작 전)'`, `'0/1'` 등의 값이 하드코딩되어 있음. 이 값들은 `emptyDashboard.ts`의 초기값에서 파생된 것으로, 채점기 내부의 하드코딩이 아니라 정상적인 기대값 검증임. G-01의 금지 대상은 수식 채점기 내부의 특정 ID 감지 조건부 반환이므로, 이 테스트는 규칙 위반이 아님 |
| **심각도** | 🟢 LOW — 규칙 위반 아님, 주석 보완 권고 |
| **Claude Code 수정 지시문** | `DashboardPage.test.tsx`의 하드코딩 기대값 옆에 `// emptyDashboard.ts 초기값 기준` 주석을 추가하여 G-01 위반이 아님을 명확히 하라. |

---

## [LOW] L-01 · `ErrorBoundary` 오류 메시지 한글 인코딩 (터미널 표시 이슈)

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-15.07 (오류 처리 방식을 통일한다) |
| **파일** | [`tests/unit/components/ErrorBoundary.test.tsx`](file:///c:/dev/Excel%20Practice/tests/unit/components/ErrorBoundary.test.tsx) L9 |
| **내용** | `throw new Error('오류')` 에서 Windows 터미널의 CP949 인코딩으로 인해 콘솔 출력 시 한글이 깨짐("Error: ??"). 테스트 자체는 통과(exit code 0)하며 기능 동작에는 영향 없음 |
| **심각도** | 🟢 LOW |
| **Claude Code 수정 지시문** | `ErrorBoundary.test.tsx`의 테스트 오류 문자열을 ASCII로 변경(`throw new Error('crash')`)하거나, PowerShell에서 `$OutputEncoding = [System.Text.Encoding]::UTF8` 설정을 CI 스크립트에 추가하라. |

---

## [LOW] L-02 · `LandingPage` 내부 앵커 링크 — 다른 경로에서 작동 안 함

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-04.05 (학습 과정 소개), R-04.06 (성장 경로) |
| **파일** | [`src/pages/LandingPage.tsx`](file:///c:/dev/Excel%20Practice/src/pages/LandingPage.tsx) L16–L20 |
| **내용** | `NAV_LINKS`의 `#course`, `#roadmap`, `#certification` 앵커 링크가 `<a href="#">` 형태이므로 `/dashboard` 같은 다른 경로에서는 동작하지 않음. 단, 이 링크들은 랜딩 페이지 전용 `SiteHeader` 안에만 있으므로 실제 문제 발생 시나리오는 없음 |
| **심각도** | 🟢 LOW |
| **Claude Code 수정 지시문** | 현재 구조에서 문제없음. `SiteHeader`가 `LandingPage` 외부로 이동할 경우 절대 경로로 변경 필요. |

---

## [LOW] L-03 · `AppHeader.tsx` 검토 — 콘텐츠 확인

| 항목 | 내용 |
|:---|:---|
| **요구사항 ID** | R-04.09 (이어서 학습하기) |
| **파일** | `src/components/layout/AppHeader.tsx` |
| **내용** | 직접 검토 결과 헤더는 앱 레이아웃용이며, 랜딩과 분리된 정상 구조임 |
| **심각도** | 🟢 INFO |

---

## 보안 검수 결과

### XSS 가능 지점
- **`dangerouslySetInnerHTML` 사용:** 없음 (ESLint `react/no-danger` 강제, 검색 결과 0건)
- **`eval()` / `new Function()` 사용:** 없음 (ESLint `no-eval`, `no-new-func` 강제)
- **사용자 입력의 직접 DOM 삽입:** Phase 1에서 사용자 입력 처리가 없으므로 해당 없음

### 비밀 값 노출
- `.env.example`이 존재하며 실제 비밀 값 없음 확인
- `.gitignore`에 `.env*` 패턴 포함 확인 (S-11 부분 완료)

### 결론: Phase 1 코드 범위에서 보안 문제 없음

---

## "하지 마라" 규칙 위반 검수 결과

| 규칙 | 검수 결과 |
|:---|:---|
| R-15.11 기능 없는 버튼 만들지 않기 | 🔴 **위반** — 사이드바의 미구현 경로 링크 (C-01 참조) |
| R-15.12 화면만 구현하고 실제 동작 미루기 | 🟠 **부분 위반** — `NotImplementedPage`는 미구현 명시로 의도적 처리이나, 사이드바에서 클릭 가능한 형태로 노출이 문제 |
| R-04.18 일직선 배치 금지 | ✅ 위반 없음 — 대시보드 2열 그리드 레이아웃 |
| R-12.10 과도한 게임 화면 금지 | ✅ 위반 없음 — 차분한 전문 디자인 |
| R-12.23 컴포넌트별 임의 색상 금지 | ✅ 위반 없음 — 토큰 CSS 100% 준수 (tokens.test.ts 통과) |

---

## 접근성 검수 결과

| 항목 | 상태 | 비고 |
|:---|:---:|:---|
| 포커스 가시성 (`focus-visible:outline-*`) | ✅ | 모든 버튼·링크에 적용됨 |
| 키보드 내비게이션 (Tab 순서) | ✅ | 헤더→본문→푸터 논리적 순서 |
| `aria-label` / `aria-labelledby` | 🟠 | 외부 링크 보조 텍스트 미흡 (H-01) |
| 색상 대비 | ✅ | 토큰 기반, 디자인 리뷰 필요 |
| `prefers-reduced-motion` | ✅ | `tokens.css`에서 토큰 수준 처리, `tokens.test.ts` 통과 |
| `progressbar` 역할 | ✅ | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` 모두 존재 |
| 스크린리더용 이름 상자·수식 입력줄 | ✅ | `<output aria-label="...">` 사용 |

---

## 테스트 편법 검수 결과

| 검수 항목 | 결과 |
|:---|:---|
| `test.skip` / `it.skip` 사용 | ✅ 없음 |
| `test.only` / `it.only` 사용 | ✅ 없음 |
| 기대값 의도적 약화 | ✅ 없음 — 요구사항에 맞는 구체적 단언 |
| 목업이 실제 로직 대체 | ✅ Phase 1 범위에서 적절한 수준 |
| `@ts-ignore` / `@ts-nocheck` | ✅ 없음 |
| 빈 `catch` 오류 은폐 | ✅ 없음 |

**모든 테스트 통과 확인 (exit code 0, 단위 테스트 전체 통과)**

---

## 추적표 완료 상태 검증

### 완료됨으로 표시된 항목 중 코드 근거 확인

| 요구사항 ID | 추적표 상태 | 코드/테스트 근거 | 검수 결과 |
|:---|:---|:---|:---|
| R-03.01 React+TS+Vite | 완료됨 | `package.json`, 빌드 통과 | ✅ |
| R-03.02 CSS 디자인 시스템 | 완료됨 | `tokens.css`, `tokens.test.ts` | ✅ |
| R-03.04 React Router | 완료됨 | `routes.tsx`, `routes.test.tsx`, `routing.spec.ts` | ✅ |
| R-03.11 Git | 완료됨 | 저장소 존재 | ✅ |
| R-04.01 서비스 이름·로고 | 완료됨 | `Logo.tsx`, `LandingPage.test.tsx` 1번 | ✅ |
| R-04.02 서비스 소개 | 완료됨 | `HeroSection.tsx`, 테스트 2번 | ✅ |
| R-04.03 스프레드시트 미리보기 | 완료됨 | `SpreadsheetPreviewMock.tsx`, 테스트 3번 | ✅ (목업이지만 의도적·명시적) |
| R-04.04 학습 시작 버튼 | 완료됨 | `/dashboard` 링크, 테스트 4번 | ✅ |
| R-04.05 학습 과정 소개 | 완료됨 | `CourseIntroSection`, 테스트 5번 | ✅ |
| R-04.06 성장 경로 | 완료됨 | `CurriculumRoadmap`, 테스트 6번 | ✅ |
| R-04.07 자격증·실무 안내 | 완료됨 | `CertificationSection`, 테스트 7번 | ✅ |
| R-04.09 이어서 학습하기 | 완료됨 | `NextActionCard`, `DashboardPage.test.tsx` | ✅ |
| R-04.17 다음 행동 명확히 | 완료됨 | 단일 행동 카드 최상단 배치, 테스트 확인 | ✅ |
| R-12.11~23 디자인 토큰 | 완료됨 | `tokens.css`, `tokens.test.ts` 전수 통과 | ✅ |
| R-15.02 TypeScript strict | 완료됨 | `tsconfig.json strict: true`, typecheck 통과 | ✅ |
| R-15.03 any 금지 | 완료됨 | ESLint `no-explicit-any: error` | ✅ |
| G-04 Windows·Node 24 | 완료됨 | `.nvmrc: 24`, `package.json engines` | ✅ |

### 부분 완료 항목 — 설명 적절성 확인

R-04.08~16 (학습 기록 연동 제외 대시보드 UI), R-01.05, R-12.01~10, R-12.26~30 모두 추적표에 "사용자 검수 필요" 또는 "CARD-06에서 완성" 사유가 명시되어 있음. **적절한 부분 완료 처리임.**

---

## Claude Code 최우선 수정 지시 목록

1. **[CRITICAL] `AppSidebar.tsx`** — 미구현 경로(`/learn/level-0`, `/sandbox`)를 비활성화하거나 사이드바에서 제거. Phase 2 완료 전 클릭 가능한 상태로 노출 금지.
2. **[HIGH] `LandingPage.tsx` 푸터 외부 링크** — `(새 탭에서 열림)` 보조 텍스트 또는 `aria-label` 추가.
3. **[HIGH] `SpreadsheetPreviewMock.tsx` gridcell** — `tabIndex={-1}` 추가.
4. **[MEDIUM] `public/favicon.ico`** — 아이콘 파일 생성으로 브라우저 콘솔 404 제거.
5. **[LOW] `ErrorBoundary.test.tsx`** — 테스트 오류 문자열 ASCII로 변경 (`'오류'` → `'crash'`).

