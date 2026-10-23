# ADR-001: 수식 계산 엔진(Formula Engine) 선정 및 어댑터 아키텍처

- **문서 번호:** ADR-001
- **상태:** **채택됨 (Accepted) — 2026-10-22 사용자 확정**
- **최종 수정일:** 2026-10-23
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

| Level 3 핵심 함수 | HyperFormula 지원 여부 | IronCalc 지원 여부 | 채택 엔진(HyperFormula) 평가 — 문서 기준 초안, 실측 판정은 §3.1 |
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
| **ROUND, ROUNDUP, ROUNDDOWN** | ✅ 지원 | ✅ 지원 | 지원 (§3.1: 어댑터가 Excel 반올림으로 교체) |
| **IFERROR** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **LEFT, RIGHT, MID** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **LEN, TRIM** | ✅ 지원 | ⚠️ 부분 지원 (TRIM WIP) | 완벽 지원 |
| **CONCAT** | ❌ 미지원 (2026-10-23 정정, 3.5.0 실측) | ✅ 지원 | 어댑터 플러그인으로 구현 (`excelCompatPlugin.ts`, EXCEL_DIFFERENCES D-1) |
| **TEXTJOIN** | ✅ 지원 | ❌ 미지원 (WIP) | 완벽 지원 |
| **TODAY, NOW** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **YEAR, MONTH, DAY** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **DATEDIF** | ✅ 지원 | ❌ 미지원 | 부분 지원 (§3.1: "YD" 값) |
| **VLOOKUP** | ✅ 지원 | ✅ 지원 | 완벽 지원 |
| **XLOOKUP** | ✅ 지원 | ❌ 미지원 (WIP) | 완벽 지원 |
| **INDEX, MATCH** | ✅ 지원 | ✅ 지원 | INDEX 부분 지원(0 번호), MATCH 지원 (§3.1) |
| **FILTER, SORT, UNIQUE (동적 배열)** | ⚠️ 부분 지원 (v2.0+) | ❌ 미지원 (WIP) | FILTER·SORT 지원, UNIQUE 부분 지원 (§3.1) |

### 3.1 HyperFormula 3.5.0 실측 결과 (2026-10-23, CARD-02B 추가 작업)

위 표는 공식 문서를 근거로 한 초안이다(CONCAT 한 건은 이미 틀린 것으로 드러나 정정했다). 아래는 **어댑터가 실제로 등록한 함수 목록**(`isFunctionSupported`)과 **실제 계산 결과**로 다시 확인하고, 1차·2차 골든 파일(웹 Excel이 계산)과 대조한 것이다. 문서나 이 ADR의 이전 표를 근거로 삼지 않았다. 엔진을 고친 뒤의 상태이며, 수정 전 불일치는 `EXCEL_DIFFERENCES.md`에 있다.

- **판정 기준:** 지원 = 등록되어 있고 대표 수식의 결과가 Excel(골든)과 같다. 부분 지원 = 등록되어 있고 기본 사용은 맞지만 아래 비고의 사용법에서 Excel과 다르거나 동작하지 않는다. 미지원 = 입력하면 `#NAME?`.
- **근거 열:** "골든 일치"는 1차(`golden-excel-calculations.xlsx`, 96셀) 또는 2차(`golden-excel-calculations-2.xlsx`, 수식 291셀과 배열 펼침 43칸)에서 Excel 값과 일치한 것. D-번호는 `EXCEL_DIFFERENCES.md`의 기록된 차이다.
- **어댑터 교체:** CONCAT(추가), INDEX, MATCH, INT, ROUND, ROUNDUP, ROUNDDOWN, EDATE, DATEDIF, CONCATENATE, TEXTJOIN, LEN, TEXT, FILTER는 `excelCompatPlugin.ts`의 Excel 규칙 구현이다.

