# ADR-002: 스프레드시트 UI 그리드 구현 전략 (Grid UI Strategy)

- **문서 번호:** ADR-002
- **상태:** 승인 권고 (Recommended for Implementation)
- **작성일자:** 2026-10-22
- **작성자:** 수석 소프트웨어 아키텍트

---

## 1. 배경 및 맥락 (Context)

`docs/MASTER_PROMPT.md` 제3장, 제8장 및 본 보강 지침에 따라, 브라우저에서 실제 Excel과 유사한 셀 조작 환경(셀 선택, 범위 드래그, 인라인 편집, 수식 입력줄 연동, 행/열 헤더, 가상 스크롤, 키보드 단축키)을 제공하는 UI 컴포넌트가 필요하다.
또한, **제7장 튜토리얼 엔진의 Spotlight 오버레이**가 특정 셀(예: B2) 또는 셀 범위(B2:B7)를 화면상에 정확히 강조(Highlight)하기 위해서는, **가상화된 셀의 좌표를 뷰포트 기준 화면 절대 좌표(`DOMRect`)로 즉시 변환하는 API**가 필수적이다.

---

## 2. 후보군 분석

| 평가 기준 | 후보 1: Handsontable | 후보 2: FortuneSheet | 후보 3: 자체 React 가상 그리드 (TanStack Virtual) |
| :--- | :--- | :--- | :--- |
| **라이선스** | **독점 상용 (개발자당 연 $900+)** / 비영리 평가 한정 | MIT License | **MIT License (완전 자유)** |
| **상업 배포 가능성** | 상업적 배포 시 결제 필수. 무단 사용 금지. | 가능 | **완전 자유 (영구적 리스크 0)** |
| **번들 크기** | 무거움 (> 600KB) | 매우 무거움 (> 1MB, 자체 CSS 과다) | **매우 가벼움 (~40KB)** |
| **UI 커스터마이징** | 튜토리얼 Spotlight 연동 시 DOM 해킹 필요 | 중국어 중심 주석, 내부 결합도 높아 커스텀 극히 어려움 | **Tailwind 기반 100% 완전 제어 가능** |
| **가상 스크롤 지원** | 내장 | 내장 (Canvas 기반) | **`@tanstack/react-virtual` 기반 행·열 2D 가상화** |
| **좌표 변환 API** | 복잡한 내부 인덱스 계산 필요 | 캔버스 좌표 역산 필요 | **`getCellViewportRect(row, col)` 공식 API 노출** |

---

## 3. 결정 사항 (Decision)

**자체 React 가상화 그리드(`SpreadsheetGrid`)를 구축하는 방안**을 채택한다.
- 라이브러리의 불투명한 상업적 제약 및 라이선스 위반 리스크를 원천 배제한다.
- 튜토리얼 Spotlight, 문제 조건 가이드, 오답 셀 하이라이트 애니메이션과의 유기적 결합을 위해 DOM 구조 및 좌표 계산 제어권을 완전히 확보한다.

---

## 4. 가상 그리드 핵심 아키텍처 및 좌표 변환 API 명세

### 4.1 가상 스크롤 (2D Virtualization)
- `@tanstack/react-virtual`을 활용하여 수직(행) 및 수평(열) 양방향 가상화를 적용한다.
- 10,000행 × 100열의 대규모 데이터셋에서도 DOM 노드 수를 뷰포트 가시 범위(약 40행 × 15열 = 600개 노드)로 엄격히 제한하여 60fps 렌더링을 보장한다.

### 4.2 선택 모델 (Selection Model)
- **Primary Selected Cell (활성 셀):** `{ row: number, col: number }`
- **Selection Range (선택 범위):** `{ startRow, startCol, endRow, endCol }`
- 마우스 드래그 및 `Shift + 화살표`를 통한 다중 셀 범위 확장을 지원한다.

### 4.3 튜토리얼 Spotlight 연동 좌표 변환 API

Spotlight 오버레이는 가상화로 인해 해당 셀이 현재 뷰포트에 렌더링되어 있지 않을 경우, 해당 셀 위치로 자동 스크롤(Auto-scroll into view)한 뒤 정확한 화면 좌표를 반환해야 한다.

```typescript
// src/components/spreadsheet/types.ts

export interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SpreadsheetGridHandle {
  // 특정 셀로 뷰포트 자동 스크롤
  scrollToCell: (row: number, col: number) => void;
  
  // 가상화 상태를 고려한 셀의 화면 절대 좌표(DOMRect) 반환
  getCellViewportRect: (row: number, col: number) => ViewportRect | null;
  
  // 범위의 화면 절대 좌표 반환 (Spotlight 박스 렌더링용)
  getRangeViewportRect: (startRow: number, startCol: number, endRow: number, endCol: number) => ViewportRect | null;
  
  // 수식 입력줄 DOM 요소 참조 반환
  getFormulaBarRect: () => ViewportRect | null;
  
  // 셀 선택 강제 설정
  selectCell: (row: number, col: number) => void;
  
  // 인라인 편집 모드 진입
  startEditing: (initialChar?: string) => void;
}
```

---

## 5. 파급 효과 및 검증 (Consequences & Verification)

- **긍정적 효과:**
  - 외부 라이브러리 라이선스 비용 0원.
  - 가상화 셀과 튜토리얼 오버레이 간의 픽셀 단위 동기화 보장 (스크롤 및 리사이즈 시 오차 0px).
  - 디자인 시스템(Tailwind CSS 토큰)과의 완벽한 일체감 유지.
- **구현 부담 및 대응:**
  - 키보드 이동(`Tab`, `Enter`, 화살표, `F2`)과 한글 조합(`isComposing`) 처리를 직접 구현해야 하므로, 카드 `CARD-02A`에서 전용 키보드 이벤트 머신을 구축하고 단위/통합 테스트를 철저히 작성한다.

