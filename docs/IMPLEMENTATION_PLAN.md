# CELLCRAFT 단계별 구현 계획서 (IMPLEMENTATION_PLAN)

- **문서 버전:** 1.0.0
- **작성일자:** 2026-10-22
- **작성자:** 수석 프로젝트 매니저 & 테크 리드
- **상태:** 확정 (Baseline Approved)

---

## 1. 구현 로드맵 및 MVP 범위 확정

### 1.1 최우선 개발 원칙 (제20장 핵심 지침)
> **"처음부터 모든 함수, 모든 자격증 문제, 모든 고급 기능을 구현할 필요는 없다. 가장 먼저 완성해야 하는 것은 하나의 개념을 설명하고, 실제 스프레드시트에서 직접 연습하고, 정답을 검증하고, 오답을 수정한 뒤, 다음 문제로 자연스럽게 넘어가는 완전한 학습 경험이다."**

### 1.2 MVP(Minimum Viable Product) 범위 확정
- **MVP 포함 범위:** **Phase 1부터 Phase 5까지의 전체 기능 및 Phase 6(Firebase Auth/Firestore 기본 연동)**
  - 사용자가 랜딩 페이지에서 대시보드로 진입하여,
  - 실제 셀 편집과 수식 계산이 가능한 스프레드시트에서,
  - Spotlight 오버레이의 안내를 받아 직접 셀을 입력하고,
  - 교란 검증 기반 채점기로 정답/오답(하드코딩 방지) 피드백을 받고,
  - 최소 10개의 검증된 기초 문제(Level 0~3)를 완주하며 경험치(XP)와 업적을 획득하고 진도를 저장할 수 있는 상태.
- **MVP 이후 확장 범위 (Phase 7):**
  - Level 4~10 대규모 콘텐츠 확장, XLSX 파일 입출력 파이프라인, 고급 차트 렌더링, 컴활 1/2급 실기 모의시험, 복합 분석 도구(피벗 테이블) 등은 Phase 7로 배정하여 순차적 릴리즈.

---

## 2. Phase 1 ~ Phase 8 단계별 상세 계획 및 완료 조건

### Phase 1 — 프로젝트 기반 (Foundation)
- **주요 작업 내용:**
  - 프로젝트 디렉터리 구조 점검 및 초기화 (Node LTS, `package.json` name: `excel-practice`).
  - 핵심 기술 스택 설정 (React 18 + Vite + TypeScript Strict + Tailwind CSS).
  - 디자인 시스템 토큰 구축 (색상, 간격, 타이포그래피, 모션 지속시간).
  - 공통 UI 컴포넌트(Button, Card, Modal, Input, Badge, Toast, Tooltip) 구현.
  - React Router 기반 SPA 라우팅 경로 구성 (`/`, `/dashboard`, `/learn/:courseId`, `/sandbox`).
  - 전문적인 랜딩 페이지 7대 필수 요소 구현.
  - 대시보드 9대 필수 정보 카드 레이아웃 구현.
- **완료 조건 (Definition of Done):**
  - `npm run typecheck`, `npm run lint`, `npm run build`가 0개의 에러로 통과하고 개발 서버(`npm run dev`)에서 랜딩 페이지와 대시보드가 정상 렌더링된다.

---

### Phase 2 — 실제 스프레드시트 (Core Spreadsheet)
- **주요 작업 내용:**
  - `FormulaEngineAdapter` 인터페이스 구현 및 엔진 연동 (ADR-001).
  - `@tanstack/react-virtual` 기반 2D 가상화 `SpreadsheetGrid` 컴포넌트 구현 (ADR-002).
  - 셀 선택(단일 셀, 범위 드래그, 키보드 화살표 이동) 모델 구축.
  - 인라인 셀 편집기 및 수식 입력줄(Formula Bar) 실시간 양방향 동기화.
  - 수식 입력 및 DAG 기반 의존성 재계산, 오류 코드(`#DIV/0!`, `#VALUE!`, `#REF!`) 전파.
  - 한글 IME 입력 처리(`isComposing` 감지)로 글자 중복 및 조합 오류 원천 차단.
  - 실행 취소(Undo) 및 다시 실행(Redo) 상태 히스토리 스택.
  - 최소 2개 이상의 워크시트 탭 전환 및 다중 시트 참조.
- **완료 조건 (Definition of Done):**
  - 브라우저 상에서 실제 셀을 클릭/키보드로 선택하여 데이터를 입력하고, `=SUM(A1:A5)`과 같은 수식이 즉시 정상 계산되며, Undo/Redo가 오차 없이 동작한다.

---

### Phase 3 — 튜토리얼 엔진 (Tutorial Engine)
- **주요 작업 내용:**
  - 선언적 단계 스키마(`TutorialStep`) 러너 및 상태 머신(FSM) 구축.
  - 비침해적 Spotlight 오버레이 (배경 암전 `rgba(15, 23, 42, 0.65)`, 포인터 이벤트 통과).
  - 가상화 셀 화면 절대 좌표 변환 API(`getCellViewportRect`) 연동 및 부드러운 스크롤 추적.
  - 설명 말풍선(Callout) 렌더링 및 뷰포트 가장자리 충돌 자동 반전(Flip) 로직.
  - 단계별 사용자 행동(셀 선택, 수식 입력, Enter 커밋) 이벤트 감지기.
  - 올바른 조작 시 부드러운 시각적 전환(Step Transition) 및 실패 시 친절한 재도전 유도.
  - `prefers-reduced-motion` 미디어 쿼리 및 인앱 모션 감소 토글 지원.
