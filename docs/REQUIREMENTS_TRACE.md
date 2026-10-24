# CELLCRAFT 요구사항 추적표 (REQUIREMENTS_TRACE)

- **문서 버전:** 2.0.0 (전수 세분화 및 역방향 0건 검증 버전)
- **작성일자:** 2026-10-22
- **작성자:** 수석 소프트웨어 아키텍트 & 품질 검수자
- **원칙:** 원본 `docs/MASTER_PROMPT.md` 제1장부터 제20장까지의 **모든 글머리표 목록 항목**, **모든 '하지 마라' 규칙 문장**, **모든 완료 조건**에 개별 고유 ID를 부여하여 1행 1요구사항 원칙으로 전수 매핑함. 여러 항목을 한 행으로 묶는 것을 전면 배제함.

---

## 1. 원본 1장 ~ 20장 요구사항 전수 추적 매트릭스

| 요구사항 ID | 원문 요약 및 핵심 내용 | 유형 | 담당 Phase | 담당 작업 카드 | 검증 방법 | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01.01** | Duolingo에서 영감을 얻은 명확한 학습 경로, 목표, 진행도, 성취 시스템. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.02** | Chess.com의 퍼즐에서 영감을 얻은 문제 해결 중심 학습, 단계적 힌트, 난이도 조절, 오답 복습. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.03** | 실제 게임 튜토리얼에서 볼 수 있는 화면 강조, 자연스러운 말풍선, 단계별 안내, 부드러운 전환. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.04** | 실제 스프레드시트 프로그램에서 사용하는 셀, 행, 열, 수식 입력, 서식, 차트, 데이터 처리 등의 작업 환경. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.05** | 단, 기존 서비스의 화면, 로고, 캐릭터, 문구, 디자인을 그대로 복제하지 마라. 각 서비스의 장점을 분석하고 독자적인 브랜드와 UX를 설계하라. | 금지규칙 | Phase 1 | CARD-01B | 수동 확인 | 부분 완료 (독자 로고·문구로 구현, 사용자 수동 확인 필요) |
| **R-01.06** | **사용자가 설명을 읽는 것만으로 학습을 완료할 수 없어야 한다. 실제 스프레드시트에서 직접 작업하고, 그 작업이 올바른지 검증받아야 한다.** | 금지규칙 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.07** | 먼저 합계가 무엇인지 짧고 명확하게 설명한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.08** | 실제 스프레드시트와 비슷한 작업 화면을 보여 준다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.09** | 주변 UI를 자연스럽게 어둡게 만들고, 필요한 셀이나 수식 입력 영역을 강조한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.10** | 사용자가 직접 셀을 선택하고 수식을 입력하도록 한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.11** | Enter를 누르면 입력 내용을 검증한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.12** | 정답이면 자연스러운 시각적 피드백을 제공한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.13** | 오답이면 구체적인 오류를 설명하고 재도전하게 한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.14** | 사용자가 원할 때만 단계별 힌트를 제공한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.15** | 해결 후에는 왜 그 방법이 맞는지 짧게 설명한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-01.16** | 다음 문제에서는 같은 개념을 다른 실무 상황에 적용하게 한다. | 기능 | Phase 1~5 | 전체 공통 (CARD-01~05) | 통합 검증 | 계획됨 |
| **R-02.01** | 코드부터 무작정 작성하지 마라. | 금지규칙 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.02** | Duolingo: https://www.duolingo.com/ | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.03** | Duolingo 학습 방식: https://blog.duolingo.com/ | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.04** | Chess.com 퍼즐: https://www.chess.com/puzzles | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.05** | Chess.com 맞춤형 퍼즐: https://www.chess.com/puzzles/learning | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.06** | Microsoft Excel 지원: https://support.microsoft.com/excel | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.07** | Google Sheets 도움말: https://support.google.com/docs/ | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.08** | Intro.js: https://introjs.com/docs | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.09** | HyperFormula: https://hyperformula.handsontable.com/ | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.10** | Firebase: https://firebase.google.com/docs | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.11** | Netlify: https://docs.netlify.com/ | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.12** | 각 자료를 볼 때 단순히 색상만 참고하지 말고 다음을 분석하라. | 금지규칙 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.13** | 정보 구조와 화면 레이아웃 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.14** | 첫 사용자 온보딩 방식 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.15** | 튜토리얼의 단계 전환 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.16** | 성공 및 실패 피드백 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.17** | 애니메이션의 속도와 사용 목적 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.18** | 학습 진행률과 복습 구조 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.19** | 키보드 중심 상호작용 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.20** | 난이도와 사용자 실력의 관계 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.21** | 데스크톱 화면에서의 정보 밀도 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.22** | 장시간 사용 시의 피로도 | 비기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.23** | 접근할 수 없는 사이트나 영상이 있다면 조사한 척하지 말고, 확인 가능한 자료와 실제 구현 가능한 대안으로 진행하라. | 금지규칙 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.24** | 브라우저에서 동작하는 스프레드시트 UI를 어떻게 구현할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.25** | Excel과 유사한 수식 계산을 어떤 엔진으로 처리할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.26** | 여러 시트와 셀 참조를 어떻게 관리할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.27** | 수식과 셀의 실제 상태를 어떻게 채점할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.28** | XLSX 파일 가져오기와 내보내기를 어떻게 구현할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.29** | Firebase Authentication과 Firestore를 어떻게 연동할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.30** | Netlify 배포 환경에서 Firebase를 안전하게 사용하는 방법 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.31** | 각 라이브러리의 라이선스, 상업적 이용 제한, 버전 호환성 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-02.32** | 대규모 문제 데이터와 학습 진도를 어떻게 관리할지 | 기능 | Phase 0 | RESEARCH_NOTES / ADR | 문서 검수 | 계획됨 |
| **R-03.01** | Frontend: React + TypeScript + Vite | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 완료됨 |
| **R-03.02** | Styling: Tailwind CSS 또는 일관된 CSS 디자인 시스템 | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 완료됨 |
| **R-03.03** | Animation: Motion for React 또는 적합한 경량 애니메이션 도구 | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 완료됨 (CARD-03D: 라이브러리 없이 CSS keyframes·transition으로 충족 — `src/styles/motion.css`. Motion 미설치로 새 의존성·라이선스 감사 대상 없음) |
| **R-03.04** | Routing: React Router | 기능 | Phase 1 | CARD-01A, CARD-01C | 빌드 검증 / 단위 / E2E | 완료됨 (routes.tsx: /, /dashboard, /learn/:courseId, /sandbox, 404. routes.test.tsx·routing.spec.ts) |
| **R-03.05** | Server state: TanStack Query 또는 필요한 경우 Firebase SDK 중심의 간단한 구조 | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.06** | Spreadsheet engine: HyperFormula 또는 요구사항을 충족하는 대안 | 기능 | Phase 1 | CARD-02B | 빌드 검증 | 완료됨 (HyperFormula 3.5.0 GPLv3, FormulaEngineAdapter 뒤에서만 사용. formula-eval.test.ts·golden-excel.test.ts) |
| **R-03.07** | Spreadsheet UI: 적절한 오픈소스 스프레드시트 라이브러리 또는 자체 React 기반 그리드 | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 완료됨 (CARD-02A: 자체 React 그리드 + @tanstack/react-virtual 3.14.13 MIT, ADR-002) |
| **R-03.08** | Backend services: Firebase Authentication, Cloud Firestore | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.09** | Hosting: Netlify | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.10** | Testing: Vitest, React Testing Library, Playwright | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 부분 완료 (Vitest·RTL 실행 검증, Playwright는 설정만 — 첫 E2E는 CARD-03D) |
| **R-03.11** | Version control: Git | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 완료됨 |
| **R-03.12** | 라이브러리의 이름만 보고 Excel과 완벽히 호환된다고 가정하지 마라. | 금지규칙 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.13** | **비싼 상용 라이브러리를 별도 승인 없이 도입하지 말고, 라이선스가 불명확한 라이브러리를 핵심 구조에 의존시키지 마라.** | 금지규칙 | Phase 2 | CARD-02B / ADR-001 | 라이선스 검수 | 완료됨 (HyperFormula GPLv3 사용자 승인 ADR-001, npm run audit:licenses 위반 0건) |
| **R-03.14** | 실제 학습에 필요한 기능을 구현할 수 있는가? | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.15** | 무료 또는 허용 가능한 라이선스로 사용할 수 있는가? | 기능 | Phase 2 | CARD-02B / ADR-001 | 라이선스 검수 | 완료됨 (GPL-3.0-only, audit:licenses production 허용 목록 통과) |
| **R-03.16** | 프로젝트가 커져도 유지보수할 수 있는가? | 비기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.17** | 모바일 최적화보다 데스크톱 사용성에 집중할 수 있는가? | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.18** | Firebase와 Netlify에 안정적으로 배포할 수 있는가? | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-03.19** | 테스트하기 쉽고 확장 가능한가? | 기능 | Phase 1 | CARD-01A | 빌드 검증 | 계획됨 |
| **R-04.01** | 서비스 이름과 독자적인 로고 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (LandingPage.test.tsx로 렌더링 검증) |
| **R-04.02** | 한눈에 이해되는 서비스 소개 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (LandingPage.test.tsx로 렌더링 검증) |
| **R-04.03** | 실제 스프레드시트가 보이는 미리보기 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (LandingPage.test.tsx로 렌더링 검증) |
| **R-04.04** | 학습 시작 버튼 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (랜딩 → /dashboard 라우터 전환을 routes.test.tsx·routing.spec.ts로 검증) |
| **R-04.05** | 학습 과정 소개 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (LandingPage.test.tsx로 렌더링 검증) |
| **R-04.06** | 초급부터 고급까지의 성장 경로 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (LandingPage.test.tsx로 렌더링 검증) |
| **R-04.07** | 자격증과 실무 학습 안내 | 기능 | Phase 1 | CARD-01B | E2E / 수동 | 완료됨 (LandingPage.test.tsx로 렌더링 검증) |
| **R-04.08** | 현재 학습 단계 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.09** | 이어서 학습하기 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 완료됨 (최상단 카드 → /learn/level-0 링크. 학습 화면 자체는 이후 카드. DashboardPage.test.tsx·routing.spec.ts) |
| **R-04.10** | 오늘의 목표 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.11** | 전체 학습 진행률 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.12** | 최근 학습한 내용 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.13** | 복습이 필요한 개념 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.14** | 틀린 문제 다시 풀기 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.15** | 완료한 도전 과제 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.16** | 최근 성취와 기록 | 기능 | Phase 1 | CARD-01C | E2E / 통합 | 부분 완료 (대시보드 UI·기록 없음 상태·데이터 주입 렌더링 검증 완료. 실제 학습 기록 연동은 CARD-06) |
| **R-04.17** | 사용자가 어디서부터 시작해야 하는지 고민하지 않도록 명확한 다음 행동을 제시하라. | 금지규칙 | Phase 1 | CARD-01C | E2E / 통합 | 완료됨 (기록 없음 상태에서도 단일 다음 행동 카드 제시. DashboardPage.test.tsx) |
| **R-04.18** | 모든 내용을 무조건 일직선으로 배치하지 마라. | 금지규칙 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.19** | 스프레드시트 기초 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.20** | 셀과 데이터 입력 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.21** | 서식과 표 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.22** | 기본 수식 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.23** | 조건부 함수 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.24** | 데이터 정리 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.25** | 차트 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.26** | 데이터 분석 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.27** | 피벗 테이블 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.28** | 실무 자동화 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.29** | 컴퓨터활용능력 시험 대비 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.30** | 고급 문제 및 대회형 도전 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.31** | 잠김 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.32** | 학습 가능 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.33** | 학습 중 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.34** | 완료 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.35** | 복습 권장 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.36** | 마스터 | 기능 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.37** | 다만 사용자의 진행을 불필요하게 막지 마라. 진단 평가, 선택적 선행 학습, 자유 연습 모드를 제공하라. | 금지규칙 | Phase 5 | CARD-05A | E2E / 단위 | 계획됨 |
| **R-04.38** | 일반적인 강의 페이지처럼 만들지 마라. | 금지규칙 | Phase 2 | CARD-02C | E2E / 단위 | 완료됨 (LearningLayout: 스프레드시트 작업 공간이 중앙에서 남는 폭 전부를 차지. LearningLayout.test.tsx·formula-bar.spec.ts. 실제 학습 라우트 연결은 내용이 생기는 CARD-03A 이후, 현재는 개발 화면 /dev/workspace) |
| **R-04.39** | 상단: 현재 단원, 진행 단계, 나가기 | 기능 | Phase 2 | CARD-02C | E2E / 단위 | 완료됨 (상단 48px 슬롯. 단원·진행 단계 내용은 CARD-03A 이후 채움. 개발 화면에 나가기 링크. LearningLayout.test.tsx·formula-bar.spec.ts) |
| **R-04.40** | 왼쪽: 학습 설명 및 단계별 안내 | 기능 | Phase 2 | CARD-02C | E2E / 단위 | 부분 완료 (왼쪽 280px 안내 슬롯과 좁은 화면 배치까지. 학습 설명·단계별 안내 내용은 CARD-03A~03C) |
| **R-04.41** | 중앙: 실제 조작 가능한 스프레드시트 | 기능 | Phase 2 | CARD-02C | E2E / 단위 | 완료됨 (중앙에 수식 입력줄+그리드+수식 엔진이 연결된 Spreadsheet. FormulaBar.test.tsx·formula-bar.spec.ts) |
| **R-04.42** | 오른쪽: 문제 조건, 목표, 선택적 힌트 | 기능 | Phase 2 | CARD-02C | E2E / 단위 | 부분 완료 (오른쪽 320px 문제·힌트 슬롯까지. 문제 조건·목표·힌트 내용은 CARD-04A·04C) |
| **R-04.43** | 하단: 작업 상태, 실행 취소, 다시 시작, 필요에 따른 진행 버튼 | 기능 | Phase 2 | CARD-02C | E2E / 단위 | 부분 완료 (하단 40px 슬롯, 작업 상태 표시와 "다시 시작"(02C). 실행 취소·다시 실행 버튼과 "다시 시작"의 실행 취소(02D, formula-bar.spec.ts). 진행 버튼은 CARD-03A) |
| **R-04.44** | 불필요하게 패널을 많이 만들지 마라. 사용자가 실제 작업에 집중할 수 있도록 하라. | 금지규칙 | Phase 2 | CARD-02C | E2E / 단위 | 완료됨 (내용을 넘기지 않은 영역은 그리지 않음. LearningLayout.test.tsx·formula-bar.spec.ts) |
| **R-04.45** | 빈 스프레드시트 만들기 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (CARD-02D: 연습실 '빈 스프레드시트'. 저장 안 한 작업이 있으면 확인, 실행 취소 가능. SandboxPage.test.tsx·sandbox.spec.ts) |
| **R-04.46** | 샘플 데이터 불러오기 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (CARD-02D: 가상 샘플 3종(판매 내역·상품 재고·출석 기록)을 지금 시트로 불러오기, 실행 취소 가능. 개인정보 형식·실존 기업명 점검. sampleDatasets.test.ts·SandboxPage.test.tsx·sandbox.spec.ts) |
| **R-04.47** | 직접 셀 편집 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (구현 02A·02C, CARD-02D에서 연습실에 연결해 확인. SandboxPage.test.tsx·sandbox.spec.ts) |
| **R-04.48** | 수식 입력 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (구현 02B·02C, CARD-02D에서 연습실에 연결해 확인. SandboxPage.test.tsx·sandbox.spec.ts) |
| **R-04.49** | 여러 시트 사용 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (CARD-02D: SheetTabs 시트 추가·전환·이름 변경·삭제, 시트 간 참조와 이름 변경 시 수식 갱신. workbookModel.test.ts·SheetTabs.test.tsx·sandbox.spec.ts) |
| **R-04.50** | 서식 및 차트 작업 | 기능 | Phase 7 | CARD-07B | 통합 / 단위 | 연기됨 (MASTER_PROMPT 17장 Phase 7 '차트'. 서식·차트는 차트 엔진(07B)에 의존하므로 Phase 2 범위에서 제외) |
| **R-04.51** | 실행 취소와 다시 실행 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (CARD-02D: historyManager. 셀 값·수식·범위 지우기·시트 추가/삭제/이름 변경·샘플·통합 문서 교체 모두 실행 취소. Ctrl+Z/Y와 버튼. historyManager.test.ts(50회 왕복 속성)·sandbox.spec.ts) |
| **R-04.52** | 학습 파일 저장 | 기능 | Phase 2 | CARD-02D | 통합 / 단위 | 완료됨 (CARD-02D: 버전 필드가 있는 JSON으로 브라우저 저장(연습실 전용 키)과 파일 내려받기·올리기. 불러올 때 형식 검증. 새로고침 후 복원 E2E. sandboxFileStore.test.ts·sandbox.spec.ts. 내구성 저장(IndexedDB) 통합은 CARD-06B) |
| **R-04.53** | 지원하는 경우 XLSX 가져오기 및 내보내기 | 기능 | Phase 7 | CARD-07H | 통합 / 단위 | 연기됨 (MASTER_PROMPT 17장 Phase 7 'XLSX 파일 처리'. 격리 Worker 파이프라인(07H)이 선행되어야 안전함) |
| **R-05.01** | 스프레드시트란 무엇인가 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.02** | Excel과 Google Sheets의 기본적인 차이 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.03** | 통합 문서와 워크시트 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.04** | 행, 열, 셀, 셀 주소 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.05** | 셀 선택과 범위 선택 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.06** | 데이터 입력과 수정 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.07** | 복사, 붙여넣기, 삭제 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.08** | 자동 채우기의 기초 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.09** | 파일 저장과 관리 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.10** | 텍스트, 숫자, 날짜 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.11** | 숫자 표시 형식 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.12** | 글꼴, 크기, 굵게, 색상 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.13** | 정렬, 테두리, 채우기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.14** | 행 높이와 열 너비 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.15** | 셀 병합의 용도와 주의점 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.16** | 줄 바꿈 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.17** | 서식 복사 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.18** | 표의 가독성 개선 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.19** | 수식의 기본 구조 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.20** | 연산자와 계산 우선순위 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.21** | 셀 참조 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.22** | 상대 참조 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.23** | 절대 참조 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.24** | 혼합 참조 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.25** | 수식 복사와 자동 채우기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.26** | 괄호와 오류 이해 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.27** | 기본 산술 연산 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.28** | SUM | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.29** | AVERAGE | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.30** | MIN, MAX | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.31** | COUNT, COUNTA | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.32** | IF | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.33** | AND, OR | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.34** | SUMIF, SUMIFS | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.35** | COUNTIF, COUNTIFS | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.36** | ROUND 계열 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.37** | IFERROR | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.38** | LEFT, RIGHT, MID | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.39** | LEN, TRIM | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.40** | CONCAT 및 TEXTJOIN | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.41** | 날짜와 시간 함수 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.42** | XLOOKUP 및 대안 함수 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.43** | INDEX와 MATCH | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.44** | FILTER, SORT, UNIQUE 등 지원되는 동적 배열 함수 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.45** | 각 함수는 정의만 알려주지 마라. | 금지규칙 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.46** | 정렬 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.47** | 필터 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.48** | 중복 데이터 처리 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.49** | 텍스트 나누기 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.50** | 찾기와 바꾸기 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.51** | 데이터 유효성 검사 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.52** | 드롭다운 목록 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.53** | 조건부 서식 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.54** | 표 기능과 구조화된 참조 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.55** | 데이터 형식 통일 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장. 전제인 셀 기본 정렬은 CARD-02D에서 먼저 구현) |
| **R-05.56** | 빈 셀과 오류 데이터 처리 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.57** | 데이터 정제 및 품질 검사 | 기능 | Phase 7 | CARD-07A | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.58** | 적절한 차트 선택 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.59** | 막대형, 꺾은선형, 원형 차트 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.60** | 계열과 범례 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.61** | 축과 데이터 레이블 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.62** | 제목과 단위 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.63** | 차트 서식 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.64** | 여러 차트 비교 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.65** | 잘못된 시각화 사례 분석 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.66** | 업무용 대시보드 구성 | 기능 | Phase 7 | CARD-07B | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-05.67** | 피벗 테이블 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.68** | 피벗 차트 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.69** | 그룹화 및 요약 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.70** | 고급 필터 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.71** | 부분합 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.72** | 여러 데이터 원본 통합 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.73** | 가설 검증에 필요한 기초 분석 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.74** | What-if 분석 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.75** | 목표값 찾기 등 지원 가능한 분석 기능 | 기능 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.76** | UI 라이브러리에서 지원하지 않는 기능은 이미 구현된 것처럼 표시하지 마라. 실제 구현 범위와 학습용 시뮬레이션 범위를 명확하게 구분하라. | 금지규칙 | Phase 7 | CARD-07C | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.77** | 대규모 데이터 처리 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.78** | 복잡한 조건식 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.79** | 동적 배열 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.80** | 여러 시트 간 참조 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.81** | 재사용 가능한 보고서 | 문서화 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.82** | 데이터 정합성 검증 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.83** | 오류 추적 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.84** | 반복 업무의 자동화 개념 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.85** | Excel 매크로 및 VBA 기초 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.86** | Google Apps Script 기초 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.87** | Power Query의 개념과 데이터 변환 | 기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.88** | 유지보수하기 좋은 수식 작성 | 비기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.89** | 성능과 계산 효율성 | 비기능 | Phase 7 | CARD-07D | 단위 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.90** | 월별 매출 보고서 | 문서화 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.91** | 재고 관리표 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.92** | 직원 근무 기록 정리 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.93** | 예산과 지출 분석 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.94** | 고객 데이터 정제 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.95** | 주문 내역 검증 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.96** | 판매 실적 대시보드 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.97** | 오류가 섞인 데이터 복구 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.98** | 부서별 실적 비교 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.99** | 여러 시트의 데이터 통합 | 기능 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.100** | 잘못 작성된 보고서 개선 | 문서화 | Phase 7 | CARD-07E | E2E 테스트 | 연기됨 (Post-MVP 확장) |
| **R-05.101** | 출제 영역별 학습 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.102** | 자주 틀리는 유형 분석 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.103** | 제한 시간 연습 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.104** | 모의시험 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.105** | 단계별 풀이 해설 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.106** | 오답 유형별 복습 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.107** | 단축키 훈련 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.108** | 함수 및 데이터 처리 문제 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.109** | 실제 시험 환경과 다른 부분에 대한 안내 | 기능 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.110** | 시험 범위와 배점은 변경될 수 있으므로 임의로 고정하지 마라. | 금지규칙 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.111** | 저작권이 있는 기출문제나 해설을 무단으로 복제하지 마라. 공개적으로 재사용이 허용된 자료는 그 조건을 확인하고, 그렇지 않은 경우에는 출제 유형과 학습 목표를 참고해 독창적인 문제를 만들어라. | 금지규칙 | Phase 7 | CARD-07F | E2E / 단위 | 연기됨 (Post-MVP 확장) |
| **R-05.112** | 일반적인 기초 문제만 반복하지 마라. | 금지규칙 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.113** | 제한된 시간 안에 복잡한 데이터를 정리하기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.114** | 잘못된 수식의 원인 찾아내기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.115** | 가장 효율적인 함수 조합 선택하기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.116** | 여러 조건을 만족하는 보고서 만들기 | 문서화 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.117** | 오류가 숨어 있는 데이터 분석하기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.118** | 요구사항이 일부만 주어진 업무 문제 해결하기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.119** | 불필요한 수식과 계산 줄이기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.120** | 결과의 정확성과 가독성을 동시에 개선하기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.121** | 여러 해결 방법을 비교하고 장단점 설명하기 | 기능 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-05.122** | 공식적으로 확인되지 않은 대회 출제 경향을 사실처럼 주장하지 마라. | 금지규칙 | Phase 4 | CARD-04D | 단위 테스트 | 계획됨 |
| **R-06.01** | 고유 ID | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.02** | 학습 영역 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.03** | 난이도 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.04** | 선수 개념 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.05** | 학습 목표 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.06** | 짧은 개념 설명 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.07** | 실제 업무에서의 활용 사례 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.08** | 안내형 튜토리얼 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.09** | 독립 실습 문제 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.10** | 선택형 힌트 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.11** | 정답 검증 기준 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.12** | 오답별 피드백 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.13** | 풀이 해설 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.14** | 복습 간격 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.15** | 관련 단축키 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.16** | 지원되는 Excel 및 Google Sheets 환경 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.17** | 학습 완료 조건 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.18** | 모듈은 코드에 직접 하드코딩하지 말고, 별도의 타입 안전한 데이터 구조로 관리하라. | 금지규칙 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-06.19** | 문제 콘텐츠와 학습 엔진을 분리해야 새로운 문제를 추가할 때 핵심 UI를 수정할 필요가 없어야 한다. | 금지규칙 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-07.01** | 단순히 화면 위에 텍스트 상자를 띄우는 기능으로 끝내지 마라. | 금지규칙 | Phase 3 | CARD-03B | E2E 테스트 | 완료됨 (실제 셀 조작이 러너 판정을 통과해야만 단계가 넘어감. tutorial-actions.spec.ts, actionDetector.test.ts) |
| **R-07.02** | 설명 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `description`(03A). 03C: 말풍선 본문에 텍스트로만 표시, tutorial-spotlight.spec.ts) |
| **R-07.03** | 강조할 UI 요소 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `highlight`(03A). 03C: UI_ELEMENT는 data-testid 요소, FORMULA_BAR는 getFormulaBarRect로 강조. E2E에서 실행 취소 버튼 테두리 위치 확인) |
| **R-07.04** | 강조할 셀 또는 범위 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `highlight`(03A). 03C: CELL/RANGE를 셀 좌표 API로 강조, 가상 스크롤 밖 셀(L60) 자동 스크롤 후 위치 일치 E2E) |
| **R-07.05** | 사용자가 해야 할 행동 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 부분 완료 (스키마 `expectedAction` 8종, 러너 `judgeAction`, 그리드 조작 감지 `actionDetector.ts`·포인트 모드 범위 감지. CARD-03D: 이미 선택된 셀 재클릭 감지(`onCellPress`), 도구 모음·키 어느 쪽이든 실행 취소를 `workbook.onUndone`→`PRESS_KEY Ctrl+Z`로 한 번만 감지, E2E `tutorial-flow.spec.ts`. 남은 범위: 서식 변경(CHANGE_FORMAT)은 서식 UI가 생기는 카드에서 연결) |
| **R-07.06** | 허용되는 입력 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `allowedInput`, 러너 NOT_ALLOWED 판정, 입력 확정·단축키 차단, CARD-03D: 붙여넣기·잘라내기 이동·채우기 핸들·Ctrl+D/R을 반영 전에 같은 기준(`rangeAllowed`)으로 막고 `WRITE_RANGE` 틀린 시도로 기록. 근거: actionDetector.test.ts, tutorial-flow.spec.ts) |
| **R-07.07** | 완료 조건 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `expectedAction`, 러너 ACTION 일치 시에만 전이) |
| **R-07.08** | 실패 조건 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `failure`, 러너 실패 사유 8종·시도 횟수) |
| **R-07.09** | 힌트 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `hints`·러너 HINT(03A). 03C: 말풍선 "힌트 보기" 버튼으로 한 개씩 공개, 키보드 E2E) |
| **R-07.10** | 다음 단계로 이동하는 조건 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `next.mode`(auto/confirm), 러너 전이) |
| **R-07.11** | 이전 단계로 돌아가는 방법 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `back`, 러너 BACK) |
| **R-07.12** | 건너뛰기 가능 여부 | 기능 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (스키마 `canSkip`, 러너 SKIP(완료가 아닌 건너뜀으로 기록)) |
| **R-07.13** | 설명 창의 '다음' 버튼을 눌렀다는 이유만으로 작업이 완료되었다고 처리하지 마라. | 금지규칙 | Phase 3 | CARD-03A | 스키마 / FSM | 완료됨 (러너가 NEXT를 행동 완료 전에는 무시(tutorialRunner.test.ts), 화면에서 다음 버튼 비활성·단계 유지 E2E 확인. 03C: '다음'·이전·건너뛰기로 단계가 실제로 바뀐 뒤에만 그리드로 포커스 복귀, 클릭·Enter 모두 셀 재클릭 없이 Ctrl+Z가 동작함을 E2E 확인) |
| **R-07.14** | 배경을 부드럽게 어둡게 만든다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (SpotlightOverlay: SVG 반투명 배경 + mask. SpotlightOverlay.test.tsx, E2E) |
| **R-07.15** | 강조 대상은 원래의 가시성을 유지한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (대상 자리는 mask 구멍이라 덮개 없음. 구멍 안 점이 실제 셀에 닿는지 elementFromPoint E2E) |
| **R-07.16** | 강조 대상 주변에 명확한 시각적 경계를 표시한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (흰 바깥 링 + 브랜드색 2px 테두리. 셀·범위·UI 경계와 1px 안 일치 E2E) |
| **R-07.17** | 설명 말풍선은 대상과 연결한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (CalloutTooltip: 대상 쪽 화살표가 대상 중심을 가리킴. CalloutTooltip.test.tsx) |
| **R-07.18** | 화면 가장자리에서 말풍선이 잘리지 않도록 한다. | 금지규칙 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (calloutPlacement Flip 4방향 + 화면 안 고정 단위 테스트, 1280×720·1000×640·420×640 E2E) |
| **R-07.19** | 스크롤 또는 화면 크기 변경 시 위치를 다시 계산한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (useSpotlightPosition: capture scroll·resize·ResizeObserver·포인터/키 입력 후 rAF 재계산. 그리드 가로·세로 스크롤과 창 크기 변경 E2E) |
| **R-07.20** | 키보드와 마우스로 모두 사용할 수 있게 한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (마우스: 그리드 조작·말풍선 버튼. 키보드: 화살표로 단계 진행, F6 그리드↔말풍선, Tab·Enter로 버튼, Esc로 복귀. E2E) |
| **R-07.21** | 현재 단계와 전체 진행 상황을 표시한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (말풍선 "단계 n/N"·진행 막대, 왼쪽 패널 단계 목록(완료·건너뜀·진행 중·대기), 하단 진행 표시) |
| **R-07.22** | Esc 키의 동작은 단계 설정에 따라 명확하게 정의한다. | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (고정 규칙, 사용자 결정 2026-10-24: Esc는 어떤 단계에서도 단계를 넘기거나 건너뛰지 않는다. 말풍선 안 Esc는 그리드로 포커스만 이동, 그리드 안 Esc는 그리드 동작(편집 취소·복사 표시 해제). 스키마에 Esc 필드를 두지 않음. E2E) |
| **R-07.23** | 단계 시작 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 완료됨 (CARD-03D: 단계 시작 시 말풍선 내용 `.cc-enter`(opacity+translateY), 어두운 막 `.cc-fade-in`. 근거: tutorial-flow.spec.ts 계산된 스타일, motion.test.ts) |
| **R-07.24** | 강조 대상 변경 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 부분 완료 (CARD-03D: 테두리 링이 대상이 바뀔 때 새로 `.cc-fade-in`. 구멍 좌표는 레이아웃성이라 애니메이션하지 않음. 자동 검증은 motion.test.ts의 규칙 검사뿐이고 개별 시각 확인은 하지 않았다) |
| **R-07.25** | 말풍선 위치 변경 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 완료됨 (CARD-03C의 말풍선 transform·opacity transition을 유지하고 `--motion-duration-fast` 토큰 사용. 근거: CalloutTooltip.test.tsx) |
| **R-07.26** | 성공 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 부분 완료 (CARD-03D: 성공 문구 `.cc-fade-in` 적용. 개별 자동 검증·시각 확인은 하지 않았다) |
| **R-07.27** | 오류 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 부분 완료 (CARD-03D: 오류 문구 시도마다 `.cc-fade-in`, 흔들기 없음. 개별 자동 검증·시각 확인은 하지 않았다) |
| **R-07.28** | 힌트 공개 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 부분 완료 (CARD-03D: 새 힌트 항목 `.cc-fade-in`. 개별 자동 검증·시각 확인은 하지 않았다) |
| **R-07.29** | 다음 문제 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 부분 완료 (CARD-03D: 공용 `MotionWrapper` 제공. 다음 문제 화면은 Phase 4에서 생기므로 그때 적용) |
| **R-07.30** | 결과 화면 | 기능 | Phase 3 | CARD-03D | 수동 / 단위 | 부분 완료 (CARD-03D: 공용 `MotionWrapper` 제공. 결과 화면은 Phase 4에서 생기므로 그때 적용) |
| **R-07.31** | 사용자의 작업을 방해하는 애니메이션은 사용하지 마라. | 금지규칙 | Phase 3 | CARD-03D | 수동 / 단위 | 완료됨 (CARD-03D: motion.css는 transform·opacity만 움직이고 바운스·무한 반복 없음, 입력을 막지 않는 짧은 페이드. 근거: tests/unit/styles/motion.test.ts) |
| **R-08.01** | 셀 선택 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (클릭 선택. SpreadsheetGrid.test.tsx·spreadsheet-grid.spec.ts) |
| **R-08.02** | 범위 선택 | 기능 | Phase 2 | CARD-02A, CARD-02E | 단위 / E2E | 완료됨 (그리드 범위 선택은 CARD-02A: 드래그·Shift+클릭·Shift+화살표·Ctrl+A, 02E에서 행·열 머리글 전체 선택 추가. 수식 편집 중 범위 선택(포인트 모드)은 CARD-02E: 클릭·드래그·Shift+클릭·enter 모드 화살표, 다른 시트 탭 참조, 색 테두리, 한글 조합 중 비활성, 외부 구독 이벤트. pointMode.test.ts·point-mode.spec.ts) |
| **R-08.03** | 셀 편집 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (타이핑·F2·더블클릭 편집, Esc 취소, 한글 IME. CARD-02C에서 수식 입력줄과 편집 상태 공유. SpreadsheetGrid.test.tsx·FormulaBar.test.tsx·spreadsheet-grid.spec.ts·formula-bar.spec.ts) |
| **R-08.04** | Enter 및 Tab 이동 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (Enter/Shift+Enter, Tab/Shift+Tab. SpreadsheetGrid.test.tsx·spreadsheet-grid.spec.ts) |
| **R-08.05** | 화살표 키 이동 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (화살표·Home·Ctrl+Home·PageUp/Down. SpreadsheetGrid.test.tsx·spreadsheet-grid.spec.ts) |
| **R-08.06** | 행과 열의 기본 조작 | 기능 | Phase 2 | CARD-02E | 단위 / E2E | 완료됨 (행·열 삽입·삭제와 모든 시트 수식 참조 갱신·#REF!, 시트 끝 값 밀림 거부, 열 너비·행 높이 끌기·입력, 우클릭·Shift+F10 메뉴, 실행 취소. rowColumnOps.test.ts·referenceShift.test.ts(HyperFormula 교차 검증)·range-operations.spec.ts) |
| **R-08.07** | 복사 및 붙여넣기 | 기능 | Phase 2 | CARD-02E | 단위 / E2E | 완료됨 (Ctrl+C/X/V·메뉴, 앱 안 복사는 상대 참조 이동, 밖에서 온 TSV, 반복 붙여넣기, 잘라내기 시 다른 수식 참조 이동, 복사 점선·Esc, 실행 취소. clipboard.test.ts·range-operations.spec.ts) |
| **R-08.08** | 실행 취소 및 다시 실행 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (CARD-02D historyManager·workbookModel, Ctrl+Z/Y. historyManager.test.ts·SheetTabs.test.tsx·formula-bar.spec.ts) |
| **R-08.09** | 셀 내용 삭제 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (Delete 범위 삭제, Backspace 비우고 편집. SpreadsheetGrid.test.tsx·spreadsheet-grid.spec.ts) |
| **R-08.10** | 자동 채우기 | 기능 | Phase 2 | CARD-02E | 단위 / E2E | 완료됨 (채우기 핸들 4방향: 숫자 추세·날짜·끝 숫자 글자·요일·월 목록·수식 참조 이동, Ctrl+D·Ctrl+R, 실행 취소. Excel 세부 규칙 일부는 EXCEL_DIFFERENCES 확인 목록 14번. autoFill.test.ts·range-operations.spec.ts) |
| **R-08.11** | 수식 입력줄 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (CARD-02C FormulaBar: 이름 상자·fx 버튼·입력 상자·안내 줄, 셀 편집기와 편집 상태 공유. FormulaBar.test.tsx·formula-bar.spec.ts) |
| **R-08.12** | 여러 워크시트 | 기능 | Phase 2 | CARD-02A | 단위 / E2E | 완료됨 (CARD-02D SheetTabs·workbookModel. SheetTabs.test.tsx·workbookModel.test.ts·sandbox.spec.ts) |
| **R-08.13** | 저장 가능한 셀 상태 | 기능 | Phase 6 | CARD-06B | 단위 / E2E | 계획됨 (CARD-06B 셀 상태 직렬화와 offlineStorage 저장에서 구현. CARD-02A에서 재배정 2026-10-23) |
| **R-08.14** | 수식은 직접 문자열을 비교하는 방식만으로 채점하지 마라. | 금지규칙 | Phase 2 | CARD-02B | 단위 테스트 | 부분 완료 (엔진이 수식을 실제 계산해 값 제공. 문자열 비교 없는 채점기는 Phase 3~4) |
| **R-08.15** | 셀 간 참조 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (formula-eval.test.ts, 골든 References) |
| **R-08.16** | 범위 참조 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (formula-eval.test.ts, 골든 CoreFunctions·References) |
| **R-08.17** | 상대 참조와 절대 참조 | 기능 | Phase 2 | CARD-02B, CARD-02E | 단위 테스트 | 완료됨 ($A$1·A$1·$A1 계산: formula-eval.test.ts·골든 References(02B). 복사·채우기 시 상대 참조만 이동, 행·열 삽입·삭제 시 절대 참조도 이동: referenceShift.test.ts·autoFill.test.ts(02E)) |
| **R-08.18** | 여러 시트 간 참조 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (Data!B2, 따옴표 시트 이름, 시트 삭제 시 #REF!, 이름 변경 추적) |
| **R-08.19** | 수식 오류 처리 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (오류 코드 10종, 전파·IFERROR, 골든 ErrorValues. #NULL!은 EXCEL_DIFFERENCES D-3) |
| **R-08.20** | 의존 셀의 값 변경에 따른 재계산 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (자동 재계산·의존 셀 조회 getDependents, dependencyGraph.ts) |
| **R-08.21** | 지원 함수 목록 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (supportedFunctions.ts, 엔진 등록 여부를 테스트로 대조) |
| **R-08.22** | 계산 결과 표시 | 기능 | Phase 2 | CARD-02B, CARD-02C, CARD-02D | 단위 테스트 | 완료됨 (CellResult.displayValue 생성(02B), 셀 표시·오류 코드·안내 문장(02C), 값 종류에 따른 기본 정렬(02D: 숫자·날짜 오른쪽, 문자·문자로 저장된 숫자 왼쪽, 논리값·오류 가운데, 결과 종류로 판정). FormulaBar.test.tsx·cellAlignment.test.tsx·formula-bar.spec.ts) |
| **R-08.23** | 함수별 오류 메시지 | 기능 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (errorMessages.ts 코드별·함수별 한국어 안내) |
| **R-08.24** | 브라우저에서 사용자가 입력한 수식을 `eval()`로 실행하지 마라. | 금지규칙 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (eval·Function 미사용, ESLint no-eval·no-new-func) |
| **R-08.25** | 지원하지 않는 함수나 기능은 명확하게 알리고, 임의의 결과를 반환하지 마라. | 금지규칙 | Phase 2 | CARD-02B | 단위 테스트 | 완료됨 (미지원 함수 #NAME?+함수 이름, 대체 안내, 교집합 연산자 미지원 안내) |
| **R-08.26** | 완벽한 Excel 호환성을 주장하지 않는다. | 금지규칙 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 부분 완료 (EXCEL_DIFFERENCES.md에 엔진 범위 차이 기록. 사용자 화면 안내는 이후 카드) |
| **R-08.27** | 구현된 기능과 지원되지 않는 기능을 문서화한다. | 문서화 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 부분 완료 (수식 엔진 범위만 기록. XLSX·서식은 해당 카드) |
| **R-08.28** | Excel 전용 기능과 Google Sheets 전용 기능을 구분한다. | 기능 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 계획됨 |
| **R-08.29** | 함수 이름, 지역 설정, 날짜 처리, 오류 표시 등의 차이를 테스트한다. | 기능 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 부분 완료 (함수 이름·날짜·오류 표시 차이를 골든 테스트로 대조. 지역 설정 서식은 Phase 7) |
| **R-08.30** | XLSX 가져오기 및 내보내기가 지원하는 기능과 제한을 안내한다. | 기능 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 계획됨 |
| **R-08.31** | 자격증 시험의 실제 프로그램과 차이가 있는 경우 사용자에게 명확하게 알린다. | 기능 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 계획됨 |
| **R-08.32** | 실제 Excel과 동일한 조작을 제공할 수 없는 기능은 기능을 흉내 내기만 하지 말고, 해당 기능을 가르칠 수 있는 대체 실습이나 외부 프로그램에서의 실습 안내를 제공하라. | 금지규칙 | Phase 2 | EXCEL_DIFFERENCES.md | 문서 / 단위 | 계획됨 |
| **R-09.01** | 문제 ID | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.02** | 난이도 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.03** | 목표 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.04** | 시작 데이터 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.05** | 초기 시트 상태 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.06** | 허용된 작업 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.07** | 기대 결과 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.08** | 채점 규칙 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.09** | 힌트 단계 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.10** | 오답별 피드백 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.11** | 풀이 설명 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.12** | 권장 해결 방법 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.13** | 대체 해결 방법 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.14** | 점수 규칙 | 기능 | Phase 4 | CARD-04A | 스키마 검증 | 완료됨 |
| **R-09.15** | 정확한 수식과 결과를 사용한 경우 | 기능 | Phase 4 | CARD-04B | 단위 테스트 | 계획됨 |
| **R-09.16** | 다른 수식으로 같은 결과를 얻은 경우 | 기능 | Phase 4 | CARD-04B | 단위 테스트 | 계획됨 |
| **R-09.17** | 숫자를 직접 입력해 우연히 같은 결과를 얻은 경우 | 기능 | Phase 4 | CARD-04B | 단위 테스트 | 계획됨 |
| **R-09.18** | 수식이 올바르지만 범위가 잘못된 경우 | 기능 | Phase 4 | CARD-04B | 단위 테스트 | 계획됨 |
| **R-09.19** | 결과가 현재 데이터에서는 맞지만 데이터가 바뀌면 틀리는 경우 | 기능 | Phase 4 | CARD-04B | 단위 테스트 | 계획됨 |
| **R-09.20** | 사용자가 잘못된 행동을 했다고 해서 무조건 전체 문제를 초기화하지 마라. | 금지규칙 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.21** | 단순한 입력 오류는 수정할 기회를 준다. | 기능 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.22** | 되돌릴 수 있는 작업은 Undo를 활용한다. | 기능 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.23** | 현재 단계에서 잘못된 행동은 구체적인 이유를 설명한다. | 기능 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.24** | 큰 오류가 발생하면 현재 단계 또는 마지막 안전 상태로 돌아갈 수 있게 한다. | 기능 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.25** | 사용자가 원하지 않는 한 작성한 데이터를 무조건 삭제하지 않는다. | 금지규칙 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.26** | 문제를 다시 시작할 수 있게 한다. | 기능 | Phase 4 | CARD-04B | E2E 테스트 | 계획됨 |
| **R-09.27** | 첫 번째 힌트: 문제를 해결하는 데 필요한 개념. | 기능 | Phase 4 | CARD-04C | E2E / 단위 | 계획됨 |
| **R-09.28** | 두 번째 힌트: 어떤 범위 또는 기능을 사용해야 하는지. | 기능 | Phase 4 | CARD-04C | E2E / 단위 | 계획됨 |
| **R-09.29** | 세 번째 힌트: 수식의 구조나 작업 순서. | 기능 | Phase 4 | CARD-04C | E2E / 단위 | 계획됨 |
| **R-09.30** | 마지막 도움: 완전한 풀이와 이유. | 기능 | Phase 4 | CARD-04C | E2E / 단위 | 계획됨 |
| **R-09.31** | 힌트를 열었다고 바로 문제를 끝내지 마라. | 금지규칙 | Phase 4 | CARD-04C | E2E / 단위 | 계획됨 |
| **R-09.32** | 힌트 사용 횟수는 기록할 수 있지만, 학습을 지나치게 처벌하지 마라. | 금지규칙 | Phase 4 | CARD-04C | E2E / 단위 | 계획됨 |
| **R-09.33** | 같은 숫자와 같은 셀 주소만 바꾼 문제를 반복하지 마라. | 금지규칙 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.34** | 데이터의 크기 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.35** | 데이터의 형태 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.36** | 조건의 개수 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.37** | 오류의 종류 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.38** | 사용해야 하는 개념 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.39** | 실무 상황 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.40** | 시간 제한 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.41** | 허용되는 해결 방법 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.42** | 데이터 품질 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.43** | 요구사항의 복잡성 | 기능 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-09.44** | 문제의 난이도는 단순히 수식이 길다는 이유만으로 높게 설정하지 마라. | 금지규칙 | Phase 4 | CARD-04D | 콘텐츠 검수 | 계획됨 |
| **R-10.01** | 판매 내역 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.02** | 상품 재고 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.03** | 고객 목록 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.04** | 지출 기록 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.05** | 출석 기록 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.06** | 주문 데이터 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.07** | 부서별 실적 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.08** | 날짜별 활동 데이터 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.09** | 오류가 섞인 데이터 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.10** | 여러 시트로 나뉜 자료 | 기능 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.11** | 데이터는 단순하고 지나치게 규칙적이지 않도록 구성하라. | 금지규칙 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.12** | 단, 문제의 난이도에 맞지 않는 불필요한 혼란을 만들지 마라. | 금지규칙 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.13** | 개인정보나 실제 기업의 기밀 데이터를 사용하지 말고, 독창적인 가상 데이터를 사용하라. | 금지규칙 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-10.14** | 문제는 지속적으로 추가할 수 있어야 한다. 수백 개 이상의 문제를 목표로 확장할 수 있는 콘텐츠 구조를 마련하되, 검증되지 않은 문제를 숫자만 채우기 위해 생성하지 마라. | 금지규칙 | Phase 4 | CARD-04E | 데이터 검증 | 계획됨 |
| **R-11.01** | 개념 학습 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.02** | 문제 해결 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.03** | 독립적으로 해결한 문제 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.04** | 복습 완료 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.05** | 프로젝트 완성 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.06** | 고난도 도전 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.07** | 첫 수식 완성 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.08** | 첫 차트 만들기 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.09** | 절대 참조 이해 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.10** | 10문제 연속 해결 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.11** | 오답 복습 완료 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.12** | 첫 실무 프로젝트 완료 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.13** | 힌트 없이 고난도 문제 해결 | 기능 | Phase 5 | CARD-05C | 단위 테스트 | 계획됨 |
| **R-11.14** | 너무 쉬운 문제만 반복하지 말고, 지나치게 어려운 문제로 사용자를 좌절시키지도 마라. | 금지규칙 | Phase 5 | CARD-05B | 단위 테스트 | 계획됨 |
| **R-11.15** | 한 번 맞힌 문제를 영구적으로 완료 처리하지 마라. | 금지규칙 | Phase 5 | CARD-05B | 단위 테스트 | 계획됨 |
| **R-12.01** | 깔끔함 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.02** | 차분함 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.03** | 명확한 정보 계층 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.04** | 정교한 간격 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.05** | 읽기 쉬운 타이포그래피 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.06** | 과도하지 않은 색상 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.07** | 부드러운 움직임 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.08** | 전문적인 업무 도구의 신뢰감 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.09** | 장시간 사용해도 피곤하지 않은 화면 | 기능 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.10** | 게임처럼 보이기 위해 모든 요소를 화려하게 만들지 마라. | 금지규칙 | Phase 1 | CARD-01B | 디자인 리뷰 | 부분 완료 (토큰 기반 구현·스크린샷 자체 점검, 사용자 디자인 리뷰 필요) |
| **R-12.11** | 색상 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.12** | 배경 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.13** | 텍스트 색상 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.14** | 경계선 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.15** | 그림자 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.16** | 여백 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.17** | 모서리 둥글기 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.18** | 폰트 크기 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.19** | 행 높이 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.20** | 애니메이션 시간 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.21** | 전환 곡선 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.22** | 상태별 강조 색상 | 기능 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.23** | 컴포넌트마다 임의의 색상과 간격을 반복해서 정의하지 마라. | 금지규칙 | Phase 1 | CARD-01A | CSS 토큰 검사 | 완료됨 (tokens.css + tokens.test.ts: 12개 범주 존재·컴포넌트 하드코딩 색상 0건) |
| **R-12.24** | 학습 UI는 그 위에서 작업을 안내하되, 그리드의 조작을 방해하지 않아야 한다. | 금지규칙 | Phase 2 | CARD-02A | E2E 테스트 | 계획됨 (학습 UI가 아직 없음. CARD-02A는 좌표·선택 API만 제공) |
| **R-12.25** | 표의 셀과 일반적인 카드 컴포넌트의 디자인을 혼합하지 마라. | 금지규칙 | Phase 2 | CARD-02A | E2E 테스트 | 완료됨 (셀은 그리드 토큰만 사용, 둥글기 0·그림자 없음을 spreadsheet-grid.spec.ts로 검증) |
| **R-12.26** | 모바일 앱을 우선적으로 개발하지 마라. | 금지규칙 | Phase 1 | CARD-01B | 반응형 검수 | 부분 완료 (1440px/390px 스크린샷 점검·가로 넘침 없음, 사용자 반응형 검수 필요) |
| **R-12.27** | 데스크톱과 노트북에서의 학습 경험 | 기능 | Phase 1 | CARD-01B | 반응형 검수 | 부분 완료 (1440px/390px 스크린샷 점검·가로 넘침 없음, 사용자 반응형 검수 필요) |
| **R-12.28** | 일반적인 데스크톱 브라우저에서의 안정성 | 기능 | Phase 1 | CARD-01B | 반응형 검수 | 부분 완료 (1440px/390px 스크린샷 점검·가로 넘침 없음, 사용자 반응형 검수 필요) |
| **R-12.29** | 작은 화면에서의 최소한의 접근성 | 비기능 | Phase 1 | CARD-01B | 반응형 검수 | 부분 완료 (1440px/390px 스크린샷 점검·가로 넘침 없음, 사용자 반응형 검수 필요) |
| **R-12.30** | 좁은 화면에서는 핵심 작업을 수행하기 어려운 기능을 무리하게 압축하지 마라. | 금지규칙 | Phase 1 | CARD-01B | 반응형 검수 | 부분 완료 (1440px/390px 스크린샷 점검·가로 넘침 없음, 사용자 반응형 검수 필요) |
| **R-12.31** | 키보드만으로 주요 기능을 사용할 수 있어야 한다. | 기능 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-12.32** | 포커스 상태를 명확하게 표시한다. | 기능 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-12.33** | 색상만으로 정답과 오답을 구분하지 않는다. | 금지규칙 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-12.34** | 충분한 대비를 제공한다. | 기능 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-12.35** | 적절한 ARIA 레이블을 사용한다. | 기능 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-12.36** | 애니메이션 감소 설정을 존중한다. | 기능 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-12.37** | 오류 메시지는 구체적이고 읽기 쉬워야 한다. | 기능 | Phase 8 | CARD-08B | 접근성 감사 | 계획됨 |
| **R-13.01** | 회원가입 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.02** | 로그인 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.03** | 로그아웃 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.04** | 비밀번호 재설정 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.05** | 사용자 프로필 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.06** | 학습 진도 불러오기 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.07** | 다른 기기에서의 진도 동기화 | 기능 | Phase 6 | CARD-06A | E2E 테스트 | 계획됨 |
| **R-13.08** | 사용자 프로필 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.09** | 학습 설정 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.10** | 단원 완료 상태 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.11** | 문제 풀이 기록 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.12** | 문제별 정답률 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.13** | 힌트 사용 내역 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.14** | 복습 일정 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.15** | 경험치와 업적 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.16** | 연속 학습 기록 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.17** | 사용자별 저장 문서 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.18** | 설정 및 선호도 | 기능 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-13.19** | 로그인한 사용자는 자신에게 허용된 데이터만 읽고 쓸 수 있어야 한다. | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.20** | 다른 사용자의 개인 데이터를 접근하거나 수정할 수 없어야 한다. | 금지규칙 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.21** | 사용자 ID를 클라이언트가 임의로 바꿔 다른 사용자의 데이터에 접근할 수 없어야 한다. | 금지규칙 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.22** | 경험치나 업적을 조작하기 쉬운 구조를 피한다. | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.23** | Firebase Admin SDK의 비밀 키를 프런트엔드에 포함하지 않는다. | 금지규칙 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.24** | API 키와 비밀 정보의 성격을 구분하고 필요한 제한을 적용한다. | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.25** | 필요한 경우 서버 측 검증을 사용한다. | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.26** | 실제 비밀 값은 환경 변수로 관리한다. | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.27** | Firestore 보안 규칙은 단순히 로그인 여부만 확인하는 방식으로 끝내지 마라. | 금지규칙 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **R-13.28** | 불필요하게 모든 문제 데이터를 매번 불러오지 마라. | 금지규칙 | Phase 6 | CARD-06B | 통합 테스트 | 계획됨 |
| **R-14.01** | 개발 환경 설정 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.02** | 프로덕션 빌드 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.03** | 환경 변수 설정 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.04** | SPA 라우팅 설정 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.05** | Firebase 연결 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.06** | HTTPS 환경에서의 동작 확인 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.07** | 배포 후 주요 페이지 테스트 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.08** | 브라우저 콘솔 오류 검사 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.09** | 새로고침 후 라우팅 확인 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.10** | 로그인 상태 유지 확인 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.11** | 학습 진도 저장 및 복원 확인 | 기능 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.12** | 환경 변수 예시는 `.env.example`에 제공하되 실제 비밀 값을 포함하지 마라. | 금지규칙 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.13** | `.env.local`이나 비밀 정보가 포함된 파일을 Git에 커밋하지 않도록 `.gitignore`를 확인하라. | 금지규칙 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-14.14** | 배포 과정에서 문제가 발생하면 실제 오류를 해결하라. 단순히 배포 방법만 설명하고 끝내지 마라. | 금지규칙 | Phase 8 | CARD-08A | 배포 URL 검증 | 계획됨 |
| **R-15.01** | 컴포넌트를 하나의 거대한 파일에 몰아넣지 마라. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.02** | TypeScript의 엄격한 타입 검사를 사용한다. | 기능 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 완료됨 (tsconfig strict 강제, 이후 카드 유지) |
| **R-15.03** | `any`를 남용하지 않는다. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 완료됨 (`no-explicit-any: error` 강제, 이후 카드 유지) |
| **R-15.04** | 중복 코드를 줄인다. | 기능 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.05** | 컴포넌트와 비즈니스 로직을 분리한다. | 기능 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.06** | 공통 상태 관리 전략을 정한다. | 기능 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.07** | 오류 처리 방식을 통일한다. | 기능 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.08** | 로딩, 빈 상태, 오류 상태를 구현한다. | 기능 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.09** | 개발 전용 코드를 프로덕션에 노출하지 않는다. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.10** | 사용하지 않는 의존성을 추가하지 않는다. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.11** | 기능이 없는 버튼을 만들지 않는다. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.12** | 화면만 구현하고 실제 동작을 미루지 않는다. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-15.13** | 프로젝트가 필요 이상으로 복잡해지지 않도록 단순한 구조를 우선하되, 스프레드시트 엔진과 채점 엔진은 확장할 수 있게 설계하라. | 금지규칙 | Phase 1~8 | 전체 공통 (CARD-01A) | typecheck / 린트 | 계획됨 |
| **R-16.01** | 실제로 동작하는지 검증하지 않은 기능을 완료했다고 보고하지 마라. | 금지규칙 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.02** | 수식 계산 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.03** | 셀 참조 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.04** | 채점 규칙 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.05** | 힌트 단계 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.06** | 튜토리얼 진행 조건 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.07** | 학습 완료 조건 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.08** | 경험치 계산 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.09** | 복습 일정 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.10** | 데이터 저장 및 복원 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.11** | 스프레드시트 입력과 수식 계산 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.12** | 실제 작업 결과와 문제 채점 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.13** | 문제 완료와 학습 진도 저장 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.14** | Firebase 로그인과 사용자 데이터 접근 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.15** | 튜토리얼과 셀 조작의 연결 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.16** | 오류 발생 후 재시도 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.17** | Undo와 다시 실행 | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.18** | 사용자가 첫 화면에서 학습을 시작할 수 있는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.19** | 첫 튜토리얼이 정상적으로 표시되는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.20** | 사용자가 셀을 선택하고 편집할 수 있는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.21** | 수식이 계산되는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.22** | 올바른 답이 채점되는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.23** | 잘못된 답에 적절한 피드백이 제공되는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.24** | 힌트가 요청했을 때만 공개되는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.25** | 문제를 완료한 뒤 다음 문제로 이동하는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.26** | 새로고침 후 진도가 유지되는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-16.27** | 브라우저 콘솔에 심각한 오류가 없는가? | 기능 | Phase 1~8 | 전체 공통 (Vitest/Playwright) | 자동화 테스트 | 계획됨 |
| **R-17.01** | 처음부터 모든 기능을 구현하려고 하지 마라. | 금지규칙 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.02** | 프로젝트 구조 확인 | 기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.03** | 기술 스택 확정 | 기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.04** | 디자인 토큰 | 비기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.05** | 공통 UI 컴포넌트 | 기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.06** | 라우팅 | 기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.07** | 랜딩 페이지 | 기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.08** | 대시보드 기본 구조 | 기능 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.09** | 완료 조건: 프로젝트가 정상적으로 실행되고 빌드된다. | 완료조건 | Phase 1 | Phase 1 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.10** | 셀 선택 및 편집 | 기능 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: SpreadsheetGrid.test.tsx·GridSelection.test.ts·spreadsheet-grid.spec.ts(02A), 행·열 전체 선택 range-operations.spec.ts(02E)) |
| **R-17.11** | 수식 입력 | 기능 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: FormulaBar.test.tsx·useCellEditing.test.ts·formula-bar.spec.ts(02C), 포인트 모드 pointMode.test.ts·point-mode.spec.ts(02E)) |
| **R-17.12** | 기본 수식 계산 | 기능 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: formula-eval.test.ts·golden-excel.test.ts·golden-excel-2.test.ts(02B)) |
| **R-17.13** | 여러 셀의 값 관리 | 기능 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: Delete 범위 지우기 SpreadsheetGrid.test.tsx(02A), 복사·붙여넣기·자동 채우기·행·열 조작 clipboard·autoFill·rowColumnOps·referenceShift.test.ts·range-operations.spec.ts(02E)) |
| **R-17.14** | Undo 및 다시 실행 | 기능 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: historyManager.test.ts 50회 왕복(02D, 02E 동작 7종 추가)·workbookModel.test.ts·sandbox.spec.ts·range-operations.spec.ts) |
| **R-17.15** | 최소한의 워크시트 관리 | 기능 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: SheetTabs.test.tsx·workbookModel.test.ts·sandbox.spec.ts(02D), 시트 순서·시트 이동 range-operations.spec.ts(02E)) |
| **R-17.16** | 완료 조건: 실제로 데이터를 입력하고 수식을 계산할 수 있다. | 완료조건 | Phase 2 | Phase 2 완료 게이트 | 빌드 / 테스트 | 완료됨 (2026-10-24 판정. 전체 `npm test` 3회 연속 1180/1180 통과, 전체 Playwright 39/39, build 통과. 근거: 연습실에서 값·수식 입력과 계산 sandbox.spec.ts·SandboxPage.test.tsx) |
| **R-17.17** | Spotlight 오버레이 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.18** | 설명 말풍선 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.19** | 단계별 진행 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.20** | 사용자 행동 감지 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.21** | 셀과 UI 요소 강조 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.22** | 자연스러운 전환 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.23** | 오류와 재시도 | 기능 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.24** | 완료 조건: 사용자가 실제 셀을 조작해야만 다음 단계로 진행되는 튜토리얼을 완성한다. | 완료조건 | Phase 3 | Phase 3 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.25** | 문제 데이터 구조 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.26** | 문제 시작 상태 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.27** | 정답 검증 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.28** | 단계별 힌트 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.29** | 오답 피드백 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.30** | 문제 재시작 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.31** | 결과 화면 | 기능 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.32** | 완료 조건: 최소 10개의 검증된 기초 문제를 풀 수 있다. | 완료조건 | Phase 4 | Phase 4 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.33** | 단원 목록 | 기능 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.34** | 진행률 | 기능 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.35** | 경험치 | 기능 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.36** | 업적 | 기능 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.37** | 오답 복습 | 기능 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.38** | 난이도 구분 | 기능 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.39** | 완료 조건: 사용자가 첫 단원부터 마지막 문제까지 하나의 학습 흐름을 완주할 수 있다. | 완료조건 | Phase 5 | Phase 5 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.40** | 인증 | 기능 | Phase 6 | Phase 6 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.41** | 사용자별 학습 진도 | 기능 | Phase 6 | Phase 6 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.42** | 데이터 저장 | 기능 | Phase 6 | Phase 6 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.43** | 보안 규칙 | 기능 | Phase 6 | Phase 6 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.44** | 저장 및 복원 테스트 | 기능 | Phase 6 | Phase 6 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.45** | 완료 조건: 서로 다른 계정의 데이터가 분리되고 학습 진도가 안정적으로 저장된다. | 완료조건 | Phase 6 | Phase 6 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.46** | 중급 함수 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.47** | 데이터 정리 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.48** | 차트 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.49** | 실무 프로젝트 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.50** | 자격증 대비 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.51** | 고급 도전 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.52** | XLSX 파일 처리 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.53** | 고급 분석 도구 | 기능 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.54** | 완료 조건: 각 기능을 실제로 구현하고 테스트한 범위만 완료로 표시한다. | 완료조건 | Phase 7 | CARD-07A~07H | 단위 / E2E | 연기됨 (Post-MVP 확장) |
| **R-17.55** | 프로덕션 빌드 | 기능 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.56** | Netlify 배포 | 기능 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.57** | 실제 브라우저 검증 | 기능 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.58** | 성능 점검 | 비기능 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.59** | 접근성 점검 | 비기능 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.60** | 보안 점검 | 기능 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.61** | 문서화 | 문서화 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-17.62** | 완료 조건: 실제 웹사이트에서 핵심 학습 과정을 문제없이 사용할 수 있다. | 완료조건 | Phase 8 | Phase 8 완료 게이트 | 빌드 / 테스트 | 계획됨 |
| **R-18.01** | 현재 파일과 환경을 먼저 확인한다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.02** | 이미 존재하는 프로젝트를 불필요하게 초기화하지 않는다. | 금지규칙 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.03** | 작업 전에 구현 계획과 중요한 기술적 결정을 정리한다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.04** | 가능한 한 실제 파일을 작성하고 수정한다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.05** | 기능별로 실행하고 테스트한다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.06** | 오류가 발생하면 해결하고 다시 검증한다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.07** | 작업하지 않은 기능을 완성했다고 주장하지 않는다. | 금지규칙 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.08** | 라이선스가 불확실한 의존성은 먼저 확인한다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.09** | 실제로 존재하지 않는 API나 라이브러리 기능을 가정하지 않는다. | 금지규칙 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.10** | 보안 규칙과 환경 변수 설정을 생략하지 않는다. | 금지규칙 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.11** | 중요한 설계 결정은 문서로 남긴다. | 기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.12** | 장기적으로 유지보수할 수 있는 코드를 작성한다. | 비기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-18.13** | 작업 중 매번 계획만 길게 설명하고 멈추지 마라. | 금지규칙 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 프로세스 감사 | 계획됨 |
| **R-19.01** | 다음 기준을 충족하지 못하면 프로젝트를 완성했다고 보고하지 마라. | 금지규칙 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.02** | 독자적인 브랜드와 일관된 디자인이 있다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.03** | 데스크톱에서 사용하기 편하다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.04** | 학습 경로가 명확하다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.05** | 실제 셀을 편집할 수 있다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.06** | 지원되는 수식이 정상적으로 계산된다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.07** | 튜토리얼이 실제 사용자 행동과 연결된다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.08** | 힌트는 요청했을 때만 제공된다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.09** | 오답을 이해하고 다시 도전할 수 있다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.10** | 채점 결과가 정의된 규칙과 일치한다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.11** | 학습 진도와 복습 기록이 관리된다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.12** | Firebase 보안 규칙이 검증된다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.13** | Netlify에 배포할 수 있다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.14** | 핵심 기능의 자동화 테스트가 통과한다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.15** | 지원하지 않는 기능을 명확하게 표시한다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.16** | 실제 Excel과의 차이를 정직하게 안내한다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.17** | 새로운 문제와 단원을 추가하기 쉽다. | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.18** | 구현된 기능 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.19** | 아직 구현되지 않은 기능 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.20** | 사용한 기술과 선택 이유 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.21** | 실행 및 배포 방법 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.22** | 환경 변수 목록 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.23** | Firebase 설정 방법 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.24** | 테스트 결과 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.25** | 알려진 제한사항 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-19.26** | 다음 개발 단계 | 기능 | Phase 8 | CARD-08C | 최종 인수 검수 | 계획됨 |
| **R-20.01** | 이 프롬프트를 읽은 뒤 모든 요구사항을 한 번에 구현하려고 하지 마라. | 금지규칙 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.02** | 현재 작업 디렉터리와 프로젝트 상태를 확인한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.03** | 공식 문서와 기술적 제약을 바탕으로 핵심 기술을 선택한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.04** | `docs/PRODUCT_SPEC.md`에 제품 요구사항을 정리한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.05** | `docs/TECHNICAL_DESIGN.md`에 아키텍처와 데이터 흐름을 정리한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.06** | `docs/CURRICULUM.md`에 전체 교육과정의 구조를 정리한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.07** | `docs/IMPLEMENTATION_PLAN.md`에 단계별 구현 계획과 완료 조건을 기록한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.08** | 첫 번째 MVP의 범위를 확정한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |
| **R-20.09** | 곧바로 실제 프로젝트의 기반 구현을 시작한다. | 기능 | Phase 0 | 설계자 수행 (CARD-01A 전제) | 문서화 검수 | 계획됨 |

