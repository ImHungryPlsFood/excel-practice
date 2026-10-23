# ADR-001: 수식 계산 엔진(Formula Engine) 선정 및 어댑터 아키텍처

- **문서 번호:** ADR-001
- **상태:** **채택됨 (Accepted) — 2026-10-22 사용자 확정**
- **최종 수정일:** 2026-10-22
- **작성자:** 수석 소프트웨어 아키텍트

---

## 1. 배경 및 맥락 (Context)

`docs/MASTER_PROMPT.md` 제3장, 제8장 및 본 보강 지침에 따라, 브라우저 클라이언트 환경에서 Microsoft Excel과 동등한 수식 계산(사칙연산, 셀 참조, 내장 함수, 의존성 재계산, 오류 전파)을 수행하는 엔진이 필요하다.
브라우저에서 `eval()`이나 `new Function()`을 사용하는 것은 보안(S-09) 및 연산 정합성 측면에서 절대 금지된다.

수식 엔진 후보군 선정 시 고려해야 할 핵심 요소는 **라이선스 법적 의무**, **생태계 성숙도 및 개발 진행 상태(WIP 여부)**, 그리고 **Level 3 핵심 함수들의 실제 지원 범위**이다.

---

## 2. 후보 엔진 상세 분석

### 2.1 HyperFormula (v3.x / Handsontable) — [최종 채택]
- **특징:** Handsontable 사에서 개발한 업계 표준급 고성능 헤드리스 연산 엔진.
- **성숙도:** 상용 배포 검증 완료. DAG 의존성 재계산, 순환 참조 감지, 다중 시트, 380개 이상의 풍부한 함수가 완벽히 안정화됨.
- **라이선스:** **GPLv3** (또는 유료 상용 라이선스).
- **라이선스 키 설정:** 초기화 시 `licenseKey: 'gpl-v3'` 명시 필수.

### 2.2 IronCalc (Rust/WASM) — [대안 검토 결과 미채택]
- **특징:** Rust 언어로 작성되어 WebAssembly로 컴파일되는 차세대 오픈소스 스프레드시트 엔진.
- **라이선스:** MIT / Apache 2.0 이중 라이선스.
- **성숙도 및 제약:**
  - IronCalc 저장소(github.com/ironcalc/ironcalc)는 스스로를 작업 중인 엔진으로 소개한다 (*"This is work-in-progress. IronCalc is developed in the open. Expect things to be broken and change quickly until version 1.0."*).
  - Level 3 핵심 함수 중 `SUMIFS`, `COUNTIFS`, `TEXTJOIN`, `DATEDIF`, `XLOOKUP`, 동적 배열 함수(`FILTER`, `SORT`, `UNIQUE`)가 아직 미지원 또는 불완전하여 대규모 폴리필 자체 개발 부담이 수반됨.

---

## 3. 원본 Level 3 핵심 함수 지원 여부 공식 대조표

