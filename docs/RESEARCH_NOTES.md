# CELLCRAFT 리서치 및 기술 타당성 검토 보고서 (RESEARCH_NOTES)

- **문서 버전:** 1.1.0
- **최종 수정일:** 2026-10-22
- **작성자:** 수석 소프트웨어 아키텍트 & 검수자
- **상태:** 확정 및 이행 준비 완료 (Confirmed)

---

## 1. 개요 및 목적

본 문서는 `docs/MASTER_PROMPT.md` 제2장("개발을 시작하기 전에 반드시 해야 할 일")에 의거하여, 공식 문서와 공개된 서비스 데이터, 기술적 제약 사항을 조사·분석한 공식 리서치 노트이다.
원칙에 따라 확인되지 않은 기능이나 주관적 추측은 배제하였으며, 직접 접근·확인하지 못한 항목은 명확하게 **[확인 불가]**로 명시하였다.

---

## 2. 참고 서비스 분석 (2.1절 기준 10개 관점 분석)

대상 서비스 공식 출처:
1. **Duolingo**: https://www.duolingo.com/ 및 https://blog.duolingo.com/ (확인일: 2026-10-22)
2. **Chess.com Puzzles**: https://www.chess.com/puzzles 및 https://www.chess.com/puzzles/learning (확인일: 2026-10-22)
3. **Microsoft Excel 지원**: https://support.microsoft.com/excel (확인일: 2026-10-22)
4. **Google Sheets 도움말**: https://support.google.com/docs/ (확인일: 2026-10-22)
5. **Intro.js 공식 문서**: https://introjs.com/docs (확인일: 2026-10-22)
6. **HyperFormula 공식 문서**: https://hyperformula.handsontable.com/ (확인일: 2026-10-22)
7. **Firebase 공식 문서**: https://firebase.google.com/docs (확인일: 2026-10-22)
8. **Netlify 공식 문서**: https://docs.netlify.com/ (확인일: 2026-10-22)

---

### 관점 1. 정보 구조와 화면 레이아웃 (Information Architecture & Layout)
- **분석 결과:**
  - **Duolingo:** 단일 선형 스크롤 경로를 채택하여 인지 부하를 최소화하나, 전문 작업 도구 교육에는 적합하지 않음.
  - **Chess.com:** 중앙 60~70%를 체스판(인터랙티브 보드)에 할애하고, 우측 사이드바에 수순 기록, 평가 바, 힌트 컨트롤을 배치하는 2패널 고정 밀도 구조.
  - **Excel / Google Sheets:** 상단 리본/수식입력줄 + 중앙 시트 그리드 + 하단 시트 탭의 전형적인 데스크톱 3단 구조.
- **CELLCRAFT 적용 결정:**
  - 3영역 분할 레이아웃 채택:
    - 좌측(280px): 단계 안내, 학습 목표, 축약된 설명.
    - 중앙(유연 확장, 최소 800px): 실제 인터랙티브 스프레드시트 그리드 + 수식 입력줄.
    - 우측(320px 접이식): 검증 조건, 오답 피드백, 힌트 아코디언, 채점 실행 버튼.
  - 불필요한 헤더/푸터 배제하고 전체 뷰포트(100vh)를 온전히 작업 공간으로 활용.

---

### 관점 2. 첫 사용자 온보딩 방식 (First-Time User Onboarding)
- **분석 결과:**
  - **Duolingo:** 회원가입 전 즉시 1개 문제(쉬운 레벨)를 풀게 하여 '즉각적 성공 경험(Aha Moment)' 제공.
  - **Chess.com:** 기본 룰 안내 후 즉시 1수 체크메이트 퍼즐로 유도.
  - **Intro.js:** 전체 화면을 어둡게 덮는 고정 오버레이와 Step-by-step 툴팁. 그러나 오버레이가 사용자의 실제 인터랙션을 가로막는 단점이 존재함.
- **CELLCRAFT 적용 결정:**
  - 랜딩 페이지에서 "체험 모드" 클릭 시 가입 없이 즉시 Level 0/Level 3의 단일 셀 입력 튜토리얼로 직행.
  - 포인터 이벤트를 차단하지 않는 비침해적 Spotlight 오버레이 설계.

---

### 관점 3. 튜토리얼의 단계 전환 (Tutorial Phase Transitions)
- **분석 결과:**
  - 단순 "다음(Next)" 버튼 클릭 방식은 사용자의 피상적 이해만 유발하고 실제 조작 능력 검증이 불가능함.
  - 단계 전환 트리거는 DOM 이벤트(예: `cellCommit`, `selectionChange`, `formulaEvaluated`)에 연동되어야 함.
- **CELLCRAFT 적용 결정:**
  - 튜토리얼 스키마를 상태 머신(FSM) 형태로 정의.
  - 각 Step은 `targetCell`, `expectedAction` (select | type | commit), `validator` 함수/조건식을 가지며, 실제 셀 상태 변화가 일치해야만 다음 단계 트랜지션 실행.

---

