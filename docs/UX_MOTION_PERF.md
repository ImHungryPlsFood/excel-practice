# CELLCRAFT 사용자 경험, 모션 및 성능 설계서 (UX_MOTION_PERF)

- **문서 버전:** 1.0.0
- **작성일자:** 2026-10-22
- **작성자:** 수석 프로덕트 디자이너 & 프런트엔드 성능 아키텍트
- **상태:** 확정 (Approved for Implementation)

---

## 1. 개요

CELLCRAFT의 인터페이스는 화려한 시각 효과로 사용자의 주의를 흩뜨리지 않고, 실제 Microsoft Excel을 다루는 듯한 높은 생산성 도구의 조작감과 Duolingo/Chess.com의 명료한 인터랙티브 가이드를 결합하는 것을 최우선 목표로 한다.
모든 움직임(Motion)은 사용자의 시선을 다음 행동(Next Action)으로 유도하는 인지적 목적(Cognitive Purpose)만을 위해 사용된다.

---

## 2. 성능 및 모션 상세 명세 (P-01 ~ P-06)

### [P-01] 웹 성능 예산 (Core Web Vitals Targets)
공식 `web.dev` 권장 기준을 프로젝트의 엄격한 성능 예산(Performance Budget)으로 설정한다:

| 메트릭 지표 | 목표 임계치 (Good) | 측정 방법 및 검증 도구 | 최적화 전략 |
| :--- | :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | **2.5초 이하** (데스크톱) | Lighthouse CI, Chrome DevTools | 스프레드시트 초기 셸(Shell) 즉시 렌더링, 무거운 엔진 지연 로딩 |
| **INP (Interaction to Next Paint)** | **200밀리초 이하** | `web-vitals` 라이브러리 실측 | 셀 타이핑 입력과 화면 렌더링 분리, 비동기 수식 계산 |
| **CLS (Cumulative Layout Shift)** | **0.1 이하** | Playwright 레이아웃 시프트 측정 | 그리드 헤더, 수식입력줄, 사이드바 영역 고정 치수(Fixed Dimension) 할당 |

- **CI 성능 감시:** Lighthouse CI를 GitHub Actions에 통합하여 프로덕션 빌드 시 성능 점수 90점 미만 시 배포 경고.

### [P-02] 지연 로딩 및 코드 분할 (Lazy Loading & Code Splitting)
초기 번들 크기를 300KB(gzip) 이하로 억제하기 위해 다음 모듈을 동적 임포트(`React.lazy`, dynamic `import()`)로 분리한다:
1. **수식 계산 엔진 (HyperFormula / IronCalc WASM):** 첫 튜토리얼 화면 진입 시 비동기 백그라운드 프리페치(Prefetch).
2. **XLSX 입출력 모듈 (SheetJS):** 연습실의 '파일 가져오기/내보내기' 모달 열림 시 로드.
3. **차트 시각화 엔진 (Recharts 또는 Canvas 차트):** Level 5 차트 단원 진입 시 로드.
4. **고급/자격증 교육과정 데이터:** Level 6~10의 대용량 문제 데이터셋 및 해설 JSON은 해당 레벨 선택 시 청크(Chunk) 단위로 로드.

### [P-03] 애니메이션 원칙 및 디자인 토큰 (Motion Principles & Tokens)
- **레이아웃 흔들림(Layout Thrashing) 절대 금지:** `width`, `height`, `top`, `left`, `margin`, `padding`을 변경하는 트랜지션을 전면 금지하며, 오직 GPU 가속이 가능한 **`transform`과 `opacity`**만 조작한다.
- **모션 디자인 토큰 (CSS Variables & Tailwind Config):**
  - `--motion-duration-instant`: `100ms` (셀 포커스 이동, 클릭 피드백)
  - `--motion-duration-fast`: `200ms` (툴팁 노출, 버튼 호버)
  - `--motion-duration-normal`: `300ms` (Spotlight 위치 이동, 말풍선 전환)
  - `--motion-duration-slow`: `450ms` (대시보드 뷰 전환, 모달 등장)
  - `--motion-ease-out`: `cubic-bezier(0.16, 1, 0.3, 1)` (자연스러운 감속 스프링)
  - `--motion-ease-in-out`: `cubic-bezier(0.4, 0, 0.2, 1)` (위치 이동)
- **접근성 및 모션 감소 지원:**
  - 미디어 쿼리 `@media (prefers-reduced-motion: reduce)` 감지 시 모든 전환 시간을 `0.001ms`로 강제 축소.
  - 앱 설정 메뉴에 "화면 애니메이션 줄이기" 토글을 제공하여 OS 설정과 무관하게 사용자가 모션을 끌 수 있도록 지원.

### [P-04] Spotlight 오버레이 정밀 위치 계산 및 충돌 방어
- **Spotlight 동작 원리:**
  - SVG `mask` 또는 `clip-path`를 사용하여 강조 대상 영역만 투명하게 뚫고 주변 배경을 어둡게 처리 (`rgba(15, 23, 42, 0.65)`).
  - 포인터 이벤트: 오버레이 자체는 `pointer-events: none`을 유지하고, 강조된 셀/영역에만 `pointer-events: auto`를 부여하여 사용자가 직접 셀을 클릭하고 입력할 수 있게 함.
- **동적 동기화 메커니즘:**
  - `ResizeObserver` 및 그리드 스크롤 이벤트 리스너를 결합하여 화면 크기 변경이나 스크롤 시 강조 박스와 말풍선의 위치를 오차 없이 추적.
  - 가상 스크롤로 인해 강조 셀이 화면 밖으로 나가는 경우, 부드러운 스크롤(`scrollToCell`)을 선행한 후 좌표를 재계산.
- **말풍선(Callout) 가장자리 충돌 방어 (Collision Detection):**
  - 계산된 말풍선 위치가 뷰포트 경계(상/하/좌/우 마진 16px)를 벗어날 경우, 위치를 자동으로 반전(Flip: `bottom` -> `top`, `right` -> `left`)하여 말풍선이 절대 잘리지 않도록 보장.

### [P-05] 3계층 입력 반응성 아키텍처 (Input Responsiveness)
사용자가 셀을 빠르게 타이핑할 때 UI가 버벅이지 않도록 3개 계층으로 책임을 분리한다:

```
[사용자 키 입력]
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 1계층: UI 상태 즉시 반영 (동기식, 0ms)                   │
│ - 로컬 React state(cellDraft) 갱신 및 폰트 렌더링       │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 2계층: 수식 연산 및 의존성 재계산 (비동기 Microtask/Worker)│
│ - 수식 계산 엔진 트리거                                  │
│ - 채점 엔진 검증 (Validating...)                       │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 3계층: 영속화 저장 (Debounced, 1,000ms 지연)           │
│ - localStorage 임시 캐시 및 Firestore 비동기 저장      │
└────────────────────────────────────────────────────────┘
```

### [P-06] 대규모 데이터 가상 스크롤 성능 벤치마크
- **성능 목표:**
  - 10,000행 × 100열 (총 1,000,000개 셀 데이터셋) 로드 상태에서 스크롤 시 **초당 60프레임(60 FPS) 유지** 및 렌더링 드롭 프레임(Dropped Frame) 5% 미만.
- **측정 테스트 자동화:**
  - Playwright 성능 테스트 스크립트(`tests/perf/virtual-scroll.perf.ts`)를 작성하여, 마우스 휠 및 페이지 다운 스크롤 시 프레임 레이트를 측정하고 성능 예산 위반 시 빌드를 차단.

