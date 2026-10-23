# CELLCRAFT 수식 엔진과 Microsoft Excel의 차이 (EXCEL_DIFFERENCES)

- **대상 엔진:** HyperFormula 3.5.0 (GPLv3, `licenseKey: 'gpl-v3'`, ADR-001) + 어댑터 보정(`src/engine/spreadsheet/adapters/`)
- **비교 기준:** `tests/fixtures/golden-excel-calculations.xlsx`. `scripts/golden/make-golden-formulas.mjs`로 만든 수식 96개를 사용자가 웹 Excel에서 계산하고 복사본으로 내려받은 파일이다(2026-10-23, 셀 수정 없음).
- **대조 테스트:** `tests/unit/engine/golden-excel.test.ts` (Q-01, 숫자 허용 오차 1e-9)
- **원칙 (MASTER_PROMPT §8.3):** 이 플랫폼은 Excel과 완벽히 호환된다고 주장하지 않는다. 아래에는 조사로 원인을 확인한 차이만 근거와 함께 적는다.

---

## 1. 골든 대조 결과

| 구분 | 개수 |
|---|---|
| 수식 셀 | 96 |
| Excel 값과 일치 | 95 |
| 엔진 한계로 남은 차이 (2장 D-3) | 1 |

처음 대조에서는 4건이 달랐다. 원인과 처리는 아래와 같다.

| 골든 셀 | 수식 | Excel | 처음 엔진 결과 | 원인 | 처리 |
|---|---|---|---|---|---|
| CoreFunctions!C21 | `=COUNTIF(H2:H7,"?발")` | 2 | 0 | 어댑터 설정 문제. HyperFormula 기본값 `accentSensitive: false`는 비교 전에 문자열을 NFD로 분해한다(`commonjs/interpreter/ArithmeticHelper.js`의 `normalizeString`). 그러면 한글 음절이 자모로 쪼개져 와일드카드 `?`가 한 글자와 맞지 않는다. | `accentSensitive: true`. Excel도 악센트를 구분한다. 지금은 일치한다. |
| CoreFunctions!C28 | `=CONCAT(F2,"-",H2)` | `김민준-영업` | `#NAME?` | HyperFormula 3.5.0에 CONCAT이 없다(D-1). | 어댑터 플러그인으로 구현했다(`excelCompatPlugin.ts`). 지금은 일치한다. |
| ErrorValues!C11 | `=INDEX(Data!A2:A6,10)` | `#REF!` | `#NUM!` | HyperFormula INDEX가 범위 밖에서 NUM을 돌려준다(D-2). | 어댑터 플러그인으로 INDEX를 교체했다. 지금은 일치한다. |
| ErrorValues!C13 | `=SUM(A13:A14 B13:B14)` | `#NULL!` | `#ERROR!` | 교집합 연산자 미지원(D-3). | 엔진 한계로 남겼다. 테스트는 이 셀 하나만 기록된 차이로 검사한다. |

## 2. 확인된 차이

`golden-excel.test.ts`의 `DOCUMENTED_DIFFERENCES`는 아래 표 중 골든 셀이 있는 행만 담는다. 셀 주소와 수식이 모두 같은 셀 하나만 예외로 처리한다. 그 셀도 Excel 값과 엔진 값이 각각 표와 같은지 검사하므로, 어느 쪽이 바뀌어도 테스트가 실패한다.