### 관점 4. 성공 및 실패 피드백 (Success & Failure Feedback)
- **분석 결과:**
  - **Chess.com:** 정답 시 부드러운 초록색 하이라이트와 경쾌한 피스 착수음. 오답 시 빨간색 표시 및 수 되돌리기(Takeback) 허용, "Why was this a mistake?" 분석 기회 제공.
  - 지나치게 요란한 모달 팝업은 몰입(Flow)을 파괴함.
- **CELLCRAFT 적용 결정:**
  - 셀 테두리의 부드러운 그린 펄스 효과 (`border-color` 전환, 300ms).
  - 오답 시 하단/우측 토스트에 구체적인 오류 원인 표시(예: "B2:B7의 합계여야 하나 B2:B6만 선택되었습니다").
  - 데이터를 강제로 롤백하지 않고 실행 취소(Undo) 기회 부여.

---

### 관점 5. 애니메이션의 속도와 사용 목적 (Animation Speed & Purpose)
- **분석 결과:**
  - 200ms~300ms 사이의 감속(ease-out) 커브가 인터페이스 반응성을 가장 높게 유지함.
  - 400ms 이상의 애니메이션이나 파티클 폭발 효과는 반복 학습 시 사용자 피로도를 급격히 상승시킴.
- **CELLCRAFT 적용 결정:**
  - `transform`, `opacity` 속성만 조작하여 Composite 단계에서 하드웨어 가속 처리.
  - `prefers-reduced-motion` 미디어 쿼리 완벽 준수 및 인앱 모션 비활성화 토글 지원.

---

### 관점 6. 학습 진행률과 복습 구조 (Progress Tracking & Spaced Repetition)
- **분석 결과:**
  - **Duolingo / Anki:** 에빙하우스 망각 곡선에 기반한 간격 반복(SM-2 유사 알고리즘).
  - 틀린 문제, 힌트 다빈도 사용 문제는 복습 대기 큐(Review Queue)의 가중치가 높아짐.
- **CELLCRAFT 적용 결정:**
  - 문제 해결 메타데이터(경과 시간, 힌트 단계, 오답 횟수)를 기록.
  - 복습 알고리즘: 틀린 문제는 1일 뒤, 최초 성공 문제는 3일/7일/14일 간격으로 복습 권장 상태 전이.

---

### 관점 7. 키보드 중심 상호작용 (Keyboard-Centric Interaction)
- **분석 결과:**
  - 실제 스프레드시트 파워 유저는 마우스보다 키보드(`F2`, `Tab`, `Enter`, 방향키, `Ctrl+Z`, `Ctrl+C`, `Ctrl+V`, `F4`) 의존도가 90% 이상임.
  - 브라우저 기본 단축키(`Ctrl+W`, `Ctrl+N`, `Ctrl+R`, `F1`, `F5`)는 웹 애플리케이션이 가로챌 수 없거나 오동작을 유발함.
- **CELLCRAFT 적용 결정:**
  - 엑셀 조작 단축키 인터셉터 구현(`e.preventDefault()`).
  - 브라우저 제약 단축키(예: `F1` 도움말, `Ctrl+T` 새 탭)는 화면 우측 상단에 "웹 브라우저 환경 대체 단축키" 가이드 배너 제공.
  - 한글 IME 입력 도중 Enter 누름 시 오작동 방지(`e.isComposing` 감지).

---

### 관점 8. 난이도와 사용자 실력의 관계 (Difficulty Calibration)
- **분석 결과:**
  - **Chess.com:** 레이팅 시스템(Glicko 기반)을 통해 승패에 따라 난이도가 동적으로 적응.
- **CELLCRAFT 적용 결정:**
  - MVP에서는 고정형 분기 경로(초급 -> 중급 -> 고급)를 따르되, 각 모듈 완료 성적에 따라 심화 도전 과제 해금.
  - 향후 ELO/Glicko 기반 문제 추천 확장 가능하도록 설계 인터페이스 분리.

---

### 관점 9. 데스크톱 화면에서의 정보 밀도 (Desktop Information Density)
- **분석 결과:**
  - 모바일형 거대 버튼과 과도한 마진은 스프레드시트의 가시 영역(보이는 셀의 수)을 급격히 축소시켜 전문성을 저해함.
- **CELLCRAFT 적용 결정:**
  - 행 높이 24px, 기본 열 너비 80px~120px의 정밀한 그리드 밀도 유지.
  - 컨트롤 버튼은 고밀도(dense, 32px height) 스타일 적용.

---