`docs/MASTER_PROMPT.md` 제5장 Level 3에 명시된 필수 함수 각각에 대해, 공식 문서 및 공식 저장소 기준으로 두 엔진의 지원 여부를 1:1 대조한 결과는 다음과 같다.
(출처: HyperFormula 공식 문서 https://hyperformula.handsontable.com/guide/built-in-functions.html, IronCalc 공식 문서 및 저장소 https://docs.ironcalc.com/ / https://github.com/ironcalc/ironcalc, 확인일: 2026-10-22)

| Level 3 핵심 함수 | HyperFormula 지원 여부 | IronCalc 지원 여부 | 채택 엔진(HyperFormula) 평가 |
| :--- | :---: | :---: | :--- |
| **SUM** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **AVERAGE** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **MIN, MAX** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **COUNT, COUNTA** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **IF** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **AND, OR** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **SUMIF** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **SUMIFS** | ✅ 지원 | ⚠️ 부분 지원 (WIP) | 완벽 지원 |
| **COUNTIF** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **COUNTIFS** | ✅ 지원 | ⚠️ 부분 지원 (WIP) | 완벽 지원 |
| **ROUND, ROUNDUP, ROUNDDOWN** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **IFERROR** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **LEFT, RIGHT, MID** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **LEN, TRIM** | ✅ 지원 | ⚠️ 부분 지원 (TRIM WIP) | 완벽 지원 |
| **CONCAT** | ❌ 미지원 (2026-10-23 정정, 3.5.0 실측) | ✅ 지원 | 어댑터 플러그인으로 구현 (`excelCompatPlugin.ts`, EXCEL_DIFFERENCES D-1) |
| **TEXTJOIN** | ✅ 지원 | ❌ 미지원 (WIP) | 완벽 지원 |
| **TODAY, NOW** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **YEAR, MONTH, DAY** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **DATEDIF** | ✅ 지원 | ❌ 미지원 | 완벽 지원 |
| **VLOOKUP** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **XLOOKUP** | ✅ 지원 | ❌ 미지원 (WIP) | 완벽 지원 |
| **INDEX, MATCH** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **FILTER, SORT, UNIQUE (동적 배열)** | ⚠️ 부분 지원 (v2.0+) | ❌ 미지원 (WIP) | 연산 및 배열 출력 지원 |

---

## 4. 결정 사항 (Decision)

사용자의 최종 확정에 따라 **HyperFormula를 GPLv3 라이선스 하에서 채택**한다.
앱 코드가 HyperFormula 라이브러리에 직접 강하게 결합되지 않도록 **`FormulaEngineAdapter` 추상화 계층**을 두어 유지보수성을 극대화한다.

### 4.1 HyperFormula 초기화 명세
```typescript
import { HyperFormula } from 'hyperformula';

export function createFormulaEngineInstance() {
  return HyperFormula.buildEmpty({
    licenseKey: 'gpl-v3', // GPLv3 명시
    useArrayArithmetic: true,
    useColumnIndex: true,
  });
}
```

### 4.2 GPLv3 준수를 위한 구체적 요구사항 및 작업 카드 반영
1. **저장소 루트 라이선스 파일 배치:**
   - 프로젝트 루트 디렉터리에 `LICENSE` (GNU General Public License v3.0 전문) 파일을 배치한다 (`CARD-01A`).
2. **`package.json` 라이선스 식별자 명시:**
   - `package.json`의 `"license"` 필드를 `"GPL-3.0-or-later"`로 지정한다 (`CARD-01A`).
3. **배포 웹사이트 공개 저장소 링크 제공:**
   - 웹 애플리케이션 랜딩 페이지 하단(Footer) 및 대시보드/설정 메뉴에 소스코드 공개 Git 저장소 URL 링크를 명확히 노출한다 (`CARD-01B`).
4. **외부 의존성 라이선스 호환성 검증 단계 (License Audit):**
   - 프로젝트에 추가되는 모든 npm 패키지의 라이선스가 GNU GPLv3와 법적으로 호환되는 허용 라이선스(MIT, Apache 2.0, BSD-2/3-Clause, ISC 등)인지 검사하는 `npm run audit:licenses` 스크립트를 CI 파이프라인(`CARD-01A`)에 포함한다.
   - *공식 라이선스 참고 링크:*
     - GNU GPLv3 전문: https://www.gnu.org/licenses/gpl-3.0.html
     - GPL 호환 및 비호환 라이선스 해설: https://www.gnu.org/licenses/license-list.html
     - HyperFormula 라이선스 안내: https://hyperformula.handsontable.com/guide/license-key.html
     - *(주의: 본 문서는 공식 라이선스 조항만을 안내하며 법적 자문이나 유권해석을 제공하지 않음)*

---

## 5. 어댑터 인터페이스 명세 (FormulaEngineAdapter)

```typescript
// src/engine/spreadsheet/FormulaEngineAdapter.ts

export type CellValue = string | number | boolean | null;

export interface CellError {
  type: '#DIV/0!' | '#VALUE!' | '#REF!' | '#NAME?' | '#NUM!' | '#N/A' | '#NULL!' | '#CYCLE!'; // 2026-10-23 정정: Excel 표기는 '#N/A'
  message: string;
}

export type EvaluatedCellResult = {
  value: CellValue;
  error: CellError | null;
  formula?: string;
};

export interface SheetDimensions {
  rowCount: number;
  colCount: number;
}

export interface FormulaEngineAdapter {
  readonly id: string;
  readonly version: string;
  
  // 워크시트 및 데이터 초기화
  initWorkbook(sheets: Record<string, CellValue[][]>): Promise<void>;
  
  // 단일 셀 수식/값 설정
  setCellContent(sheetName: string, row: number, col: number, content: string | CellValue): void;
  
  // 단일 셀 계산 결과 조회
  getCellValue(sheetName: string, row: number, col: number): EvaluatedCellResult;
  
  // 전체 시트 계산 결과 스냅샷
  getSheetValues(sheetName: string): EvaluatedCellResult[][];
  
  // 셀 의존성 변경에 따른 재계산 트리거
  recalculate(): void;
  
  // 시트 관리
  addSheet(sheetName: string, dimensions?: SheetDimensions): void;
  removeSheet(sheetName: string): void;
  
  // 지원 함수 검사
  isFunctionSupported(functionName: string): boolean;
  
  // 자원 해제
  destroy(): void;
}
```
