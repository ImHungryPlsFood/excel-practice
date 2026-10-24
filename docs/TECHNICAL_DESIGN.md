# CELLCRAFT 기술 아키텍처 및 상세 설계서 (TECHNICAL_DESIGN)

- **문서 버전:** 1.0.0
- **작성일자:** 2026-10-22
- **작성자:** 수석 시스템 아키텍트
- **상태:** 확정 (Baseline Approved)

---

## 1. 시스템 전체 아키텍처 (System Architecture)

CELLCRAFT는 웹 브라우저 클라이언트 중심의 고성능 인터랙티브 SPA(Single Page Application)로 설계되며, 정적 호스팅(Netlify CDN)과 서버리스 BaaS(Firebase)를 활용한다.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Web Browser (Client Tier)                       │
├────────────────────────────────────────────────────────────────────────┤
│  [Presentation Layer]                                                 │
│   - React 18 / Vite / TypeScript (Strict Mode)                         │
│   - Tailwind CSS (디자인 토큰 시스템) + Lucide Icons                   │
│   - Motion for React (GPU transform/opacity 전용 모션)                 │
│                                                                        │
│  [Feature Modules]                                                     │
│   - Learning Workspace / Sandbox / Dashboard / Certification           │
│                                                                        │
│  [Interactive Core Engines]                                            │
│   ┌─────────────────────┐   ┌─────────────────┐   ┌──────────────────┐ │
│   │   Tutorial Engine   │   │ SpreadsheetGrid │   │  Grading Engine  │ │
│   │ - Spotlight Overlay │   │ - Virtual 2D    │   │ - Perturbation   │ │
│   │ - FSM Step Runner   │   │ - Key Navigation│   │ - Error Diagnosis│ │
│   └──────────┬──────────┘   └────────┬────────┘   └────────┬─────────┘ │
│              │                       │                     │           │
│              └───────────────────────┼─────────────────────┘           │
│                                      ▼                                 │
│  [Engine Adapter Layer]                                                │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                    FormulaEngine Adapter (ADR-001)               │ │
│   │   - HyperFormula (GPLv3) OR IronCalc (Rust WASM MIT)             │ │
│   └──────────────────────────────────┬───────────────────────────────┘ │
│                                      │                                 │
│  [State & Data Access Layer]         │                                 │
│   - Zustand (로컬 에디터/튜토리얼 FSM 세션 상태)                        │
│   - TanStack Query v5 (비동기 데이터 캐싱)                             │
│   - Web Worker Isolation (XLSX 파싱 & 무거운 수식 연산)                │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Backend & Infrastructure Services                    │
├────────────────────────────────────────────────────────────────────────┤
│  [Netlify Edge CDN]                                                    │
│   - SPA Routing Rewrite (/* -> /index.html 200)                        │
│   - Security Headers (CSP, HSTS, X-Frame-Options, WASM eval)           │
│                                                                        │
│  [Firebase Platform]                                                   │
│   - Firebase Authentication (Email/Password, Google OAuth, Guest)      │
│   - Cloud Firestore (유저 진도, 연속 학습, 문제 풀이 기록)             │
│   - Firebase App Check (reCAPTCHA Enterprise 기반 도용 방지)           │
│   - Cloud Storage (선택적 실무 템플릿 XLSX 보관)                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 런타임 데이터 흐름 (End-to-End Data Flow)

```
[1. 사용자 키보드/마우스 입력]
          │
          ▼
[2. SpreadsheetGrid: 즉시 UI 렌더링 (0ms, uncommitted draft)]
          │ (Enter / Tab / Blur 이벤트 발생)
          ▼
[3. Grid State Commit: 셀 값 변경 이벤트 발행]
          │
          ├─────────────────────────────────────────┐
          ▼                                         ▼
[4. FormulaEngine Adapter]            [5. Tutorial Engine FSM]
   - 의존 셀 DAG 재계산                   - 현재 Step 완료 조건 평가
   - 파싱 오류 (#VALUE! 등) 전파          - 일치 시 다음 Step으로 트랜지션
          │                               - Spotlight 좌표 갱신
          ▼
[6. Grading Engine (채점 모드인 경우)]
   - 기대값 비교 (Canonical Test)
   - 교란 데이터셋 3종 주입 및 재계산 (Perturbation Test)
   - 오답 분류 (하드코딩 / 범위오류 / 절대참조 누락)
          │
          ▼
[7. Feedback & Progress Dispatch]
   - 우측 패널에 성공/오류 피드백 노출
   - LocalStorage 즉시 동기화 (오프라인 보호)
   - Firestore 비동기 Debounced 쓰기 (진도 및 XP 갱신)
```

---

## 3. FormulaEngine 어댑터 인터페이스 명세

특정 라이브러리(HyperFormula, IronCalc 등) 종속성을 원천 차단하기 위한 추상화 인터페이스를 정의한다.

```typescript
// src/engine/spreadsheet/FormulaEngineAdapter.ts

export type CellScalar = string | number | boolean | null;

export type CellErrorCode = 
  | '#DIV/0!' 
  | '#VALUE!' 
  | '#REF!' 
  | '#NAME?' 
  | '#NUM!' 
  | '#N/A' // 2026-10-23 정정: Excel 표기는 '#N/A'
  | '#NULL!' 
  | '#CYCLE!' 
  | '#ERROR!';

export interface CellResult {
  value: CellScalar;
  displayValue: string;
  error: { code: CellErrorCode; message: string } | null;
  formula?: string;
  format?: string;
}

export interface SheetState {
  name: string;
  rowCount: number;
  colCount: number;
  cells: Record<string, CellResult>; // key: "A1", "B2"
}

export interface FormulaEngineAdapter {
  readonly id: string;
  readonly version: string;

  // 라이프사이클 및 초기화
  initWorkbook(sheets: Record<string, CellScalar[][]>): Promise<void>;
  // 통합 문서를 즉시 다시 만든다 (CARD-02D: 시트 구조 변경·실행 취소용)
  loadSheets(sheets: Record<string, CellScalar[][]>): void;
  destroy(): void;

  // 셀 조작
  setCellContent(sheetName: string, row: number, col: number, content: string | CellScalar): void;
  getCellValue(sheetName: string, row: number, col: number): CellResult;
  getCellFormula(sheetName: string, row: number, col: number): string | null;
  
  // 시트 전체 스냅샷
  getSheetGrid(sheetName: string): CellResult[][];

  // 의존성 수동 재계산 (필요 시)
  recalculate(): void;

  // 워크시트 관리
  addSheet(sheetName: string): void;
  renameSheet(oldName: string, newName: string): void;
  deleteSheet(sheetName: string): void;

  // 함수 및 메타데이터 지원 여부 검사
  isFunctionSupported(funcName: string): boolean;
  getDependencies(sheetName: string, row: number, col: number): Array<{ sheet: string; row: number; col: number }>;
}
```

### 3.1 범위 작업 (CARD-02E)

행·열 삽입·삭제, 복사·붙여넣기, 자동 채우기는 어댑터 인터페이스를 넓히지 않는다. `src/engine/spreadsheet/operations/`의 순수 함수가 시트 원문(A1 주소 → 입력 글자)을 받아 바뀐 원문을 돌려주고, `WorkbookModel`이 그 결과를 historyManager 명령으로 적용한다(구조 변경·잘라내기는 스냅샷 명령 + `loadSheets`, 붙여넣기·채우기는 셀 입력 명령, 크기는 크기만 되돌리는 명령).

| 모듈 | 역할 |
|---|---|
| `referenceShift.ts` | 수식 참조 토큰 읽기(`scanReferences`)와 세 가지 변환: 복사(`shiftFormulaForCopy`), 행·열 삽입·삭제(`adjustFormulaForStructure`), 잘라내기(`adjustFormulaForMove`). 바뀌는 토큰만 다시 쓰고 정규식 치환은 쓰지 않는다. F4·포인트 모드(`formulaReference.ts`)도 같은 토큰 읽기를 쓴다. |
| `rowColumnOps.ts` | 삽입·삭제 시 셀 위치·모든 시트 수식·행 높이·열 너비 이동, 시트 끝 값 밀림 거부, 크기 범위 |
| `clipboard.ts` | TSV 쓰기·읽기, 붙여넣기(반복 채우기 포함), 잘라낸 셀 옮기기 |
| `autoFill.ts` | 채우기 핸들 시리즈(숫자·날짜·끝 숫자 글자·요일·월 목록)와 Ctrl+D/R |

엔진 API(`addRows`, `copy`/`paste`)를 쓰지 않는 이유: 원문(사용자가 입력한 글자)과 엔진 상태를 늘 같게 두고(CARD-02D 설계), 엔진 쪽 복사 버그(EXCEL_DIFFERENCES D-18)를 피하기 위해서다. 같은 결과인지는 엔진 API와 맞대는 속성 테스트로 확인한다.

시트 스냅샷(`SheetSnapshot`)에는 선택 필드 `columnWidths`(열 문자 → 픽셀)·`rowHeights`(행 번호 → 픽셀)가 있다. 연습실 파일(버전 1)도 같은 선택 필드를 저장한다.

---

## 4. 튜토리얼 단계 선언형 스키마 (Tutorial Step Schema)

코드가 아닌 데이터로 튜토리얼의 모든 인터랙션을 정의한다.

```typescript
// src/types/tutorial.schema.ts
import { z } from 'zod';

export const TutorialActionType = z.enum([
  'SELECT_CELL',
  'TYPE_FORMULA',
  'PRESS_KEY',
  'AUTOFILL_RANGE',
  'CLICK_BUTTON',
  'CHANGE_FORMAT',
]);

export const TutorialStepSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  title: z.string(),
  description: z.string(), // Markdown/Sanitized HTML 지원
  
  // Spotlight 강조 대상 지정
  target: z.object({
    type: z.enum(['CELL', 'RANGE', 'UI_ELEMENT', 'FORMULA_BAR']),
    sheetName: z.string().default('Sheet1'),
    cellAddress: z.string().optional(), // e.g. "B2"
    rangeAddress: z.string().optional(), // e.g. "B2:B7"
    selector: z.string().optional(), // e.g. "[data-testid='formula-bar']"
  }),

  // 사용자가 수행해야 하는 조작
  expectedAction: z.object({
    type: TutorialActionType,
    acceptedKeys: z.array(z.string()).optional(), // e.g. ['Enter', 'Tab']
    targetCell: z.string().optional(),
    expectedFormulaPattern: z.string().optional(), // Regex 패턴 (대소문자 무시)
    expectedValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  }),

  // 단계 통과 및 실패 조건
  validation: z.object({
    requireExactFormula: z.boolean().default(false),
    allowAlternativeFormulas: z.boolean().default(true),
    successMessage: z.string(),
    customErrorMessage: z.string().optional(),
  }),

  // 보조 힌트 및 동작 정책
  hints: z.array(z.string()).default([]),
  canSkip: z.boolean().default(false),
  allowUndo: z.boolean().default(true),
});

export type TutorialStep = z.infer<typeof TutorialStepSchema>;
```

---

## 5. 문제 및 채점 규칙 스키마 (Problem & Scoring Schema)

```typescript
// src/types/problem.schema.ts
import { z } from 'zod';

export const PerturbationMutationType = z.enum([
  'ADD_SCALAR',      // 데이터 셀에 난수 덧셈
  'MULTIPLY_SCALAR', // 데이터 셀에 곱셈
  'INSERT_ROW',      // 데이터 중간에 행 삽입
  'SHUFFLE_VALUES',  // 순서 셔플
]);

export const ProblemDefinitionSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  level: z.number().int().min(0).max(10),
  title: z.string(),
  description: z.string(),
  examVersion: z.enum(['standard', '2024-2026', '2027-2029']).default('standard'),
  difficulty: z.enum(['intro', 'beginner', 'intermediate', 'advanced', 'expert']),

  // 시작 통합 문서 상태
  initialWorkbook: z.object({
    activeSheet: z.string(),
    sheets: z.record(
      z.string(),
      z.object({
        rowCount: z.number().default(20),
        colCount: z.number().default(10),
        initialData: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
        readOnlyRanges: z.array(z.string()).default([]), // 수정 금지 영역 (e.g. ["A1:D1", "A2:A10"])
      })
    ),
  }),

  // 채점 규칙 (Grading Rules)
  grading: z.object({
    targetCell: z.string(), // 평가 대상 셀 (e.g. "D11")
    targetSheet: z.string().default('Sheet1'),
    canonicalFormula: z.string(), // 기준 정답 수식 (e.g. "=SUM(D2:D10)")
    expectedResult: z.union([z.string(), z.number(), z.boolean()]),
    requiredFunctions: z.array(z.string()).default([]), // 필수 사용 함수 (e.g. ["SUM"])
    forbiddenFunctions: z.array(z.string()).default([]), // 금지 함수

    // 원본 9.1절 교란 검증 파라미터
    perturbations: z.array(
      z.object({
        targetRange: z.string(), // 교란할 데이터 범위 (e.g. "D2:D10")
        mutation: PerturbationMutationType,
        mutationValue: z.number(),
        expectedComputedResultFormula: z.string(), // 교란 후 기대 결과 산출식
      })
    ),

    // 오답별 진단 피드백 맵
    misconceptionFeedback: z.record(
      z.string(), // 에러 코드: "HARDCODED_VALUE", "INCOMPLETE_RANGE" 등
      z.string()  // 사용자 친화적 설명 문구
    ),
  }),

  // 4단계 힌트
  hints: z.tuple([
    z.string(), // 1단계: 필요 개념
    z.string(), // 2단계: 대상 범위/기능
    z.string(), // 3단계: 수식 골격
    z.string(), // 4단계: 완전한 정답 해설
  ]),

  // 점수 및 메타데이터
  points: z.number().int().positive().default(20),
  completionCriteria: z.string(),
});

export type ProblemDefinition = z.infer<typeof ProblemDefinitionSchema>;
```

---

## 6. Firestore 데이터 모델 및 보안 규칙 초안

### 6.1 컬렉션 구조 (Collection Layout)
```
/users/{userId}
   ├── profile: { email, displayName, createdAt, updatedAt }
   └── stats: { totalXp, currentStreak, lastActiveDate, streakFrozenCount }
   
/users/{userId}/progress/{courseId}
   ├── courseId: string
   ├── status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'
   ├── completedProblems: string[] // problemId 목록
   ├── lastAttemptAt: Timestamp
   ├── nextReviewDate: Timestamp (간격 반복 일정)
   
/users/{userId}/submissions/{problemId}
   ├── problemId: string
   ├── formulaUsed: string
   ├── isCorrect: boolean
   ├── hintCountUsed: number
   ├── solvedAt: Timestamp
   
/problems/{problemId} [공용 - 읽기 전용]
   └── (ProblemDefinition 스키마 내용 전문)

/courses/{courseId} [공용 - 읽기 전용]
   └── (Level 및 단원 메타데이터)
```

### 6.2 보안 규칙 초안 (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. 기본 모든 접근 차단 (Default Deny)
    match /{document=**} {
      allow read, write: if false;
    }

    // 2. 공용 콘텐츠 (문제, 교육과정): 클라이언트 읽기 전용
    match /courses/{courseId} {
      allow read: if true;
      allow write: if false;
    }
    match /problems/{problemId} {
      allow read: if true;
      allow write: if false;
    }

    // 3. 사용자 루트 문서
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId
        && request.resource.data.keys().hasOnly(['uid', 'email', 'createdAt', 'updatedAt', 'profile', 'stats'])
        && request.resource.data.createdAt == request.time;
      allow update: if request.auth != null && request.auth.uid == userId
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.updatedAt == request.time;

      // 사용자 진도 하위 컬렉션
      match /progress/{courseId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == userId;
      }

      // 문제 풀이 이력 하위 컬렉션
      match /submissions/{problemId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.auth.uid == userId
          && request.resource.data.solvedAt == request.time;
      }
    }
  }
}
```