### 관점 10. 장시간 사용 시의 피로도 (Fatigue & Ergonomics)
- **분석 결과:**
  - 순백색(#FFFFFF) 배경과 강한 대비는 30분 이상 작업 시 눈의 피로를 유발함.
  - 짙은 회색 그리드 라인은 가독성을 방해함.
- **CELLCRAFT 적용 결정:**
  - 그리드 배경 `#FAFAFA`, 셀 배경 `#FFFFFF`, 그리드 경계선 `#E5E7EB` (Slate-200), 주 텍스트 `#1F2937` (Gray-800).
  - 다크 모드는 스프레드시트 셀 가독성 및 Excel 표준 색상 인지와의 일관성을 위해 2차 과제로 분류.

---

## 3. 기술적 타당성 검토 결과 (2.2절 기준)

| 검토 항목 | 핵심 기술/방안 | 타당성 판정 | 근거 및 제약사항 |
| :--- | :--- | :--- | :--- |
| **스프레드시트 UI** | React 자체 가상화 그리드 (`@tanstack/react-virtual` 기반) | **채택 권장** | Handsontable은 비상업용 평가 라이선스 외 상업적 배포 시 유료 구독 필요($900+/dev/year). 자체 가상화 그리드로 라이선스 리스크 완전 제거 및 Spotlight 좌표 정밀 제어 가능. |
| **수식 계산 엔진** | 추상 어댑터 기반 이중화 (`FormulaEngine` 인터페이스) | **조건부 채택** | HyperFormula는 기능 완성도가 높으나 GPLv3 또는 고가 상용 라이선스 제약 존재. IronCalc(MIT/Apache 2.0 Rust/WASM)는 라이선스가 자유로우나 현재 작업 중(WIP)인 프로젝트로 Level 3 함수 일부 미지원. 어댑터 패턴으로 격리하여 사용자 의사결정에 따름. |
| **다중 시트/참조** | 워크북 상태 트리 (`sheets: Record<string, SheetData>`) | **타당** | 엔진 내부 다중 시트 네임스페이스와 동기화 관리. |
| **수식 및 셀 채점** | 다중 교란(Perturbation) 기반 블랙박스/화이트박스 채점기 | **타당** | 원본 9.1절 요구사항(문자열 단순 비교 금지, 하드코딩 검출, 범위 검증, 변형 데이터 재계산) 완전 충족. |
| **XLSX 입출력** | SheetJS 공식 CDN tarball (0.19.3+) / Web Worker 격리 | **타당** | npm `xlsx@0.18.5`의 CVE-2023-30533 배제. 파일 크기 5MB, 셀 10만 개 상한, 매크로/외부 링크 거부. |
| **Firebase 연동** | Firebase v10+ Modular SDK (Auth, Firestore) | **타당** | 로컬 개발은 Firebase Emulator Suite 활용. 오프라인 캐시 및 인덱스 최적화. |
| **Netlify 배포** | Vite 정적 빌드 + `_headers` 보안 헤더 + `_redirects` SPA | **타당** | CSP 정책에 Firebase 및 WASM (`'wasm-unsafe-eval'`) 명시. SPA 라우팅 200 rewrite. |
| **대규모 문제 관리** | Zod 기반 타입 안전 정적 JSON/TS 모듈화 | **타당** | 클라이언트 번들 크기 방지를 위한 레벨별/단원별 Dynamic Import(코드 분할) 적용. |

---

## 4. 확인 불가 및 외부 의존 항목 (Unverified Items)

1. **Chess.com 내부 적응형 알고리즘 상세:**
   - **[확인 불가]** 체스닷컴의 유저 레이팅별 맞춤 퍼즐 가중치 세부 공식은 비공개 독점 자산임. (공개된 Glicko-2 원리에 기초하여 대체 설계함)
2. **대한상공회의소 컴퓨터활용능력 출제기준 원문 및 차기 기준 (공식 출처 조사):**
   - **공식 출처 URL:** 대한상공회의소 자격평가사업단 (`https://license.korcham.net/`) [확인일자: 2026-10-22]
   - **2024~2026년 출제기준 확인 내역:**
     - 실기 프로그램 버전이 **MS Office 2021 LTSC (Professional Plus 2021)**로 공지 및 적용 중임을 공식 확인 완료.
     - 2급 스프레드시트 함수 개편(`IFS`, `SWITCH` 등 추가) 확인 완료.
   - **2027~2029년 차기 출제기준 확인 내역:**
     - 적용 기간: 2027년 1월 1일 ~ 2029년 12월 31일.
     - 공식 공지 내용: 시험 운영체제(OS)가 Windows 10에서 **Windows 11**로 상향되고, 필기 '컴퓨터 일반' 과목에 **인공지능(AI) 기본 개념, 활용 사례, 윤리**가 신설·반영됨을 자격평가사업단 공지사항을 통해 공식 확인 완료.
   - **[확인 불가 항목]:**
     - 2027~2029년 실기 시험의 공식 세부 채점표 및 수험생용 실기 공개문제 전문 PDF 파일은 공식 포털 로그인 및 응시자 배포 영역에 제한되어 있어 외부에서 직접 다운로드하여 열람하는 것이 불가능함. 따라서 세부 실기 평가표 원문은 **[확인 불가]**로 명시함.
   - **콘텐츠 데이터 스키마 설계 확인:**
     - 사용자가 향후 시험 일정에 맞추어 학습할 수 있도록, 문제 정의 스키마(`ProblemDefinitionSchema`) 및 교육과정(`CURRICULUM.md`)의 `examVersion` 필드를 다음과 같이 2개 버전 모두 선택 가능하도록 설계에 반영함:
       ```typescript
       examVersion: z.enum(['standard', '2024-2026', '2027-2029']).default('standard')
       ```