| Level 3 함수 | 판정 | 근거 | 비고 |
| :--- | :---: | :--- | :--- |
| SUM, AVERAGE, MIN, MAX | 지원 | 골든 일치 | 빈 셀·문자 무시, 직접 인수의 숫자 문자열 변환 |
| COUNT, COUNTA | 지원 | 골든 일치 | |
| IF, AND, OR | 부분 지원 | 골든 일치(기본) | 문자 인수 처리가 웹 Excel과 다르다: `=AND(1,"a")`(D-14c), `=OR(문자만 있는 범위)`(D-14d). 미확인으로 기록 |
| SUMIF, SUMIFS, COUNTIF, COUNTIFS | 지원 | 골든 일치 | 와일드카드·`<>`·빈 조건 포함. `accentSensitive: true` 설정이 전제 |
| ROUND, ROUNDUP, ROUNDDOWN | 지원 | 골든 일치 | 어댑터가 십진 반올림으로 교체. 1.005 → 1.01, 자릿수 소수는 정수로 버림 |
| IFERROR, IFNA | 지원 | 골든 일치 | |
| LEFT, RIGHT, MID | 지원 | 골든 일치 | 숫자 인수를 문자열로 바꿀 때 17자리가 나올 수 있다(D-6 "다른 텍스트 함수") |
| LEN, TRIM | 지원 | 골든 일치 | TRIM은 웹 Excel이 줄바꿈 없는 공백(160)도 지운 것과 다르다(D-14a, 미확인) |
| CONCAT, CONCATENATE | 지원 | 골든 일치 | 범위 인수·빈 셀·논리값·오류 전파·32,767자 경계 포함 |
| TEXTJOIN | 지원 | 골든 일치 | |
| DATE, YEAR, MONTH, DAY, DATEVALUE, WEEKDAY, WEEKNUM, ISOWEEKNUM, TODAY, NOW, TIME, HOUR, MINUTE, SECOND, TIMEVALUE, EOMONTH, NETWORKDAYS, WORKDAY, DAYS, DAYS360, YEARFRAC | 지원 | 골든 일치 | TIME·WORKDAY 결과의 표시 문자열은 날짜가 아닌 일련번호다(Phase 7 셀 서식에서 다룸) |
| EDATE | 지원 | 골든 일치 | 윤년 2월 29일을 지키도록 교체 |
| DATEDIF | **부분 지원** | "Y","M","D","YM","MD" 골든 일치 | `"YD"` 값이 Excel과 다르다(305 / 304, D-14b, 미확인). 단위 대소문자는 구분하지 않는다 |
| VLOOKUP, HLOOKUP | 지원 | 골든 일치 | 근사 일치(생략 포함)·와일드카드·열 번호 오류 |
| XLOOKUP | 지원 | 골든 일치 | 못 찾음 대체 값, match_mode -1/1/2, search_mode -1/2, 여러 열 반환(펼침) |
| INDEX | **부분 지원** | 골든 일치 | 행·열 번호 0(행/열 전체 배열)은 `#VALUE!`(D-7, 엔진 한계) |
| MATCH | 지원 | 골든 일치 | 정확히 일치에서 `*`, `?`, `~` 와일드카드 지원으로 교체 |
| SORT | 지원 | 골든 일치 | 오름·내림차순, 열 기준 선택, 여러 열 범위, 중첩. 결과를 펼칠 칸이 막히면 `#SPILL!` |
| UNIQUE | **부분 지원** | 골든 일치(빈 셀 제외) | 범위에 빈 셀이 있으면 Excel은 0, 엔진은 빈 칸(D-13, 이번에 고치지 않음) |
| FILTER | 지원 | 골든 일치(일치 없음 제외) | Excel 규칙으로 교체: 여러 열 원본, 세 번째 인수 `if_empty`, 가로 방향 조건. 일치하는 값이 없고 `if_empty`도 없으면 엔진은 `#N/A`(Excel `#CALC!`에 해당하는 코드가 엔진에 없음, D-12) |