---

## 2. 보안 및 부정행위 방지 보강 추적표 (S-01 ~ S-14)

| 요구사항 ID | 원문 요약 및 핵심 내용 | 유형 | 담당 Phase | 담당 작업 카드 | 검증 방법 | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S-01** | Firestore 규칙 기본 거부 (Default Deny), auth.uid == userId 소유권 강제, keys().hasOnly() 필드 제한, 불변 필드 보호, request.time 사용 | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **S-02** | 공용 콘텐츠 컬렉션(courses, problems) 클라이언트 쓰기 금지 (읽기 전용) | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **S-03** | 경험치(XP) 및 업적 조작 방지 (단조 증가, 1회 최대 50XP 상한, 5초 최소 간격 강제) | 기능 | Phase 6 | CARD-06C | 규칙 단위 테스트 | 계획됨 |
| **S-04** | 정답 노출 방지 (학습 모드 즉각 피드백 vs 자격증 시험 모드 제출 후 채점 분리) | 기능 | Phase 4/7 | CARD-04A, CARD-07F | 네트워크 검사 | 부분 완료 (04A: 공개용 문제 뷰 `toPublicProblem`까지. 시험 모드 제출 후 채점·네트워크 검사는 CARD-07F) |
| **S-05** | Firebase App Check 도입 (reCAPTCHA Enterprise, debug provider, 모니터링 후 강제 차단) | 비기능 | Phase 6 | CARD-06A | 토큰 검증 테스트 | 계획됨 |
| **S-06** | API 키 HTTP 리퍼러 제한, Firebase Auth 승인 도메인 설정, VITE_ 비밀값 노출 금지 | 비기능 | Phase 6 | CARD-06A | 콘솔 설정 체크리스트 | 계획됨 |
| **S-07** | Netlify 보안 헤더(CSP, HSTS, X-Content-Type-Options, frame-ancestors none) 및 SPA 200 리디렉션 | 비기능 | Phase 8 | CARD-08A | curl 헤더 검사 | 계획됨 |
| **S-08** | XSS 원천 차단: dangerouslySetInnerHTML 전면 금지 (ESLint 강제), DOMPurify 화이트리스트 렌더링 | 금지규칙 | Phase 1~8 | CARD-01A (ESLint) | ESLint / 단위 | 부분 완료 (ESLint `react/no-danger` 강제 검증, DOMPurify는 서식 텍스트 도입 카드) |
| **S-09** | 수식 엔진 남용 방지: 수식 길이 1,000자 상한, 시트 1,000행 상한, 순환참조 방어, Worker 타임아웃 2초, eval/Function 전면 금지 | 금지규칙 | Phase 2 | CARD-02B | ESLint / 단위 | 부분 완료 (수식 1,000자·1,000행×50열 상한, 순환 #CYCLE! 이중 판정, eval 금지. Worker 2초 타임아웃은 미구현 — 사용자 결정 2026-10-23) |
| **S-10** | 공급망 보안: package-lock.json 필수 커밋, 정확한 버전 고정, npm audit CI 게이트, 출처 불명 스크립트 금지 | 비기능 | Phase 1 | CARD-01A | npm audit / CI | 부분 완료 (lockfile·정확 버전·로컬 npm audit 0건 검증, CI 게이트는 원격 저장소 연결 후 첫 실행 필요) |
| **S-11** | 비밀 정보 유출 방지: .gitignore 철저 검증 (.env* 제외), 커밋 전 비밀값 스캔 도구 연동 | 비기능 | Phase 1 | CARD-01A | Git 스캔 테스트 | 부분 완료 (.gitignore `git check-ignore` 검증, gitleaks CI는 원격 저장소 연결 후 첫 실행 필요) |
| **S-12** | 개인정보 최소 수집, 계정 탈퇴 시 데이터 영구 삭제 트랜잭션, 데이터 내보내기, 만 14세 이용 약관 정책 | 비기능 | Phase 6 | CARD-06B | 약관 / 탈퇴 테스트 | 계획됨 |
| **S-13** | 인증 보안: 이메일 열거 방지 모호한 실패 메시지, 비밀번호 복잡도 정책, 공식 비밀번호 재설정 OOB 흐름 | 기능 | Phase 6 | CARD-06A | 통합 테스트 | 계획됨 |
| **S-14** | Firestore 보안 규칙 자동화 테스트: Local Emulator Suite 기반 5대 핵심 권한 시나리오 자동 검증 | 비기능 | Phase 6 | CARD-06C | npm run test:rules | 계획됨 |

---

## 3. 정확성 및 오류 포착 보강 추적표 (Q-01 ~ Q-09)

| 요구사항 ID | 원문 요약 및 핵심 내용 | 유형 | 담당 Phase | 담당 작업 카드 | 검증 방법 | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Q-01** | Excel 대조 골든 테스트: tests/fixtures/golden-excel-calculations.xlsx 기준 통합 문서 대조 러너 및 차이 문서화(EXCEL_DIFFERENCES.md) | 비기능 | Phase 2 | CARD-02B | 골든 테스트 러너 | 완료됨 (golden-excel.test.ts: 수식 96개 중 95개 Excel 일치, 1개는 EXCEL_DIFFERENCES D-3 단일 예외로 양쪽 값 검증) |
| **Q-02** | 데이터 교란 채점 (Perturbation-Based Scoring): 3종 변형 데이터셋 주입을 통한 하드코딩/범위오류/참조오류 판정표 | 기능 | Phase 4 | CARD-04B | 단위 테스트 | 계획됨 |
| **Q-03** | 콘텐츠 자체 검증 파이프라인: Zod 스키마 검증, 기준 정답 통과 및 대표 오답 실패 CI 자동 검증(scripts/verify-content.ts) | 비기능 | Phase 4 | CARD-04E | npm run verify-content | 계획됨 |
| **Q-04** | 속성 기반 테스트 (fast-check): Undo/Redo 50회 왕복 불변성, 자동채우기 수식 주소 오프셋, F4 참조 순환성 검증 | 비기능 | Phase 2 | CARD-02A, CARD-02E | fast-check 러너 | 완료됨 (F4 참조 순환성: formulaReference.test.ts(02C). Undo/Redo 50회 왕복: historyManager.test.ts(02D), 02E에서 행·열 삽입·삭제·크기·붙여넣기·잘라내기·채우기·시트 순서를 무작위 동작에 추가. 자동 채우기 주소 오프셋: 아래·오른쪽으로 N칸 → 상대 참조 +N, $ 보존, 시트 밖 #REF!(autoFill.test.ts 300회, 02E)) |
| **Q-05** | 한글 입력기(IME) 조합 처리: isComposing 감지 및 compositionstart/end 처리를 통한 조합 중 커밋 및 중복 입력 방지 | 기능 | Phase 2 | CARD-02A | Playwright E2E | 완료됨 (useImeInput + ImeInput.test.ts, Playwright CDP 조합 입력 "합계"·"홍길동" 검증) |
| **Q-06** | 브라우저 단축키 충돌 방어 및 대체 안내: 가로채기 불가능한 단축키 투명 고지 및 F1/F4/Ctrl+Z 앱 인터셉터 | 기능 | Phase 2 | CARD-02A | 수동 / E2E | 부분 완료 (그리드·수식 입력줄에서 F1 기본 동작 차단, F4는 수식 편집 중 참조 고정 순환. Ctrl+Z, Ctrl+Y·Ctrl+Shift+Z는 편집 중이 아닐 때 앱 실행 취소로 가로챔(02D, 편집 중에는 입력 상자 글자 되돌리기). 02E: Ctrl+C/X/V, Ctrl+D/R 가로챔, Ctrl+PageUp/PageDown은 Chromium 예약 단축키라 대체 Ctrl+Shift+PageUp/PageDown과 시트 탭 안내(TEST_STRATEGY Q-06, 실제 Chrome 수동 확인 남음). 가로챌 수 없는 단축키 안내 패널은 학습 화면 카드) |
| **Q-07** | 날짜 일련번호 및 한국 로케일: 1900년 윤년 처리, 1900-01-01 기준 일련번호 호환성, 한국어 날짜/통화 서식 파싱 테스트 | 비기능 | Phase 2 | CARD-02B | 단위 테스트 | 부분 완료 (1900 윤년·일련번호 dateSerial.test.ts·골든 DateSerial. 한국어 날짜·통화 서식은 Phase 7 셀 서식 — 사용자 결정 2026-10-23) |
| **Q-08** | CI 품질 게이트: typecheck, lint, format, test, rules, build 단일 파이프라인 병합 차단 자동화 | 비기능 | Phase 1 | CARD-01A | GitHub Actions CI | 부분 완료 (typecheck·lint·format·test·licenses·audit·build 단계 구성, rules는 CARD-06C·e2e는 CARD-03D에서 추가, 원격 미실행) |
| **Q-09** | React 오류 경계(ErrorBoundary) 컴포넌트 격리 및 저장 실패 시 지수 백오프 자동 재시도/오프라인 캐시 | 기능 | Phase 1/6 | CARD-01C, CARD-06B | 단위 / E2E | 부분 완료 (ErrorBoundary 구현·테스트 완료. 지수 백오프 재시도·오프라인 캐시는 CARD-06B) |

---

## 4. 부드러움 및 성능 보강 추적표 (P-01 ~ P-06)

| 요구사항 ID | 원문 요약 및 핵심 내용 | 유형 | 담당 Phase | 담당 작업 카드 | 검증 방법 | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P-01** | Core Web Vitals 성능 예산: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 공식 목표 준수 및 Lighthouse CI 감시 | 비기능 | Phase 8 | CARD-08B | Lighthouse CI | 계획됨 |
| **P-02** | 지연 로딩 및 코드 분할: 수식엔진, XLSX 파서, 차트, Level 7~10 고급/자격증 모듈의 dynamic import() 청크 분리 | 비기능 | Phase 8 | CARD-08A | 번들 분석기 | 계획됨 |
| **P-03** | 애니메이션 원칙: transform 및 opacity 전용 모션 토큰 적용, 레이아웃 흔들림 금지, prefers-reduced-motion 및 인앱 모션 끄기 | 비기능 | Phase 3 | CARD-03D | 수동 / 단위 | 완료됨 (CARD-03D: transform·opacity 전용, `--motion-duration-*` 토큰만 사용, prefers-reduced-motion 및 설정 화면 `/settings`의 '항상 줄이기'(localStorage 저장, `<html data-motion>`). 근거: motion.test.ts·motionSetting.test.ts·settings-motion.spec.ts) |
| **P-04** | Spotlight 위치 실시간 동기화: ResizeObserver, 가상 스크롤 추적, 말풍선 뷰포트 충돌 시 자동 반전(Flip) 로직 | 기능 | Phase 3 | CARD-03C | 단위 / E2E | 완료됨 (ResizeObserver·capture 스크롤 추적·Flip. 단위 + E2E) |
| **P-05** | 3계층 입력 반응성 분리: 동기식 UI 렌더링(0ms) -> 비동기 수식/채점 연산 -> 1초 디바운스 영속화 저장 | 비기능 | Phase 2 | CARD-02A | 프로파일링 | 부분 완료 (1계층: 편집 초안은 로컬 state, Enter/Tab/화살표/blur에서만 커밋. 2계층 CARD-02B, 3계층 CARD-06B) |
| **P-06** | 대규모 데이터 가상 스크롤 성능 벤치마크: 10,000행 × 100열 60 FPS 유지 및 드롭 프레임 5% 미만 보장 | 비기능 | Phase 2 | CARD-02A | Playwright 성능테스트 | 부분 완료 (tests/perf/virtual-scroll.perf.ts. CARD-02A 코드는 2026-10-23 전원 연결 상태에서 3건 모두 통과. CARD-02E에서 그리드가 느려진 원인(커밋마다 도는 passive effect 등)을 찾아 고쳤고 메인 스레드 비용은 main과 같아졌다. 수정 뒤 PageDown·연속 스크롤은 main과 같이 통과하지만, 휠 스크롤은 2026-10-24 측정에서 main·브랜치 모두 49~57 FPS로 실패해(Defender 서명 갱신 중, 배터리 16%) 이 코드에서 휠 통과를 아직 확인하지 못했다. 기준값은 낮추지 않음. 정상 상태에서 `npm run test:perf` 재확인 필요) |

---

## 5. Claude Code 인계 규칙 추적표 (G-01 ~ G-05)

| 요구사항 ID | 원문 요약 및 핵심 내용 | 유형 | 담당 Phase | 담당 작업 카드 | 검증 방법 | 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **G-01** | Claude Code 작업 5대 금지 규칙: 테스트 약화/삭제 금지, 정답 하드코딩 금지, ts-ignore/빈 catch 오류 은폐 금지, 가짜 목업 완료 보고 금지, package.json에 없는 패키지의 npx 실행 금지(필요 시 사용자에게 먼저 질문) | 금지규칙 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 코드 리뷰 | 계획됨 |
| **G-02** | 세션 종료 시 완료 보고 표준 양식 준수 (변경 파일, 실행 명령/출력, 통과/실패 수, 추적표 갱신, 다음 카드) | 문서화 | Phase 1~8 | CLAUDE_CODE_HANDOFF | 세션 완료 보고 | 계획됨 |
| **G-03** | 루트 CLAUDE.md 개발자 지침 유지 및 세부 설계 문서 연계 | 문서화 | Phase 0 | CLAUDE.md | 문서 확인 | 계획됨 |
| **G-04** | Windows 11 VS Code 호환, Node LTS 24 고정(.nvmrc: 24), 공백 경로 따옴표 처리, OneDrive 등 동기화 폴더 npm install 엄격 금지 | 비기능 | Phase 1 | CARD-01A | 환경 검증 | 완료됨 |
| **G-05** | Git 형상 관리 전략: 카드별 브랜치/원자적 커밋, Conventional Commits 규칙, Phase 종료 태그 발행 | 비기능 | Phase 1~8 | CLAUDE_CODE_HANDOFF | Git 로그 검수 | 계획됨 |

---

## 6. 역방향 점검표 (Backward Verification Table — 전수 대조 및 누락 0건 검증)

원본 `docs/MASTER_PROMPT.md`의 각 장별 글머리표 목록 항목 수, '하지 마라' 규칙 문장 수, 완료 조건 문장 수와 부여한 고유 ID 수를 전수 대조한 결과입니다:

| 원본 장 및 보강 영역 | 글머리표 목록 항목 수 | 금지 규칙 문장 수 | 완료 조건 문장 수 | 원문 항목 수 (A) | 부여한 ID 수 (B) | 누락 수 (A - B) | 점검 결과 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **제01장: 제품의 핵심 철학** | 14 | 2 | 0 | 16 | 16 | 0 | **완벽 일치 (누락 0건)** |
| **제02장: 개발을 시작하기 전에 반드시 해야 할 일** | 29 | 3 | 0 | 32 | 32 | 0 | **완벽 일치 (누락 0건)** |
| **제03장: 권장 기술 스택** | 17 | 2 | 0 | 19 | 19 | 0 | **완벽 일치 (누락 0건)** |
| **제04장: 서비스의 전체 정보 구조** | 48 | 5 | 0 | 53 | 53 | 0 | **완벽 일치 (누락 0건)** |
| **제05장: 교육과정 설계** | 116 | 6 | 0 | 122 | 122 | 0 | **완벽 일치 (누락 0건)** |
| **제06장: 학습 콘텐츠의 표준 구조** | 17 | 2 | 0 | 19 | 19 | 0 | **완벽 일치 (누락 0건)** |
| **제07장: 튜토리얼 엔진** | 28 | 3 | 0 | 31 | 31 | 0 | **완벽 일치 (누락 0건)** |
| **제08장: 실제 스프레드시트 엔진** | 28 | 4 | 0 | 32 | 32 | 0 | **완벽 일치 (누락 0건)** |
| **제09장: 문제 풀이 및 채점 시스템** | 39 | 5 | 0 | 44 | 44 | 0 | **완벽 일치 (누락 0건)** |
| **제10장: 실제 업무 데이터와 문제 콘텐츠** | 10 | 4 | 0 | 14 | 14 | 0 | **완벽 일치 (누락 0건)** |
| **제11장: 게임화와 동기부여** | 13 | 2 | 0 | 15 | 15 | 0 | **완벽 일치 (누락 0건)** |
| **제12장: 사용자 인터페이스와 디자인 시스템** | 31 | 6 | 0 | 37 | 37 | 0 | **완벽 일치 (누락 0건)** |
| **제13장: Firebase와 사용자 데이터** | 26 | 2 | 0 | 28 | 28 | 0 | **완벽 일치 (누락 0건)** |
| **제14장: Netlify 배포** | 11 | 3 | 0 | 14 | 14 | 0 | **완벽 일치 (누락 0건)** |
| **제15장: 파일 구조와 코드 품질** | 11 | 2 | 0 | 13 | 13 | 0 | **완벽 일치 (누락 0건)** |
| **제16장: 테스트와 품질 검증** | 26 | 1 | 0 | 27 | 27 | 0 | **완벽 일치 (누락 0건)** |
| **제17장: MVP 구현 순서** | 53 | 1 | 8 | 62 | 62 | 0 | **완벽 일치 (누락 0건)** |
| **제18장: 작업 방식** | 12 | 1 | 0 | 13 | 13 | 0 | **완벽 일치 (누락 0건)** |
| **제19장: 최종 완성 기준** | 25 | 1 | 0 | 26 | 26 | 0 | **완벽 일치 (누락 0건)** |
| **제20장: 지금 당장 시작할 작업** | 8 | 1 | 0 | 9 | 9 | 0 | **완벽 일치 (누락 0건)** |
| **보강: 보안 (S-01 ~ S-14)** | 0 | 2 | 0 | 14 | 14 | 0 | **완벽 일치 (누락 0건)** |
| **보강: 정확성/테스트 (Q-01 ~ Q-09)** | 0 | 0 | 0 | 9 | 9 | 0 | **완벽 일치 (누락 0건)** |
| **보강: 성능/UX (P-01 ~ P-06)** | 0 | 0 | 0 | 6 | 6 | 0 | **완벽 일치 (누락 0건)** |
| **보강: Claude Code 인계 (G-01 ~ G-05)** | 0 | 1 | 0 | 5 | 5 | 0 | **완벽 일치 (누락 0건)** |
| **총합 (Grand Total)** | **562** | **59** | **8** | **660** | **660** | **0** | **누락 0건 완전 검증 완료** |

---

## 7. 작업 카드별 갱신 기록

### CARD-01A (2026-10-22)
- **완료됨:** R-03.01, R-03.02, R-03.11, R-15.02, R-15.03, G-04
- **부분 완료:** R-03.10, S-08, S-10, S-11, Q-08 (각 행의 상태 칸에 남은 범위 명시)
- **CARD-01A 배정이지만 다른 카드에서 충족 예정 (계획됨 유지):**
  - R-03.03 Motion → CARD-03D, R-03.04 React Router → CARD-01C, R-03.05 TanStack Query/Firebase SDK → CARD-06A~06B, R-03.06 HyperFormula → CARD-02B, R-03.07 그리드 → CARD-02A, R-03.08 Firebase → CARD-06A, R-03.09 Netlify → CARD-08A
  - R-12.11~R-12.23 디자인 토큰 → CARD-01B (`src/styles/tokens.css`가 01B 파일 목록에 있음)
  - R-03.12, R-03.14, R-03.16~R-03.19, R-15.01, R-15.04~R-15.13: 전 카드 공통 원칙으로 계속 적용
- **카드 원문과의 차이 (사유 포함):**
  1. `.eslintrc.cjs` → `eslint.config.js` (flat config). ESLint 10은 eslintrc를 지원하지 않음. 사용자 결정.
  2. Tailwind 3 + `tailwind.config.js`/`postcss.config.js` → Tailwind 4.3.3 + `@tailwindcss/vite`. Tailwind 3.4.19 의존성 체인에 high 취약점 5건(braces GHSA-vfj7-8cjw-p6xm 등)이 있어 S-10 `npm audit --audit-level=high` 게이트와 충돌. 두 설정 파일은 v4에서 불필요하므로 만들지 않음.
  3. Zod 미설치: CARD-01A에서 사용하지 않으므로 R-15.10에 따라 CARD-03A에서 설치.
  4. TypeScript 6.0.3 고정: 최신 7.0.2는 typescript-eslint 8.72.0 지원 범위(<6.1.0) 밖.
  5. 카드 미기재 추가 파일: `.github/workflows/ci.yml`(Q-08/S-10/S-11, 사용자 결정), `scripts/audit-licenses.mjs`(ADR-001 §4.2), `.gitattributes`(Windows↔CI 줄바꿈 일치), `.prettierignore`, 최소 앱 셸(`index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`)과 실제 스모크 테스트(`tests/unit/app/App.test.tsx`, `tests/setup.ts`).
- **요구사항 ID 표기 불일치:** HANDOFF 카드의 `R-03.0-01`, `R-12.1-01` 같은 ID는 본 추적표 형식(`R-03.01` 등)과 다르다. 본 표 ID 기준으로 갱신했다.

### CARD-01B (2026-10-22)
- **완료됨:** R-04.01, R-04.02, R-04.03, R-04.05, R-04.06, R-04.07, R-12.11~R-12.23
- **부분 완료 (사용자 검수 필요, 각 행 상태 칸에 사유 명시):**
  - R-04.04 학습 시작 버튼: `/dashboard` 링크는 구현·테스트했으나 목적지 라우트는 CARD-01C에서 생성
  - R-01.05, R-12.01~R-12.10(디자인 리뷰), R-12.26~R-12.30(반응형 검수): 구현 및 1440px/390px 스크린샷 자체 점검만 수행. 검수 방식이 수동이므로 사용자 확인 전에는 완료로 표기하지 않음
- **카드 원문과의 차이 (사유 포함):**
  1. 카드 미기재 추가 파일: `src/index.css`(tokens.css import 및 Tailwind v4 `@theme inline` 매핑, 기본 색상 팔레트 제거로 R-12.23 강제), `src/App.tsx`·`tests/unit/app/App.test.tsx`(랜딩 렌더링으로 갱신), `src/components/brand/Logo.tsx`(독자 로고), `tests/unit/pages/LandingPage.test.tsx`(7개 섹션 렌더링 완료 조건 검증), `tests/unit/styles/tokens.test.ts`(R-12.11~23 CSS 토큰 검사)
  2. 사용자 결정: 시작 버튼 목적지는 `/dashboard` 링크로 구현
  3. `tokens.test.ts`는 jsdom에서 `?raw` import가 빈 문자열이 되어 `fs`로 직접 읽음
- **알려진 한계:** `favicon.ico` 없음(브라우저 자동 요청 404 1건). 대시보드·라우팅은 CARD-01C. 랜딩의 `/dashboard` 링크는 그 전까지 랜딩이 다시 표시됨.

### CARD-01C (2026-10-22)
- **완료됨:** R-03.04, R-04.04, R-04.09, R-04.17
- **부분 완료 (각 행 상태 칸에 남은 범위 명시):**
  - R-04.08, R-04.10~R-04.16: 대시보드 UI, "기록 없음" 상태, 데이터 주입 시 렌더링은 테스트로 검증했다. 학습 진행 저장소가 없으므로 실제 학습 기록 연동은 CARD-06에서 한다 (사용자 결정 2026-10-22).
  - Q-09: ErrorBoundary만 구현. 저장 실패 지수 백오프 재시도·오프라인 캐시는 CARD-06B.
- **카드 원문과의 차이 (사유 포함):**
  1. 카드 미기재 추가 파일: `src/components/layout/AppLayout.tsx`(대시보드·학습·샌드박스 공통 틀), `src/features/dashboard/types.ts`·`emptyDashboard.ts`(데이터 모델과 기록 없음 상태), `src/features/dashboard/components/ActivityListCard.tsx`(목록형 5개 항목 공통 카드), `src/pages/NotImplementedPage.tsx`·`NotFoundPage.tsx`, `tests/unit/app/routes.test.tsx`, `tests/unit/components/ErrorBoundary.test.tsx`, `tests/e2e/routing.spec.ts`.
  2. `src/components/ui/Button.tsx`에 `ButtonRouterLink` 추가, 랜딩의 내부 링크를 라우터 링크로 교체. 기존 랜딩·버튼 테스트는 기대값을 바꾸지 않고 `MemoryRouter`로 감싸기만 했다.
  3. `/learn/:courseId`, `/sandbox`는 "아직 구현되지 않았습니다"를 명시한 자리 화면이다. 학습·샌드박스 기능은 이후 카드에서 구현한다.
  4. 대시보드는 모든 사용자에게 "기록 없음" 상태로 표시된다 (사용자 결정 2026-10-22).
- **요구사항 ID 표기 불일치 (이번 카드 한정 기록):** HANDOFF의 CARD-01C 본문에 적힌 `R-04.2-01`, `R-04.2-02`, `R-17.1-01`은 본 추적표에 존재하지 않는다. MASTER_PROMPT §4.2 원문 기준으로 `R-04.08`~`R-04.17`에 대응시켜 갱신했다(사용자 결정 2026-10-22). `R-17.1-01`은 대응하는 ID를 확인하지 못해 Q-09(ErrorBoundary)와 R-03.04만 갱신했다. 다른 카드의 ID 표기는 이번에 수정하지 않았다.
- **알려진 한계:** `favicon.ico` 없음(CARD-01B에서 이어짐). `/learn/level-0`의 courseId 규칙은 CARD-03A에서 `src/content/contentIds.ts`로 확정했다(해결됨).

### CARD-02A (2026-10-23)
- **완료됨:** R-03.07, R-08.01, R-08.02, R-08.03, R-08.04, R-08.05, R-08.09, R-12.25, Q-05
- **부분 완료 (각 행 상태 칸에 남은 범위 명시):** Q-06, P-05
- **CARD-02A 배정이지만 계획됨 유지:**
  - R-08.06 행·열 조작, R-08.07 복사·붙여넣기, R-08.10 자동 채우기, R-08.13 저장 가능한 셀 상태: 카드 본문의 파일 목록·완료 조건에 없어 이번 범위에서 제외 (사용자 결정 2026-10-23). 같은 날 재배정: R-08.06·R-08.07·R-08.10 → 신규 CARD-02E, R-08.13 → CARD-06B (아래 '재배정 기록' 참조).
  - R-08.08 Undo·R-08.12 여러 시트 → CARD-02D, R-08.11 수식 입력줄 → CARD-02C (해당 카드에 실제 파일이 있음)
  - R-12.24: 학습 UI가 아직 없음. Q-04: 정의된 불변식 3종이 모두 다른 카드 기능.
- **요구사항 ID 대응 (이번 카드 한정 기록):** HANDOFF의 CARD-02A 본문 ID를 MASTER_PROMPT 원문 기준으로 다음과 같이 대응시켰다. 다른 카드의 ID 표기는 수정하지 않았다.
  - `R-01.0-04` → R-01.04 (§1-4, 전체 공통 행이라 상태 변경 없음. 실제 셀·행·열 작업 환경의 첫 구현)
  - `R-07.2-06` → R-07.19 (§7.2 6번째, 담당 CARD-03C. `getCellViewportRect`·`getRangeViewportRect`·`scrollToCell` 제공)
  - `R-08.1-01` → R-08.01~R-08.13 (§8.1)
  - `R-12.2-01` → R-12.24, `R-12.2-02` → R-12.25 (§12.2)
  - `ADR-002`는 요구사항 ID가 아니라 결정 문서로 보고 준수만 함. R-03.07은 CARD-01A 기록에서 CARD-02A로 넘겨 둔 항목.
- **Excel 기준 파일 선행 조건:** CARD-02A에는 없음(외부 사용자 조치: 없음). 수식 계산 결과 비교 부분이 없어 픽스처 없이 진행했다. 골든 픽스처는 CARD-02B(Q-01).
- **카드 원문과의 차이 (사유 포함):**
  1. 카드 미기재 추가 파일: `src/pages/dev/GridHarnessPage.tsx`(개발 전용 `/dev/grid`, 사용자 결정 2026-10-23), `src/app/routes.tsx`(개발 서버와 `--mode perf` 빌드에서만 등록, 프로덕션 번들에서 제외 확인), `tests/unit/spreadsheet/SpreadsheetGrid.test.tsx`, `tests/e2e/spreadsheet-grid.spec.ts`, `playwright.perf.config.ts`, `package.json`(`test:perf` 스크립트, `@tanstack/react-virtual` 3.14.13), `tsconfig.node.json`(perf 파일 타입 검사), `.gitignore`·`.prettierignore`·`eslint.config.js`(`dist-perf/` 무시).
  2. `eslint.config.js`에서 `useVirtualGrid.ts` 한 파일만 `react-hooks/incompatible-library`를 껐다. useVirtualizer가 React Compiler 자동 메모이제이션과 맞지 않는다는 안내이며, 이 프로젝트는 React Compiler를 쓰지 않는다. 인라인 주석 비활성화는 쓰지 않았다.
  3. ADR-002의 `getFormulaBarRect`는 수식 입력줄이 생기는 CARD-02C에서 추가한다(가짜 null 반환 스텁을 두지 않음).
  4. `@tanstack/react-virtual`은 최신 3.14.22 대신 공개 2주 이상 지난 3.14.13을 고정했다(S-10).
- **P-06 측정 기록 (2026-10-23 갱신, 상태: 완료됨):** 10,000행 × 100열, 프로덕션 최적화 perf 빌드, Playwright Chromium(1280×720). 전원 연결 상태로 보이는 실행 2회는 휠 60.0 FPS·드롭 0%, PageDown 58.6~58.8 FPS·드롭 2.1~2.4%, 연속 스크롤 60.0 FPS·드롭 0%로 3/3 통과. 다른 2회는 연속 스크롤 1건씩 실패(평균 56.0~56.7 FPS, 한 실행은 최악 99.9ms 1프레임). 배터리 구동이 확인된 뒤 실행에서는 3건 모두 실패(30~45 FPS). 기준값은 낮추지 않았다. 이후 2026-10-23에 사용자가 전원을 연결한 상태에서 `npm run test:perf`를 다시 실행했고 세 가지 측정이 모두 통과해 P-06을 완료로 판정했다. 배터리 구동 중에는 실패했으므로(성능 제한 영향) 이 벤치마크는 전원 연결 환경에서 실행해야 한다.
- **알려진 한계:** 드래그 중 그리드 가장자리 자동 스크롤 없음. Ctrl+화살표(데이터 끝 이동) 미구현. 숫자·문자 정렬 구분 없음(값 형식은 CARD-02B 엔진 연결 후).
- **연습실 항목 정리 (2026-10-23, 문서 변경만):** R-04.45·R-04.46은 CARD-02D 파일 목록(`sampleDatasets.ts`, `SampleDataPicker.tsx`, 테스트)에 추가했고 샘플은 원문 10장에 따라 가상 데이터만 쓴다. R-04.47·R-04.48은 02D 완료 조건에 명시하고 구현은 02B·02C가 맡는다. R-04.50은 CARD-07B, R-04.53은 CARD-07H로 옮기고 '연기됨'으로 표시했다(원문 17장 Phase 7).
- **재배정 기록 (2026-10-23, 문서 변경만):** MASTER_PROMPT §8.1 원문(행과 열의 기본 조작 / 복사 및 붙여넣기 / 자동 채우기 / 저장 가능한 셀 상태)을 확인하고 담당 카드를 정했다.
  - R-08.06·R-08.07·R-08.10 → **신규 CARD-02E**(Phase 2). 셋 모두 수식 엔진(CARD-02B)의 참조 이동·상대 참조 규칙과 Undo 명령(CARD-02D)이 있어야 올바르게 동작한다. 기존 카드 중 02C(입력줄)·02D(Undo·시트)에는 파일 목록이 맞지 않아 별도 카드로 분리했다. Q-04의 자동 채우기 주소 오프셋 불변식도 여기서 검증한다.
  - R-08.13 → **CARD-06B**. 셀 상태를 저장 가능한 형태로 직렬화하고 IndexedDB/localStorage에 보존하는 일이 06B의 offlineStorage와 같은 범위다. 06B 파일 목록에 직렬화 모듈과 테스트를 추가했다. 참고: R-04.52(학습 파일 저장)는 MASTER_PROMPT §4.5 연습실 기능이며, 이후 CARD-02D 파일 목록(`sandboxFileStore.ts`·테스트)과 완료 조건에 추가해 추적표 배정(CARD-02D)과 일치시켰다.
  - CARD-03A의 선행 카드는 CARD-02D에서 CARD-02E로, 02D의 'Phase 2 완료 조건' 문구는 02E로 이동했다.

### CARD-02B (2026-10-23)
- **완료됨:** R-03.06, R-03.13, R-03.15, R-08.15~R-08.21, R-08.23, R-08.24, R-08.25, Q-01
- **부분 완료 (각 행 상태 칸에 남은 범위 명시):** R-08.14, R-08.22, R-08.26, R-08.27, R-08.29, S-09, Q-07
- **요구사항 ID 대응 (이번 카드 한정 기록):** 카드 본문 `R-08.2-01`~`R-08.2-05` → R-08.14~R-08.25(MASTER_PROMPT §8.2), `R-08.3-01`·`R-08.3-02` → R-08.26~R-08.32(§8.3). 카드 본문 ID도 현재 ID로 고쳤다. R-03.06은 CARD-01A 기록에서 넘겨 둔 항목이라 담당을 CARD-02B로 바꿨다.
- **사용자 결정 (2026-10-23):** xlsx 읽기·쓰기는 새 패키지 없이 자체 구현, S-09 Worker 타임아웃 제외, Q-07 한국어 서식 제외, 골든 불일치 중 CONCAT·INDEX는 어댑터에서 고치고 #NULL!은 기록된 단일 예외로 단언.
- **Excel 기준 파일 처리:** `scripts/golden/make-golden-formulas.mjs`로 `tests/fixtures/golden-formulas.xlsx`(수식 96개, 결과 값 없음, `fullCalcOnLoad="1"`)를 만들고, 사용자가 웹 Excel에서 계산한 `golden-excel-calculations.xlsx`를 받았다. 수식 96개 모두 계산 값이 있었고 입력값은 원본과 같았다. Excel은 저장 시 `fullCalcOnLoad`를 지우고 `1E+3`을 `1000`으로 바꿨다.
- **골든 불일치 4건 조사 결과:** COUNTIF 한글 와일드카드(어댑터 설정 `accentSensitive` 문제, 수정), CONCAT 미지원(플러그인 구현), INDEX 범위 밖 #NUM!(플러그인 교체), 교집합 #NULL!(엔진 한계, D-3). 근거는 `docs/EXCEL_DIFFERENCES.md`.
- **카드 원문과의 차이 (사유 포함):**
  1. 카드 미기재 추가 파일: `src/engine/spreadsheet/adapters/excelCompatPlugin.ts`(CONCAT·INDEX), `errorMessages.ts`, `supportedFunctions.ts`, `dateSerial.ts`, `numberFormat.ts`, `scripts/golden/make-golden-formulas.mjs`, `tests/fixtures/golden-formulas.xlsx`, `tests/unit/helpers/xlsx/readXlsx.ts`, `tests/unit/engine/{dependencyGraph,dateSerial,golden-formulas}.test.ts`, `package.json`(hyperformula 3.5.0).
  2. 오류 코드 `'#N/A!'`(ADR-001·TECHNICAL_DESIGN 초안)는 Excel 표기 `'#N/A'`로 바로잡았다. `'#SPILL!'`을 추가했다. 인터페이스에 `getDependents`를 더했다.
  3. ADR-001 §3의 "CONCAT ✅ 지원"은 사실과 달라 ADR에 정정 메모를 달았다.
  4. TEST_STRATEGY Q-01의 "SheetJS로 읽는다"는 자체 읽기 도구로 바뀌었음을 해당 문서에 적었다.
- **알려진 한계:** 엔진은 아직 그리드·화면에 연결되지 않았다(CARD-02C). EXCEL_DIFFERENCES 3장(D-4~D-8: 지수 표기 리터럴, `&`의 숫자 문자열 변환, INDEX 0, 미지원 함수)은 재현으로만 확인했고 Excel 대조는 하지 않았다. CONCAT의 범위·빈 셀·숫자·논리값 동작은 Microsoft 문서 기준 단위 테스트로 확인했고, Excel로 대조한 것은 셀·문자열 인수 경우(골든 C28)뿐이다.

### CARD-02B 추가 작업 (2026-10-23)
- 2차 골든 대조(`golden-formulas-2.xlsx` 291셀 + 배열 펼침 43칸을 웹 Excel로 계산, `golden-excel-2.test.ts`)에서 처음 46셀이 달라 31셀을 어댑터에서 고치고(INT·ROUND 계열·EDATE·DATEDIF 단위·MATCH 와일드카드·INDEX·FILTER·CONCATENATE/TEXTJOIN/LEN 및 LEFT/RIGHT/MID/FIND/SEARCH/SUBSTITUTE/REPLACE/REPT/UPPER/LOWER/PROPER/CLEAN/TRIM/EXACT의 15자리 변환·TEXT 지원 서식·지수 표기 전처리), 15셀은 `EXCEL_DIFFERENCES.md` D-9~D-14로 기록했으며 Excel 실측 전 항목은 "다음 골든 라운드 확인 목록"에 모았다(R-08.26~R-08.29 상태 변화 없음, ADR-001 §3.1·§3.2 갱신).

### CARD-02C (2026-10-23)
- **완료됨:** R-04.38, R-04.39, R-04.41, R-04.44, R-08.03(입력줄 연동 잔여분), R-08.11
- **부분 완료 (각 행 상태 칸에 남은 범위 명시):** R-04.40, R-04.42, R-04.43, R-08.22(기본 정렬은 CARD-02D), Q-04(F4 속성만), Q-06(F4 추가)
- **요구사항 ID 대응 (이번 카드 한정 기록):** 카드 본문 `R-04.4-01`·`R-04.4-02` → R-04.38~R-04.44(MASTER_PROMPT §4.4), `R-08.1-01` → R-08.11(§8.1 수식 입력줄). 카드 본문 ID도 현재 ID로 고쳤다.
- **카드 본문에 없던 02C 담당 항목:** R-08.22 화면 표시, Q-06·Q-04의 F4, ADR-002 `getFormulaBarRect`를 이번에 함께 처리했다.
- **사용자 결정 (2026-10-23):** LearningLayout은 개발 화면(`/dev/workspace`)에만 붙이고 `/learn/:courseId`는 내용이 생길 때까지 지금 화면 유지. F4와 fast-check(4.10.2, MIT, devDependency) 설치. 하단 바는 작업 상태와 "다시 시작"만(실행 취소는 CARD-02D).
- **카드 원문과의 차이 (사유 포함):**
  1. 카드 미기재 추가 파일: `Spreadsheet.tsx`(입력줄+그리드 묶음, `getFormulaBarRect` 핸들), `hooks/useCellEditing.ts`(공유 편집 상태), `hooks/useWorkbook.ts`(원문·결과 분리 보관, MASTER_PROMPT §8.2), `formulaReference.ts`(F4), `editorFocus.ts`, `src/pages/dev/WorkspaceHarnessPage.tsx`, 테스트 `formulaReference.test.ts`·`useCellEditing.test.ts`·`useWorkbook.test.ts`·`tests/unit/features/LearningLayout.test.tsx`·`tests/e2e/formula-bar.spec.ts`.
  2. `getFormulaBarRect`는 ADR-002가 `SpreadsheetGridHandle`에 두었으나 그리드는 수식 입력줄을 갖지 않아 `SpreadsheetHandle`(Spreadsheet)에 두었다. ADR-002에 메모했다.
  3. `SpreadsheetGridHandle`에 `focus()`를 더했다(입력줄 Esc 후 그리드로 포커스 반환).
- **알려진 한계:** 수식 편집 중 셀을 클릭해 참조를 넣는 방식(Excel 포인트 모드)은 아직 없다. 셀 클릭은 편집을 확정하고 그 셀을 고른다(CARD-02E로 배정). 값 종류별 기본 정렬도 아직 없다(CARD-02D로 배정). 이 때문에 R-08.22는 완료됨에서 부분 완료로 정정했다.

### CARD-02C 후속 배정 (2026-10-23, 문서 변경만)
- **포인트 모드 → CARD-02E:** 수식 편집 중 셀 클릭·드래그로 참조를 넣는 기능. 원문에 별도 항목은 없고 §8.1 "범위 선택"(R-08.02)을 수식 편집 상황으로 확장한 것이며, §7.1 "사용자가 해야 할 행동"(R-07.05)·"허용되는 입력"(R-07.06)에서 범위를 드래그해 함수 인수를 넣는 튜토리얼 단계의 전제다. 관련 엔진 요구사항(R-08.16 범위 참조, R-08.18 시트 간 참조)은 02B에서 완료됐다. 시트 탭(02D)과 참조 이동 로직(02E `referenceShift.ts`)이 함께 필요해 02D가 아니라 02E에 넣었다. R-08.02 담당에 CARD-02E를 더하고 부분 완료로 바꿨다.
- **셀 기본 정렬 → CARD-02D:** 숫자 오른쪽·문자열 왼쪽·논리값과 오류 가운데. 셀 서식(Phase 7)이 아닌 Excel 기본 표시이며 원문 Level 4 "데이터 형식 통일"(R-05.55)의 전제다. R-08.22(계산 결과 표시)의 남은 범위로 CARD-02D에 배정했고, CARD-02C 보고에서 완료로 적었던 R-08.22를 부분 완료로 정정했다.
- **CARD-02E 지침 정정:** "fast-check는 이 카드에서 설치"를 "CARD-02C에서 4.10.2로 설치, 그대로 사용"으로 고쳤다.

### CARD-02D (2026-10-23)
- **완료됨:** R-04.45, R-04.46, R-04.47, R-04.48, R-04.49, R-04.51, R-04.52, R-08.08, R-08.12, R-08.22
- **부분 완료 유지 (범위 추가):** R-04.43(실행 취소·다시 실행 버튼 추가, 진행 버튼은 03A), Q-04(Undo 50회 왕복 추가, 자동 채우기는 02E), Q-06(Ctrl+Z/Y 추가, 안내 패널 남음)
- **상태 변경 없음:** R-17.14(Undo)·R-17.15(워크시트 관리)는 담당이 "Phase 2 완료 게이트"이고 판정은 CARD-02E 이후다.
- **요구사항 ID 대응 (카드 본문 옛 ID):** `R-04.5-01`·`R-04.5-02` → R-04.45~R-04.53(MASTER_PROMPT §4.5, 02D 담당은 .45~.49·.51·.52. .50은 07B, .53은 07H), `R-17.2-01` → R-17.14·R-17.15(§17 Phase 2). 카드 본문에 현재 ID를 병기했다.
- **카드 본문에 없던 02D 담당 항목:** R-04.43 하단 실행 취소, Q-06 Ctrl+Z/Y, R-08.08·R-08.12(담당 02A, 비고로 02D에 넘어옴). 카드 본문에 추가했다.
- **사용자 결정 (2026-10-23):** 학습 파일 저장은 브라우저 저장(localStorage, 연습실 전용 키 `cellcraft.sandbox.files.v1`)과 JSON 파일 내려받기·올리기를 함께 제공한다.
- **설계 결정:**
  1. 모든 변경은 `WorkbookModel`(신규 `src/components/spreadsheet/workbookModel.ts`)이 만드는 historyManager 명령이다. 셀 입력은 이전·이후 원문만, 시트 구조 변경·통합 문서 교체는 전후 스냅샷을 기록한다. "다시 시작", 빈 스프레드시트, 샘플·파일 불러오기, 시트 삭제도 실행 취소할 수 있다(MASTER_PROMPT §9.2 "작성한 데이터를 무조건 삭제하지 않는다"). 기록 상한 100개를 넘으면 가장 오래된 기록만 버린다.
  2. 시트 구조 변경 뒤에는 원문에서 엔진을 다시 만든다(`FormulaEngineAdapter.loadSheets` 추가). HyperFormula 3.5.0에서 시트 삭제·재추가를 이어 쓰면 내부 의존 그래프가 깨지는 경우를 속성 테스트가 찾았기 때문이다.
  3. 속성 테스트가 찾은 엔진 버그 D-16(없는 시트를 가리키는 수식 덮어쓰기 예외)을 어댑터에서 회피했다. 02C부터 있던 문제로, `=Sheet9!A1`을 고쳐 쓰면 화면이 멈출 수 있었다.
  4. 시트 이름을 바꾸면 엔진이 다른 시트 수식의 시트 이름을 고쳐 쓰므로 그 셀의 원문도 엔진 수식으로 맞춘다.
  5. 따옴표 없는 한글 시트 이름 참조(`=자료!A1`)를 엔진이 읽지 못해(D-15) 수식 전처리에 따옴표 붙이기를 추가했다(`formulaPreprocess.ts`).
  6. 사이드바 "샌드박스"를 원문 용어 "연습실"로 바꾸고 링크로 되돌렸다. "학습"은 계속 준비 중이다.
  7. 연습실 화면은 수식 엔진을 포함해 커서 `routes.tsx`에서 따로 내려받는다(lazy). 첫 화면 번들은 207 kB로 유지되고, 연습실 청크(878 kB, 대부분 HyperFormula)는 `/sandbox`를 열 때만 받는다. 빌드는 이 청크에 대해 500 kB 경고를 낸다.
- **카드 미기재 추가·수정 파일:** `src/components/spreadsheet/workbookModel.ts`, `hooks/useWorkbook.ts`(여러 시트·실행 취소), `SpreadsheetGrid.tsx`(Ctrl+Z/Y), `src/engine/spreadsheet/FormulaEngineAdapter.ts`·`adapters/HyperFormulaAdapter.ts`(loadSheets, D-16), `formulaPreprocess.ts`(D-15), `src/pages/dev/WorkspaceHarnessPage.tsx`(하단 버튼), `src/app/routes.tsx`, `src/components/layout/AppSidebar.tsx`·`AppLayout.tsx`, `docs/EXCEL_DIFFERENCES.md`(D-15~D-17), `docs/TECHNICAL_DESIGN.md`(인터페이스). 테스트: `tests/unit/spreadsheet/workbookModel.test.ts`·`SheetTabs.test.tsx`, `tests/unit/pages/SandboxPage.test.tsx`, `tests/unit/helpers/layoutStubs.ts`, `tests/e2e/sandbox.spec.ts`, 기존 `useWorkbook.test.ts`·`formulaPreprocess.test.ts`·`formula-eval.test.ts`·`routes.test.tsx`·`routing.spec.ts`·`formula-bar.spec.ts` 갱신.
- **기존 테스트의 기대 변경 (약화 아님):** `useWorkbook.test.ts`의 "reset 후 loading"은 다시 시작이 동기 명령이 되어 "처음 데이터로 돌아가고 실행 취소로 직전 작업이 돌아온다"로 바꿨다. `routes.test.tsx`·`routing.spec.ts`의 "샌드박스는 준비 중" 단언은 연습실이 동작하게 되어 링크·화면 단언으로 바꿨고 "학습" 준비 중 단언은 유지했다.
- **알려진 한계:** 연습실 브라우저 저장은 이 브라우저에만 남는다(기기 간 동기화는 Phase 6). 시트 순서 바꾸기(탭 끌기)와 Ctrl+PageUp/PageDown 시트 이동은 없다. D-15·D-17의 Excel 동작은 골든 실측 전이다.


### CARD-02E (2026-10-23)
- **완료됨:** R-08.02(포인트 모드 잔여분), R-08.06, R-08.07, R-08.10, Q-04(세 불변식 모두)
- **완료됨 유지·담당 추가:** R-08.17(담당에 CARD-02E 추가, 복사·채우기·삽입·삭제 참조 이동)
- **부분 완료 유지 (범위 추가):** Q-06(Ctrl+C/X/V, Ctrl+D/R, 시트 이동 대체 단축키. 안내 패널과 실제 Chrome 수동 확인 남음)
- **Phase 2 완료 게이트(R-17.10~R-17.16) → 완료됨 (2026-10-24):** 처음 보고 때는 전체 `npm test`가 기기 성능 저하로 시간 초과해 판정을 보류했다. 연습실 라우트 테스트 두 건의 시간 제한을 고친 뒤(아래 후속 작업) 전체 `npm test`가 3회 연속 1180/1180으로 통과했고, 전체 Playwright 39/39·build도 통과해 각 행의 근거와 함께 완료로 판정했다.
- **요구사항 ID 대응:** 카드 본문 ID는 모두 현재 형식이라 바꿀 옛 ID가 없었다(MASTER_PROMPT §8.1·§8.2).
- **카드 본문에 없던 02E 담당 항목 (본문에 추가):** Q-06 새 단축키, R-17.10~R-17.16 판정, 연습실 파일의 열 너비·행 높이(`sandboxFileStore.ts`), 참조 색 토큰(`tokens.css`).
- **담당이 없던 항목 → 02E (사용자 승인 2026-10-23):** 시트 탭 순서 바꾸기(끌어 놓기 + 이동 버튼, 실행 취소), 시트 이동 단축키. Chromium 소스(`chrome/browser/ui/accelerator_table.cc` `kReservedCommandIds`)에서 Ctrl+PageUp/PageDown(`IDC_SELECT_*_TAB`)이 예약 단축키임을 확인해 대체 단축키 Ctrl+Shift+PageUp/PageDown(`IDC_MOVE_TAB_*`, 예약 아님)을 두고 시트 탭에 안내했다. Playwright는 CDP로 키를 페이지에 직접 넣으므로 E2E 통과는 브라우저가 키를 넘겨 준다는 증거가 아니다.
- **설계 결정:**
  1. 수식 참조 변환은 원문 토큰 변환(`operations/referenceShift.ts`)으로 하고 정규식 치환은 쓰지 않는다. F4·포인트 모드도 같은 토큰 읽기(`scanReferences`)를 쓰도록 `formulaReference.ts`를 바꿨다(기존 F4 테스트 14개 그대로 통과).
  2. 엔진 API(addRows·copy/paste) 대신 원문을 바꾸고 엔진을 다시 만든다(02D 설계 유지). HyperFormula API와 무작위 수식으로 맞대는 속성 테스트를 두었고, 엔진 copy/paste 버그 D-18을 찾았다(앱 영향 없음). 사라진 다른 시트 참조는 `#REF!`로 쓴다(D-19).
  3. 행·열 삽입·삭제와 잘라내기는 스냅샷 명령, 붙여넣기·채우기는 셀 입력 명령, 크기는 크기만 되돌리는 명령이다. 포인트 모드 이동은 실행 취소 대상이 아니다.
  4. 포인트 모드로 다른 시트 탭을 누르면 확정하지 않고 그 시트를 보여 주며 수식 입력줄에서 편집을 이어 간다. 탭을 누르는 순간 그 시트의 지금 활성 셀 참조를 넣고, 셀을 누르면 바꾼다. 확정·취소하면 처음 시트로 돌아간다.
  5. 조합 중 셀 클릭으로 편집이 확정되면 Chromium이 compositionend 없이 조합을 끝낸다는 것을 Playwright로 확인했다. 조합 표시가 켜진 채 남아 이후 Enter·화살표가 IME 몫으로 무시될 수 있는 문제(02A부터 잠재)를, 편집이 끝나면 조합 표시를 끄도록 고쳤다(`useImeInput.resetComposition`, `useCellEditing`).
- **Excel 실측 필요 항목:** EXCEL_DIFFERENCES "다음 골든 라운드 확인 목록" 10~14번(사라진 참조 표기, 삽입·삭제 범위 경계, 거꾸로 된 범위 표시, 잘라내기 참조 규칙, 자동 채우기 세부).
- **P-06 재측정:** 아래 후속 작업 참고. 원인을 고쳐 메인 스레드 비용은 main과 같아졌지만 휠 시나리오 통과는 아직 확인하지 못해 부분 완료로 바꿨다.
- **알려진 한계:** 포인트 모드 화살표 이동 시 화면 밖 셀로 자동 스크롤하지 않는다. 열 머리글 클릭(A:A 참조 넣기)은 포인트 모드가 아니라 확정·열 선택이다. 채우기 핸들 끌기 중 그리드 가장자리 자동 스크롤 없음. 행·열 숨기기는 없다.

### CARD-02E 후속 작업 (2026-10-24, 성능 저하·테스트 시간 초과)
- **사용자 보고:** 같은 노트북·같은 시간대 `npm run test:perf` 휠 스크롤이 main 59.4 FPS·최악 33.4ms(통과), feat/CARD-02E 55.0 FPS·최악 133.4ms(실패).
- **원인 조사:**
  1. main과 브랜치를 번갈아 3회씩 측정(수정 전): 휠은 main 58.5/58.7/58.8, 브랜치 58.7/58.1/58.7 FPS로 차이가 없었고, **PageDown은 브랜치만 3회 모두 55.0~55.1 FPS(드롭 5.5~7.4%)로 실패**했다(main 58.9~60.0, 통과).
  2. CDP `Performance.getMetrics`로 같은 스크롤 동안 메인 스레드 시간을 5회씩 쟀다(수정 전 중앙값): 휠 스크립트 main 204ms·브랜치 220ms, 연속 스크롤 스크립트 608ms·681ms, 레이아웃 273ms·299ms.
  3. 압축하지 않은 perf 빌드의 CPU 프로파일: 크기 계산(`buildOffsets`)이나 가상화 측정(`measure`)은 프레임마다 돌지 않았다. tanstack은 `count`·`paddingStart` 등이 바뀔 때만 측정 목록을 다시 만들고, `measure()`는 크기 키가 바뀔 때만 불린다. 기본 크기 행·열의 크기 조회는 Float64Array 읽기 두 번이다. 늘어난 것은 React 렌더·커밋 내부 함수였다.
- **고친 것 (원인):**
  1. `useFillHandle`이 콜백 ref를 의존성 없는 `useEffect`로 맞춰, 그리드가 커밋할 때마다(스크롤 프레임마다) React가 passive effect 비우기 작업을 따로 예약했다. 그리드의 다른 ref 동기화처럼 `useLayoutEffect`로 바꿨다.
  2. `GridOverlays`가 memo 없이 매 렌더 새 `geometry` 객체를 받아 스크롤마다 다시 그려졌다. memo와 고정 `geometry`, 선택이 바뀔 때만 바뀌는 `range`(`useCellSelection`)로 고쳤다.
  3. 머리글 칸 자식이 `[글자, false]` 배열이 되어 새 행이 생길 때마다 글자 노드 fiber를 만들었다. 크기 조절을 쓰지 않으면 글자 하나만 자식으로 둔다.
  4. 휠 스크롤 중 끄는 동작이 없으면 `mouseover`에서 DOM을 찾지 않고 바로 끝낸다. 크기 조절 ref 동기화를 기존 레이아웃 효과에 합쳤다.
- **수정 후 메인 스레드 비용 (중앙값):** 휠 스크립트 main 207.6ms·브랜치 206.6ms, 연속 스크롤 599ms·611ms(5회 범위 591~622 / 600~618로 겹침), PageDown 262ms·269ms. 레이아웃은 같다.
- **수정 후 FPS (번갈아 3회씩, 2026-10-24):** 처음 3회는 2회차부터 main까지 36~50 FPS로 떨어져(Windows Defender 서명 갱신 중) 비교할 수 없었다. 다시 잰 3회: 휠 main 48.9/51.7/57.0, 브랜치 49.4/54.5/52.7 FPS(둘 다 3회 실패, 최악 프레임 main 66.6/33.4/33.4ms·브랜치 49.9/33.4/33.4ms). PageDown main 60.0/60.0/60.0·브랜치 58.9/60.0/60.0(둘 다 통과), 연속 스크롤 main 59.7/60.0/60.0·브랜치 58.7/59.0/60.0(둘 다 통과). 수정 전 브랜치에만 있던 PageDown 실패는 사라졌다. 휠은 main도 실패하는 기기 상태라 이 코드에서 통과를 확인하지 못했다.
- **연습실 라우트 테스트 시간 초과:** `routes.test.tsx`의 연습실 두 테스트는 lazy 청크가 실제 `SandboxPage`로 이어지는지 확인하므로 모듈을 가짜로 바꾸지 않았다. 기다리는 것은 엔진 계산이 아니라 HyperFormula를 포함한 모듈의 첫 import다. 기존 `findByRole` 15초 대기가 vitest 기본 5초에 잘렸으므로 이 두 테스트에만 이유를 적은 20초 제한을 두었다. 단언과 전역 testTimeout은 바꾸지 않았다. 이후 전체 `npm test` 3회 연속 1180/1180 통과.

### CARD-03A (2026-10-24)
- **완료됨:** R-07.07, R-07.08, R-07.10, R-07.11, R-07.12
- **부분 완료 (각 행 상태 칸에 남은 범위 명시):** R-07.02, R-07.03, R-07.04, R-07.09 (스키마·러너까지 완료, 화면 표시는 CARD-03C). R-07.01, R-07.13은 CARD-03B에서 완료(R-07.13의 포커스 복귀는 03C 후속). R-07.05, R-07.06도 03B에서 감지·차단의 주 경로를 구현했으나 남은 범위(같은 셀 클릭, 실행 취소 버튼, 붙여넣기·채우기 차단)가 CARD-03D에 있어 부분 완료
- **요구사항 ID 대응:** 카드 본문 `R-07.1-01`→R-07.02~04, `R-07.1-02`→R-07.05~08, `R-07.1-03`→R-07.09~12 (MASTER_PROMPT §7.1). 추적표 배정이지만 본문에 없던 R-07.13도 다뤘다. R-07.01은 CARD-03B에서 완료.
- **콘텐츠 ID 체계:** courseId `level-{0..10}`, moduleId `MOD-L{00..10}-…`(CURRICULUM 형식). 대시보드 "이어서 학습하기" 경로를 `learnPath(courseIdForLevel(0))`로 바꿨다(경로 값은 `/learn/level-0`으로 동일).
- **출제기준 버전:** `src/types/examVersion.ts`의 `ExamVersionSchema`(`standard`/`2024-2026`/`2027-2029`)를 튜토리얼 정의에 넣었다. 문제 스키마(CARD-04A)도 같은 enum을 쓴다.
- **CURRICULUM 1.3 강제:** `src/content/contentLint.ts`가 문자열만으로 판정 가능한 5개 규칙(엔진 미지원 함수, INDEX 0, DATEDIF "YD", 지원 밖 TEXT 서식, `&`+나눗셈·소수 리터럴)을 검사하고 튜토리얼 정답 수식(`canonicalFormula`)에 적용한다. **강제하지 못하는 것:** 데이터 때문에 소수가 되는 값(AVERAGE 결과 등을 `&`로 잇는 경우), FILTER 빈 결과(D-12), UNIQUE 빈 셀(D-13)은 셀 데이터 계산이 필요해 CARD-04E의 엔진 실행 검증으로 넘긴다. `&` 규칙은 휴리스틱이다.
- **카드 원문과의 차이:** 추가 파일 `src/types/examVersion.ts`, `src/content/contentIds.ts`, `src/content/contentLint.ts`, `src/features/learning/context/useTutorial.ts`(hook/context 분리: react-refresh 규칙), 테스트 5개. XState는 쓰지 않고 순수 reducer로 구현(R-15.10). `zod` 4.6.5 고정(공개 2주 이상 지난 버전; 최신 4.6.7은 12일 전).
- **알려진 한계:** 그리드·입력줄에서 실제 조작을 감지해 `dispatch`하는 부분(03B), Spotlight·말풍선(03C), 효과(03D), 실제 튜토리얼 콘텐츠(04)는 없다. `/learn/:courseId`는 여전히 자리 화면이다.

### CARD-03C (2026-10-24)
- **완료됨:** R-07.14~R-07.22, P-04. CARD-03A 배정 부분 완료 행 R-07.02, R-07.03, R-07.04, R-07.09는 화면 표시까지 끝나 완료됨으로 바꿨다. R-07.13의 포커스 복귀 후속도 끝냈다.
- **요구사항 ID 대응:** 카드 본문 `R-01.0-03`→R-01.03(전체 공통 행이라 상태 유지), `R-07.2-01`~`05`→R-07.14~R-07.18 (MASTER_PROMPT §7.2). 추적표 배정이지만 본문에 없던 R-07.19(02A 기록의 `R-07.2-06`)~R-07.22도 다뤘다.
- **입력 설계 (§7.2 "오버레이가 실제 입력을 막아서는 안 된다"):** 오버레이 전체가 `pointer-events: none`·`aria-hidden`이다. 구멍 밖 클릭도 막지 않는다. 범위 끌기처럼 대상 밖 셀을 써야 하는 단계가 있고, 허용하지 않는 입력은 03B의 `inputGuard`가 실제 조작 단위로 막기 때문이다. 말풍선만 포인터를 받는다.
- **Esc 규칙 (사용자 결정 2026-10-24):** 스키마에 Esc 필드를 추가하지 않고 고정 규칙으로 정했다(R-07.22 행 참조).
- **모션 감소 (사용자 결정 2026-10-24):** `useMotionPreference`가 `prefers-reduced-motion`과 `<html data-motion="reduce">`를 함께 본다. `tokens.css`도 같은 속성에서 시간 토큰을 0으로 만든다. 설정 화면·저장, 전환 애니메이션 전반(R-07.23~31, P-03)은 계속 CARD-03D 담당이다.
- **카드 원문과의 차이:** 추가 파일 `src/components/tutorial/calloutPlacement.ts`(순수 위치 함수), `TutorialSpotlight.tsx`(단계→위치 연결·F6·자동 스크롤), `hooks/useMotionPreference.ts`, `tests/unit/components/SpotlightOverlay.test.tsx`, `tests/e2e/tutorial-spotlight.spec.ts`. 그리드 핸들에 `getCellAreaRect()`를 추가했다(`types.ts`·`useVirtualGrid.ts`·`SpreadsheetGrid.tsx`·`Spreadsheet.tsx`, 테스트 1건). 강조 사각형을 머리글 아래 셀 영역으로 자르는 데 쓴다. `/dev/tutorial`에 화면 밖 셀(L60) 단계를 더하고 왼쪽 패널을 단계 목록으로 바꿨다. 그래서 `tutorial-actions.spec.ts`의 단계 수 표기(1/4→1/5)와 마지막 진행이 바뀌었다. 같은 파일에서 '다음' 뒤 셀을 다시 클릭하던 우회를 없애고 포커스 확인을 넣었다.
- **알려진 한계:** 말풍선(최대 폭 22rem)은 대상 가까운 셀 몇 칸을 가릴 수 있다. 포인터는 말풍선이 받으므로 그 칸을 누르려면 그리드를 스크롤해야 한다. F6은 Chromium에서 예약 단축키가 아니라 페이지가 먼저 받지만, 다른 브라우저는 확인하지 않았다. 다른 시트 대상은 말풍선 안내만 하고 시트를 자동으로 바꾸지 않는다(E2E 없음, 개발 화면은 시트 1개).

### CARD-03D (2026-10-24)
- **완료됨:** R-03.03, R-07.06, R-07.23, R-07.25, R-07.31, P-03. **부분 완료:** R-07.05(서식 변경 남음), R-07.24·26·27·28(구현했으나 개별 자동 검증·시각 확인 없음), R-07.29·30(화면이 Phase 4에 생김). R-17.22는 Phase 3 완료 게이트 행이라 건드리지 않았다.
- **요구사항 ID 대응:** 카드 본문 `R-07.3-01~05`→R-07.23~R-07.31(전환 8종 + 방해 금지), `R-17.3-01`→R-17.22(게이트 행). 추적표 배정이지만 본문에 없던 R-03.03도 다뤘다.
- **실행 취소 (사용자 승인 필요 항목 → (a) 채택):** 스키마 변경 없이 `workbook.onUndone`이 실제 실행 취소 때 한 번 알리고 감지기가 `PRESS_KEY Ctrl+Z`로 환산한다. 키 입력 쪽 `keyPressed` 통지는 Ctrl+Z에서 뺐다(이중 통지 방지). `PRESS_KEY` 단계는 도구 모음 버튼으로 해도 통과한다.
- **Motion 라이브러리 미설치:** CSS keyframes와 기존 transition으로 충분해 설치하지 않았다. 카드의 `src/styles/motion.ts`는 `src/styles/motion.css`로 대체했다.
- **카드 원문과의 차이:** 추가 파일 `useReducedMotion.ts`와 함께 `motionSetting.ts`, `SettingsPage.tsx`(`/settings`, 사이드바 링크), `MotionWrapper.tsx`, 테스트 `CellPress.test.tsx`·`motionSetting.test.ts`·`motion.test.ts`·`settings-motion.spec.ts`. 개발 확인 화면에 `?scenario=03d` 시나리오를 더했고, 확인 화면의 실행 취소 버튼이 따로 보내던 `uiClicked`는 뺐다.
- **알려진 한계:** 테두리 구멍 좌표는 애니메이션하지 않고 새 위치에서 페이드인한다. 앱 설정은 '시스템 따르기/항상 줄이기' 두 가지뿐이라 OS가 줄이기를 켠 상태에서 앱에서 다시 켜는 선택은 없다.

### CARD-04A (2026-10-24)
- **완료됨:** R-06.01~R-06.19, R-09.01~R-09.14. **부분 완료:** S-04(공개용 뷰만. 시험 모드 분리는 CARD-07F), R-04.42(문제 조건·목표 필드만 제공, 화면 표시는 04C).
- **요구사항 ID 대응:** 카드 본문 `R-06.0-01~03`→R-06.01~R-06.19(MASTER_PROMPT §6), `R-09.0-01`→R-09.01~R-09.14(§9 문제 정의 14항목). 카드 본문 ID도 현재 ID로 병기했다. 추적표 배정이지만 본문에 없던 R-06.04~19, R-09.02~14를 다뤘다.
- **범위 결정:** 사용자 요청의 5가지 판정·Q-02 교란·엔진 어댑터 재사용·D항목 회피·오답 피드백은 추적표상 **CARD-04B** 배정(R-09.15~26)이다. 04A는 04B가 쓸 *데이터*만 스키마로 준비했다: 판정 코드 enum(`GRADING_DIAGNOSES`), 교란 3종(더하기·빈 행 삽입·배율)을 모두 요구하는 `perturbations`, 판정 코드별 대표 오답 `misconceptions`(입력+이유, ≥2·서로 다른 코드). 채점기·교란 적용은 만들지 않았다. 교란 후 기대값은 04B가 `canonicalFormula`를 엔진 어댑터로 재계산해 얻는다.
- **카드 원문과의 차이:** 추가 파일 `src/content/courses/level0.ts`·`index.ts`, `tests/unit/grading/problemFixtures.ts`. `src/content/contentIds.ts`에 `ProblemIdSchema`(`PRB-L03-SUM-01` 형식)·`levelOfProblemId`를 추가했다.
- **교란 규칙 수정 (사용자 지시, 커밋 전):** 처음엔 교란 값·범위를 정수로 제한했으나 소수 데이터 문제(Level 3 ROUND, 단가·비율·평균)를 만들 수 없어 고쳤다. D-9는 숫자를 글자로 이을 때의 한계라 숫자 계산·비교에는 해당하지 않는다. 지금은 소수 데이터도 더하기·배율 교란을 허용하고(더할 값은 데이터 소수 자릿수 이하, 배율은 정수), 정답 수식이 숫자를 글자로 바꿀 때만(`contentLint.convertsNumbersToText`) 소수 교란을 막는다. 숫자 비교는 15자리 유효숫자(`resultsMatch`)이며 기준은 TEST_STRATEGY Q-02에 적었다.
- **알려진 한계:** 로더는 클라이언트 번들에서 문제 전체를 읽으므로 `toPublicProblem`은 화면 전달 경계일 뿐 네트워크 수준의 정답 보호가 아니다(S-04 나머지는 07F). `&`와 소수 조합은 `lintFormula`의 `AMPERSAND_DECIMAL` 규칙과 `convertsNumbersToText`가 막는다. 교란 결과 재검증은 04B.