| ID | 골든 셀 | 수식 | Excel | 엔진 | 원인 (HyperFormula 3.5.0) | 상태와 학습 화면 안내 |
|---|---|---|---|---|---|---|
| D-1 | CoreFunctions!C28 | `=CONCAT(F2,"-",H2)` | `김민준-영업` | `김민준-영업` | 내장 함수에 CONCAT이 없다. 텍스트 플러그인(`commonjs/interpreter/plugin/TextPlugin.js`)은 CONCATENATE만 등록한다. ADR-001 §3 대조표의 "CONCAT ✅ 지원"은 사실과 다르다. | **해결.** `ExcelCompatPlugin.concat`이 Microsoft "CONCAT 함수" 문서의 동작(범위를 행 우선으로 펼침, 빈 셀 건너뜀, 숫자는 일반 서식, 논리값 TRUE/FALSE, 오류 전파, 32,767자 초과 시 #VALUE!)을 따른다. 범위 인수와 빈 셀·숫자·논리값은 단위 테스트로 확인했다. 골든 파일로 Excel과 대조한 것은 셀·문자열 인수 경우뿐이다. |
| D-2 | ErrorValues!C11 | `=INDEX(Data!A2:A6,10)` | `#REF!` | `#REF!` | 범위를 벗어난 행·열 번호에 `ErrorType.NUM`("Value too large.")을 돌려준다(`commonjs/interpreter/plugin/InformationPlugin.js` 253~254행). | **해결.** `ExcelCompatPlugin.index`가 `#REF!`를 돌려준다. 한 행짜리 범위에 번호 하나를 주면 열 번호로 쓰는 Excel 규칙도 반영했다. |
| D-3 | ErrorValues!C13 | `=SUM(A13:A14 B13:B14)` | `#NULL!` | `#ERROR!` | 공백 교집합 연산자를 파싱하지 못한다("Expecting token of type --> RParen <--"). `ErrorType`에 NULL이 없어 `#NULL!`을 만들 수도 없다. | **엔진 한계.** 오류 코드는 다르다. 안내문은 "교집합 연산자(두 범위 사이의 공백)는 지원하지 않습니다…"로 미지원 기능임을 알린다(`errorMessages.ts` `usesIntersectionOperator`). 참조 사이 공백을 `+`로 바꿨을 때 문법이 맞는 경우에만 이 안내를 쓴다. 다른 문법 오류는 일반 안내를 유지한다. |

## 3. 골든 파일로는 확인되지 않았고 재현으로만 확인한 차이

아래 항목은 엔진 결과를 직접 재현해 확인했다. Excel 쪽 값은 골든 파일에 없어 Microsoft 문서와 일반적인 Excel 동작 기준으로 적었다. 골든 파일에 추가해 Excel로 확인하는 것이 다음 과제다.

| ID | 내용 | 엔진 재현 | Excel (문서 기준) | 비고 |
|---|---|---|---|---|
| D-4 | 수식 안의 지수 표기 숫자 | `=1E+3` → `#ERROR!` ("Redundant input, expecting EOF but found: E") | 1000 | 골든 파일의 `=A18*1E+3`은 Excel이 저장하면서 `=A18*1000`으로 바꿔 대조에서 드러나지 않았다. 사용자가 직접 입력하면 차이가 생긴다. |
| D-5 | 순환 참조 결과 | `#CYCLE!` | 경고 후 0 (반복 계산 꺼짐) | S-09 무한 루프 방어와 학습 안내를 위해 의도적으로 오류로 표시한다. 골든 대조에서는 제외했다. |
| D-6 | `&`와 CONCATENATE에서 숫자를 문자열로 바꾸는 방식 | `="x"&(0.1+0.2)` → `x0.30000000000000004` | `x0.3` (유효 숫자 15자리) | HyperFormula의 `coerceScalarToString`이 `Number.prototype.toString`을 쓴다(`commonjs/interpreter/ArithmeticHelper.js`). 골든 셀 `="값:"&A14`(1.5)는 일치했다. CONCAT은 어댑터에서 15자리 규칙을 적용했다. |
| D-7 | INDEX 행·열 번호 0 | `#VALUE!` (INDEX 전용 안내) | 행·열 전체를 배열로 돌려준다 | 배열 반환은 지원하지 않는다. |
| D-8 | Excel에는 있지만 엔진에 없는 함수 | `#NAME?` | 계산됨 | AVERAGEIFS, RANK, RANK.EQ, XMATCH는 대체 방법을 안내한다(`supportedFunctions.ts` `KNOWN_UNSUPPORTED_FUNCTIONS`). 그 밖에 LET, LAMBDA, TEXTSPLIT, TAKE, TEXTBEFORE, NUMBERVALUE, MODE 등도 없으며, 입력하면 "지원하지 않는 함수입니다: 이름"으로 알린다. |

## 4. Excel과 맞추려고 바꾼 엔진 설정 (차이 아님)

`src/engine/spreadsheet/adapters/HyperFormulaAdapter.ts`의 `ENGINE_CONFIG`에서 아래 기본값을 바꿨다. 바꾸지 않으면 Excel과 결과가 달라진다.

| 설정 | 값 | 바꾸지 않으면 |
|---|---|---|
| `leapYear1900`, `nullDate` | `true`, 1899-12-31 | `DATE(1900,1,1)`이 2, `DATE(1900,3,1)`이 62 (Excel은 1, 61) |
| 이름 `TRUE`, `FALSE` 등록 | `=TRUE()`, `=FALSE()` | `=IF(TRUE,1,2)`가 `#NAME?` |
| `evaluateNullToZero` | `true` | 빈 셀 참조 `=Z9`가 0이 아니라 빈 값 |
| `smartRounding` | `false` | 결과가 10자리로 반올림됨(`=2^0.5` → 1.4142135624) |
| `accentSensitive` | `true` | 1장의 한글 와일드카드 불일치 |
| `dateFormats` | `YYYY-MM-DD`, `YYYY/MM/DD`, `MM/DD/YYYY` | `DATEVALUE("2024-03-15")`가 `#VALUE!` |

## 5. 아직 다루지 않은 범위

- **표시 서식:** 엔진은 계산 값과 간단한 표시 문자열(유효 숫자 15자리, 날짜 `YYYY-MM-DD`, 백분율)만 만든다. 열 너비에 따른 Excel '일반' 서식 자릿수와 한국어 날짜·통화 서식(`YYYY"년" MM"월" DD"일"`, `₩#,##0`)은 셀 서식 기능(Phase 7)에서 다룬다(Q-07 부분 완료).
- **XLSX 가져오기·내보내기 지원 범위(R-08.30):** CARD-07H에서 기록한다.
- **자격증 시험 프로그램과의 차이(R-08.31):** CARD-07F에서 기록한다.
- **Google Sheets 전용 함수 구분(R-08.28):** 이번 대조는 Excel 기준만 했다.