그 밖의 함수: **`TEXT`**는 지원하는 서식(숫자·백분율·날짜 일부)만 정확히 처리하고 나머지는 `#VALUE!`와 "지원하지 않는 서식입니다" 안내를 돌려준다. 지원 서식 목록은 `EXCEL_DIFFERENCES.md` "TEXT 함수"에 있고, 전체 서식 해석기는 Phase 7 서식 작업(CARD-07B)으로 넘긴다.

### 3.2 미지원 함수와 대응 방안 (지금 구현하지 않음)

실제 입력해 `#NAME?`을 확인했다. 아래 "필요한 Phase"는 `REQUIREMENTS_TRACE.md`/`CLAUDE_CODE_HANDOFF.md`의 카드 배정을 근거로 한 판단이다.

| 함수 | 필요한 Phase | 대응 방안 |
| :--- | :--- | :--- |
| AVERAGEIFS | Phase 4 (CARD-04D Level 3 조건부 집계 콘텐츠에서 쓰일 가능성이 가장 높음) | 현재: `KNOWN_UNSUPPORTED_FUNCTIONS` 안내(SUMIFS÷COUNTIFS). 문항에는 이 대안만 출제하고 AVERAGEIFS 자체는 문항 정답으로 쓰지 않는다. Excel과 직접 대조가 필요해지면 어댑터 플러그인으로 구현 |
| RANK, RANK.EQ | Phase 4 이후 (Level 3 필수 목록에는 없음) | 현재: `COUNTIF(범위,">"&값)+1` 안내. 필요하면 어댑터 플러그인 |
| XMATCH | Phase 4 ("XLOOKUP 및 대안 함수" 레슨에서 언급될 수 있음) | 레슨 대안은 `MATCH(값,범위,0)` + INDEX. 정식 지원은 Phase 7 (CARD-07D) |
| LOOKUP | Phase 7 | VLOOKUP 또는 INDEX+MATCH(근사 일치)로 대체 안내 |
| SORTBY | Phase 7 (CARD-07D 동적 배열) | 정렬 기준이 같은 표 안의 열이면 `SORT(표,열,순서)`로 대체 |
| LET, LAMBDA | Phase 7 (CARD-07D) | 지원하지 않는다고 안내(R-05.76: 구현되지 않은 기능을 구현된 것처럼 표시하지 않는다). 시뮬레이션 범위에서 제외 |
| TEXTSPLIT, TEXTBEFORE, TAKE | Phase 7 (CARD-07A 텍스트 나누기, CARD-07D) | LEFT/MID/FIND/SUBSTITUTE 조합으로 대체 안내. 텍스트 나누기 화면은 함수가 아니라 별도 기능으로 구현 |
| INDIRECT | Phase 7 (CARD-07D 시트 참조) | 직접 참조 또는 INDEX로 대체 안내. 문자열을 주소로 해석하므로 구현 시 S-09 검토 필요 |
| OFFSET | Phase 7 (CARD-07D) | `isFunctionSupported("OFFSET")`는 false지만 `=OFFSET(Data!A1,1,1)`은 12를 돌려줬다(파서 내장으로 보임). 지원 범위를 확인하기 전에는 지원으로 표시하지 않는다 |
| MODE, MODE.SNGL | Phase 7 (CARD-07C 분석) | 필요하면 어댑터 플러그인 |
| NUMBERVALUE | Phase 7 (CARD-07A 데이터 형식 통일) | `VALUE`와 SUBSTITUTE 조합으로 대체 안내 |
| 교집합 연산자(공백) | — | 함수가 아님. EXCEL_DIFFERENCES D-3 |

위 표의 AVERAGEIFS·RANK·RANK.EQ·XMATCH 안내문은 이미 `supportedFunctions.ts`에 있다. 나머지는 입력하면 "지원하지 않는 함수입니다: 이름"으로 알린다(EXCEL_DIFFERENCES D-8).

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