- **완료 조건 (Definition of Done):**
  - 설명창의 '다음' 버튼 클릭만으로는 진행되지 않으며, 사용자가 실제 지정된 셀에 수식을 올바르게 입력하고 Enter를 눌러야만 다음 단계로 전이되는 완전한 튜토리얼 플로우가 동작한다.

---

### Phase 4 — 문제와 채점 (Problems & Grading)
- **주요 작업 내용:**
  - `ProblemDefinition` Zod 스키마 정의 및 콘텐츠 로더 구현.
  - 초기 시트 상태 로드 및 읽기 전용 셀 범위 보호.
  - 데이터 교란 채점 엔진(`PerturbationScorer`) 구현 (숫자 하드코딩, 범위 오류, 절대참조 누락 구분).
  - 4단계 아코디언 힌트 시스템 (요청 시에만 단계별 공개).
  - 오답별 원인 진단 및 맞춤 피드백 토스트/패널 노출.
  - 문제 처음부터 다시 시작하기(Reset) 및 Undo 지원.
  - 문제 완료 결과 모달 (해설, 획득 XP, 다음 문제 이동 버튼).
  - **최소 10개의 검증된 기초 문제(Level 0~3) 콘텐츠 데이터셋 제작.**
- **완료 조건 (Definition of Done):**
  - 최소 10개의 기초 문제를 처음부터 끝까지 실제로 풀이할 수 있고, 대표 오답 및 하드코딩 입력 시 정확한 피드백과 함께 실패 처리되며, 기준 정답 입력 시 통과한다.

---

### Phase 5 — 학습 경로와 게임화 (Path & Gamification)
- **주요 작업 내용:**
  - 분기형 학습 경로(DAG) 인터랙티브 맵 렌더링.
  - 단원 노드 6대 상태(`LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`, `REVIEW_RECOMMENDED`, `MASTERED`) 관리.
  - 경험치(XP) 산정 및 레벨업 시스템.
  - 7대 핵심 업적(Achievement) 평가 및 획득 뱃지 시스템.
  - 일일 목표 및 연속 학습일(Streak) 달력 컴포넌트.
  - 에빙하우스 망각 곡선 기반 간격 반복(Spaced Repetition) 복습 큐.
- **완료 조건 (Definition of Done):**
  - 사용자가 첫 단원부터 마지막 문제까지 하나의 완전한 학습 여정을 완주하며, 진행률, 경험치, 업적이 로컬 상태에 일관되게 기록된다.

---

### Phase 6 — Firebase 연동 및 보안 (Firebase & Security)
- **주요 작업 내용:**
  - Firebase SDK v10+ 연동 (Authentication, Cloud Firestore).
  - 이메일/비밀번호 회원가입, 로그인, 비밀번호 재설정 및 로그인 없는 게스트 체험 모드 지원.
  - 사용자별 학습 진도, 연속 학습일, 풀이 이력 컬렉션 CRUD 연동.
  - Firestore 보안 규칙(`firestore.rules`) 작성 (Default Deny, 본인 소유권 강제, S-01~S-03).
  - Firebase Local Emulator Suite 기반 보안 규칙 자동화 테스트 스위트 통과.
  - 오프라인 상태 로컬 캐싱 및 네트워크 복구 시 자동 동기화.
- **완료 조건 (Definition of Done):**
  - 서로 다른 두 개의 테스트 계정으로 로그인했을 때 각자의 학습 진도가 완벽히 격리되고, 비인가된 Firestore 쓰기 시도가 규칙에 의해 100% 차단된다.

---

### Phase 7 — 확장 (Post-MVP Expansion)
- **주요 작업 내용:**
  - Level 4~7 중급/고급 함수 및 데이터 정리, 차트 모듈 순차 릴리즈.
  - Level 8 실무 캡스톤 프로젝트 11종 문항 구축.
  - Level 9 컴퓨터활용능력 1·2급 실기 모의시험 및 타이머 모드 (`examVersion: '2024-2026'` / `'2027-2029'`).
  - Level 10 대회형 타임어택 챌린지 및 수식 최적화 퍼즐.
  - SheetJS 기반 XLSX 파일 업로드/다운로드 격리 Web Worker 파이프라인 (ADR-003).
  - 피벗 테이블 및 What-if 시뮬레이션 인터페이스.
- **완료 조건 (Definition of Done):**
  - 확장된 각 기능이 단위/통합 테스트를 통과하고, 실제 구현된 범위에 한해서만 완료로 표시한다.

---

### Phase 8 — 배포와 최종 검수 (Deployment & Verification)
- **주요 작업 내용:**
  - 프로덕션 최적화 빌드 및 번들 크기 감사 (Vite code splitting).
  - Netlify 배포 (`netlify.toml` 헤더, CSP 정책, SPA 200 rewrite).
  - Core Web Vitals 성능 예산 검증 (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1).
  - 데스크톱 실기 브라우저(Chrome, Edge, Firefox, Safari) 호환성 및 크로스 브라우징 점검.
  - 키보드 내비게이션 및 스크린 리더 ARIA 접근성 감사.
  - `docs/EXCEL_DIFFERENCES.md` 및 최종 사용자 가이드 문서 완성.
- **완료 조건 (Definition of Done):**
  - Netlify 공개 URL에서 새로고침 시에도 오류 없이 핵심 학습 및 문제 풀이 전 과정이 100% 매끄럽게 동작한다.

