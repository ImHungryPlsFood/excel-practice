# CELLCRAFT 수식 엔진과 Microsoft Excel의 차이 (EXCEL_DIFFERENCES)

- **대상 엔진:** HyperFormula 3.5.0 (GPLv3, `licenseKey: 'gpl-v3'`, ADR-001) + 어댑터 보정(`src/engine/spreadsheet/adapters/`)
- **비교 기준:** `tests/fixtures/golden-excel-calculations.xlsx`. `scripts/golden/make-golden-formulas.mjs`로 만든 수식 96개를 사용자가 웹 Excel에서 계산하고 복사본으로 내려받은 파일이다(2026-10-23, 셀 수정 없음).
- **대조 테스트:** `tests/unit/engine/golden-excel.test.ts` (Q-01, 숫자 허용 오차 1e-9)
- **2차 비교 기준:** `tests/fixtures/golden-excel-calculations-2.xlsx`. `scripts/golden/make-golden-formulas-2.mjs`로 만든 `golden-formulas-2.xlsx`(수식 291셀)를 사용자가 웹 Excel에서 계산하고 복사본으로 내려받은 파일이다(2026-10-23, 셀 수정 없음, 복구 메시지·`#NAME?` 없음).
- **2차 대조 테스트:** `tests/unit/engine/golden-excel-2.test.ts`
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

### 2차 골든 대조 결과

| 구분 | 개수 |
|---|---|
| 수식 셀 (순환 참조 5개 포함) | 291 |
| 배열 수식이 펼친 칸 (마스터 칸 제외) | 43 |
| 처음 대조에서 Excel과 달랐던 셀 | 46 |
| 엔진을 고쳐 일치시킨 셀 | 31 |
| 기록된 차이로 남은 셀 (3장 D-9~D-14) | 15 |

## 2. 확인된 차이

`golden-excel.test.ts`의 `DOCUMENTED_DIFFERENCES`는 아래 표 중 골든 셀이 있는 행만 담는다. 셀 주소와 수식이 모두 같은 셀 하나만 예외로 처리한다. 그 셀도 Excel 값과 엔진 값이 각각 표와 같은지 검사하므로, 어느 쪽이 바뀌어도 테스트가 실패한다.

| ID | 골든 셀 | 수식 | Excel | 엔진 | 원인 (HyperFormula 3.5.0) | 상태와 학습 화면 안내 |
|---|---|---|---|---|---|---|
| D-1 | CoreFunctions!C28 | `=CONCAT(F2,"-",H2)` | `김민준-영업` | `김민준-영업` | 내장 함수에 CONCAT이 없다. 텍스트 플러그인(`commonjs/interpreter/plugin/TextPlugin.js`)은 CONCATENATE만 등록한다. ADR-001 §3 대조표의 "CONCAT ✅ 지원"은 사실과 다르다. | **해결.** `ExcelCompatPlugin.concat`이 Microsoft "CONCAT 함수" 문서의 동작(범위를 행 우선으로 펼침, 빈 셀 건너뜀, 숫자는 일반 서식, 논리값 TRUE/FALSE, 오류 전파, 32,767자 초과 시 #VALUE!)을 따른다. 범위 인수와 빈 셀·숫자·논리값은 단위 테스트로 확인했다. 골든 파일로 Excel과 대조한 것은 셀·문자열 인수 경우뿐이다. |
| D-2 | ErrorValues!C11 | `=INDEX(Data!A2:A6,10)` | `#REF!` | `#REF!` | 범위를 벗어난 행·열 번호에 `ErrorType.NUM`("Value too large.")을 돌려준다(`commonjs/interpreter/plugin/InformationPlugin.js` 253~254행). | **해결.** `ExcelCompatPlugin.index`가 `#REF!`를 돌려준다. 한 행짜리 범위에 번호 하나를 주면 열 번호로 쓰는 Excel 규칙도 반영했다. |
| D-3 | ErrorValues!C13 | `=SUM(A13:A14 B13:B14)` | `#NULL!` | `#ERROR!` | 공백 교집합 연산자를 파싱하지 못한다("Expecting token of type --> RParen <--"). `ErrorType`에 NULL이 없어 `#NULL!`을 만들 수도 없다. | **엔진 한계.** 오류 코드는 다르다. 안내문은 "교집합 연산자(두 범위 사이의 공백)는 지원하지 않습니다…"로 미지원 기능임을 알린다(`errorMessages.ts` `usesIntersectionOperator`). 참조 사이 공백을 `+`로 바꿨을 때 문법이 맞는 경우에만 이 안내를 쓴다. 다른 문법 오류는 일반 안내를 유지한다. |

## 3. 원인을 재현해 확인한 차이 (D-4 ~ D-8)

엔진 결과를 직접 재현하고, 2차 골든 파일(`tests/fixtures/golden-formulas-2.xlsx`, 생성: `scripts/golden/make-golden-formulas-2.mjs`)을 웹 Excel로 계산한 `golden-excel-calculations-2.xlsx`(2026-10-23)와 대조해 Excel 값을 확인했다. 대조 테스트는 `tests/unit/engine/golden-excel-2.test.ts`다.

| ID | 내용 | 수정 전 엔진 | Excel (2차 골든) | 상태 |
|---|---|---|---|---|
| D-4 | 수식 안의 지수 표기 숫자 | `=1E+3` → `#ERROR!` ("Redundant input, expecting EOF but found: E") | 1000. 파일에 저장할 때 수식 글자도 `=1000`으로 바뀐다 | **해결.** 어댑터가 엔진에 넣기 전에 숫자 토큰만 풀어 쓴다(`formulaPreprocess.ts`). 셀 주소(E1, AE10), 큰따옴표 문자열, 작은따옴표 시트 이름 안의 글자는 바꾸지 않는다. 엔진이 돌려주는 수식 원문(`getCellFormula`)은 풀어 쓴 모양이다(Excel과 같다). |
| D-5 | 순환 참조 결과 | `#CYCLE!` | **빈 문자열.** 웹 Excel은 값을 계산하지 않고 빈 문자열로 저장했다(이전 기록의 "경고 후 0"은 정정) | S-09 무한 루프 방어와 학습 안내를 위해 의도적으로 `#CYCLE!`로 표시한다. 테스트는 Excel 값이 빈 문자열인지와 엔진 값이 `#CYCLE!`인지 둘 다 검사한다. |
| D-6 | 숫자를 문자열로 바꾸는 방식 | `="x"&(0.1+0.2)` → `x0.30000000000000004` | `x0.3` (유효 숫자 15자리) | **일부 해결.** CONCAT·CONCATENATE·TEXTJOIN·LEN은 어댑터가 15자리 규칙을 적용한다. `&` 연산자는 엔진 한계로 D-9에 기록했다. LEFT, RIGHT, MID, FIND, SEARCH, SUBSTITUTE, REPLACE, REPT, UPPER, LOWER, PROPER, CLEAN, TRIM, EXACT도 같은 규칙을 적용했으나 Excel 실측 전이다("다음 골든 라운드 확인 목록" 1번). |
| D-7 | INDEX 행·열 번호 0 | `#VALUE!` (INDEX 전용 안내) | 행·열 전체를 배열로 돌려준다 (`SUM(INDEX(B2:C6,0,2))` = 8200 등) | **엔진 한계로 남김.** 배열 반환은 지원하지 않는다. 테스트는 이 시트에서 엔진이 `#VALUE!`를 돌려주는지 검사한다. 여러 행·열 범위에 번호 하나만 준 `=INDEX(Data!A2:C6,2)`는 웹 Excel이 `#REF!`를 돌려줘(관찰값) 어댑터가 같게 처리한다. |
| D-8 | Excel에는 있지만 엔진에 없는 함수 | `#NAME?` | 계산됨 (AVERAGEIFS 81.5, RANK 1, XMATCH 3, LOOKUP "B", MODE 12, INDIRECT 12, NUMBERVALUE 1234.5, TEXTBEFORE "a" 등) | **엔진 한계로 남김.** AVERAGEIFS, RANK, RANK.EQ, XMATCH는 대체 방법을 안내한다(`supportedFunctions.ts` `KNOWN_UNSUPPORTED_FUNCTIONS`). 그 밖에도 입력하면 "지원하지 않는 함수입니다: 이름"으로 알린다. OFFSET은 `isFunctionSupported`는 false이지만 단순 사례는 계산된다. |

### 2차 기준 파일의 비교 방법

D-4처럼 Excel이 저장할 때 수식 글자를 바꾸는 항목이 있어, 1차 테스트와 다르게 비교한다 (규칙 전문: `make-golden-formulas-2.mjs` 머리 주석).

- 엔진에 넣는 수식은 **2차 원본 파일(`golden-formulas-2.xlsx`)의 수식**이다. Excel 저장본의 수식을 넣으면 `=1E+3`이 `=1000`으로 바뀐 채 들어가 D-4가 가려진다. Excel 값은 셀 주소로 짝지어 읽는다.
- 수식 글자는 비교하지 않는다. 입력 셀은 원본과 같아야 하고 수식 셀의 개수·주소도 같아야 한다. 배열 수식(DynamicArrays 시트)은 Excel이 펼친 범위의 셀을 값으로 저장하므로 그 범위는 입력 검사에서 뺀다. Excel은 한 칸짜리 배열 범위를 `D2:D2`가 아니라 `D2`로 저장한다.
- 값은 1차와 같이 숫자 허용 오차 1e-9, 그 밖에는 정확히 일치. 각 행 E열의 "비교 방식"이 `값`이면 일치해야 하고, `차이기록`(D-7, D-8 시트)이면 일치하거나 그 시트에 기록된 오류 코드여야 하며, `Excel만`(D-5)이면 Excel 값을 기록과 대조하고 엔진은 `#CYCLE!`여야 한다.
- TODAY·NOW는 값을 비교하지 않고 `=TODAY()-INT(NOW())`처럼 결과가 늘 같은 식으로 검사한다.
- 배열 수식은 구형 배열 수식(`t="array"`)으로 썼다. 그래서 Excel이 `#CALC!`를 `#VALUE!`로 저장했을 수 있다(D-12).

### 2차 골든 대조에서 고친 차이

처음 대조에서 46개 셀(배열 결과 칸 포함)이 달랐다. 그중 31개를 고쳤고 15개는 아래 D-9~D-14로 기록했다.

| 내용 | 수식 | 수정 전 엔진 | Excel | 처리 |
|---|---|---|---|---|
| INT 음수 | `=INT(-1.5)` | -1 | -2 | 내림으로 교체(`excelCompatPlugin.ts`). HyperFormula는 음수를 0 쪽으로 잘랐다. |
| ROUND 이진 경계값 | `=ROUND(1.005,2)`, `=ROUND(0.285,2)` | 1, 0.28 | 1.01, 0.29 | 값을 15자리 십진수로 보고 반올림(`excelFormat.ts`). ROUNDUP·ROUNDDOWN도 같은 방식으로 교체. |
| ROUND 소수 자릿수 | `=ROUND(3.14159,2.9)` | 3.141018902426448 | 3.14 | 자릿수를 정수로 버린다. |
| EDATE 윤년 | `=EDATE(DATE(2024,1,31),1)`, `=EDATE(DATE(2024,3,31),-1)` | 2024-02-28 | 2024-02-29 | 일수 상한 표가 평년 기준이던 것을 윤년을 아는 계산으로 교체. |
| DATEDIF 소문자 단위 | `=DATEDIF(…,"y")` | `#NUM!` | 23 | 단위를 대문자로 바꿔 처리. |
| MATCH 와일드카드 | `=MATCH("사*",Data!A2:A6,0)` | `#N/A` | 1 | 정확히 일치(0)에서 `*`, `?`, `~` 지원. |
| INDEX 번호 하나 | `=INDEX(Data!A2:C6,2)` | 배 | `#REF!` | 여러 행·열 범위에서 열 번호가 없으면 `#REF!`. |
| FILTER | 여러 열 원본, 세 번째 인수, 일치 없음 대체 값 | `#N/A` 등 | 3행×2열, `if_empty`, 대체 값 | Excel 규칙(`FILTER(배열, 조건, [일치 없을 때 값])`)으로 교체. 가로 방향 조건도 지원. |
| 숫자→문자열 | `=CONCATENATE("x",0.1+0.2)`, `=LEN(0.1+0.2)`, `=LEN(1/3)`, `=TEXTJOIN(",",TRUE,0.1+0.2,1/3)` | 17자리 | 15자리 | 15자리 규칙으로 교체. |
| 지수 표기 | `=1E+3`, `=2.5E-1`, `="x"&1E+3` 등 7개 | `#ERROR!` | 1000, 0.25, `x1000` | D-4 참고. |
| TEXT | `=TEXT(1234.5,"#,##0.00")`, `=TEXT(0.256,"0%")` | `1235,##0.00`, `0%` | `1,234.50`, `26%` | 아래 "TEXT 함수" 참고. |

### 2차 골든에서 기록한 차이 (D-9 ~ D-14)

`golden-excel-2.test.ts`의 `DOCUMENTED_DIFFERENCES`가 이 표의 행을 그대로 담는다. 셀 주소와 수식이 모두 같은 셀 하나만 예외이고, 그 셀도 Excel 값과 엔진 값이 각각 표와 같은지 검사한다. 어느 쪽이 바뀌어도 테스트가 실패한다.

| ID | 골든 셀 | 수식 | Excel | 엔진 | 분류 | 원인과 학습 화면 안내 |
|---|---|---|---|---|---|---|
| D-9a | D6_NumToText!C2 | `="x"&(0.1+0.2)` | `x0.3` | `x0.30000000000000004` | 엔진 한계 | `&` 연산자가 숫자를 문자열로 바꿀 때 HyperFormula 내부 변환(`coerceScalarToString`, JS 기본 변환)을 직접 쓰며 공개 API로 바꿀 수 없다. 콘텐츠 작성 지침(CURRICULUM.md)에 "소수 결과를 `&`로 잇는 예제는 피하거나 ROUND를 먼저 적용한다"를 추가했다. |
| D-9b | D6_NumToText!C5 | `="x"&(1/3)` | `x0.333333333333333` | `x0.3333333333333333` | 엔진 한계 | D-9a와 같다. |
| D-9c | D6_NumToText!C6 | `="x"&(2/3)` | `x0.666666666666667` | `x0.6666666666666666` | 엔진 한계 | D-9a와 같다. |
| D-9d | D6_NumToText!C7 | `="x"&(1/7)` | `x0.142857142857143` | `x0.14285714285714285` | 엔진 한계 | D-9a와 같다. |
| D-9e | D6_NumToText!C11 | `="x"&(10^20)` | `x1E+20` | `x100000000000000000000` | 엔진 한계 | D-9a와 같다. Excel은 큰 수를 지수 표기로 이어 붙인다. |
| D-9f | D6_NumToText!C12 | `="x"&(1/10000000)` | `x0.0000001` | `x1e-7` | 엔진 한계 | D-9a와 같다. |
| D-10a | D6_NumToText!C8 | `="x"&1234567890123456` | `x1234567890123450` | `x1234567890123456` | 이번에 고치지 않음 | Excel은 수식에 입력한 숫자 상수를 16번째 자리부터 0으로 바꿔 저장한다(파일의 수식도 `…450`으로 바뀌어 있었다). 어댑터의 숫자 토큰 전처리에서 처리할 수 있으나 실사용 영향이 작아 미뤘다. |
| D-10b | D6_NumToText!C9 | `="x"&123456789012345678` | `x123456789012345000` | `x123456789012345680` | 이번에 고치지 않음 | D-10a와 같다. |
| D-11 | D6_NumToText!C18 | `=(0.1+0.2)=0.3` | TRUE | FALSE | 엔진 한계 | Excel은 비교할 때 15자리까지만 본다. HyperFormula의 비교 허용 오차(`precisionEpsilon`)는 `smartRounding`이 켜져야 쓰이는데, 켜면 모든 계산 결과가 반올림되어 다른 항목이 어긋난다(4장). |
| D-12 | DynamicArrays!E2 | `=FILTER(Data!F2:F7,Data!H2:H7="없음")` | `#VALUE!` | `#N/A` | 엔진 한계 / 웹 Excel 관찰값 | 일치하는 값이 없을 때 Excel(동적 배열)은 `#CALC!`를 돌려주지만 HyperFormula에는 그 오류 코드가 없다. 2차 골든에서는 구형 배열 수식으로 써서 `#VALUE!`로 저장됐다. 두 값 모두 오류이고 안내문은 "조건에 맞는 값이 없거나…"로 알린다. |
| D-13 | DynamicArrays!N2 | `=UNIQUE(Data!D2:D6)` | 0 | 빈 값 | 이번에 고치지 않음 | 범위 안 빈 셀이 결과에 섞이면 Excel은 0으로 표시하고 엔진은 빈 칸으로 둔다. UNIQUE를 교체해야 해 비용이 크다. |
| D-14a | Text!C16 | `=TRIM(CHAR(160)&"a")` | `"a"` | `U+00A0 + "a"` | 미확인 (웹 Excel 관찰값) | 줄바꿈 없는 공백(160)을 웹 Excel의 TRIM이 지웠다. 데스크톱 Excel 문서는 지우지 않는다고 설명하므로 환경 차이일 수 있어 고치지 않았다. |
| D-14b | DateTime!C44 | `=DATEDIF(DATE(2000,5,15),DATE(2024,3,15),"YD")` | 304 | 305 | 미확인 (웹 Excel 관찰값) | 표본이 한 건이라 Excel의 "YD" 계산 규칙을 알 수 없다. 추가 표본이 필요하다. |
| D-14c | Aggregate!C42 | `=AND(1,"a")` | TRUE | `#VALUE!` | 미확인 (웹 Excel 관찰값) | 웹 Excel이 직접 입력한 문자 인수를 무시한 것으로 보이나 문서와 달라 확인이 필요하다. |
| D-14d | Aggregate!C44 | `=OR(Data!H2:H3)` | `#VALUE!` | FALSE | 미확인 (웹 Excel 관찰값) | 논리값이 하나도 없는 범위에 Excel은 `#VALUE!`를 돌려줬다. D-14c와 함께 확인한다. |

### TEXT 함수

HyperFormula의 TEXT는 서식 문자열 일부를 해석하지 못하고도 오류 없이 틀린 값을 돌려줬다(`=TEXT(1234.5,"#,##0.00")` → `1235,##0.00`). 어댑터가 TEXT를 교체해 **아래 서식만 정확히 처리하고, 나머지는 `#VALUE!`와 "지원하지 않는 서식입니다" 안내**를 돌려준다(`excelFormat.ts`).

| 종류 | 지원하는 서식 | 예 |
|---|---|---|
| 숫자 | `0`, `00`·`000` 같은 앞자리 0, `0.0`·`0.00` 같은 소수 자릿수, `#,##0`, `#,##0.00` | `TEXT(1234.5,"#,##0.00")` → `1,234.50`, `TEXT(5,"000")` → `005` |
| 백분율 | `0%`, `0.0%` 같은 소수 자릿수 | `TEXT(0.256,"0%")` → `26%` |
| 날짜 | `yyyy`, `yy`, `mm`, `m`, `dd`, `d`와 구분 기호 `-` `/` `.` 공백의 조합(대소문자 무시) | `TEXT(DATE(2024,3,15),"yyyy-mm-dd")` → `2024-03-15`, `"m/d"` → `3/15` |

지원하지 않는 예: 시간(`hh:mm`), 월·요일 이름(`mmm`, `dddd`), 통화(`₩#,##0`), 한글 문구 포함(`yyyy"년"`), 조건·색 서식, `0.0E+00`. 전체 서식 해석기는 **Phase 7 셀 서식 카드(CARD-07B 차트·서식 작업과 함께)**로 넘긴다.

### 다음 골든 라운드 확인 목록

아래는 **Excel로 아직 확인하지 않았거나 확인 결과를 해석할 수 없어서** 다음 골든 파일(3차)에 넣어 확인할 항목이다. 1~2번은 코드가 이미 바뀌었지만 기대값을 Microsoft 문서의 함수 설명과 규칙에서 계산했을 뿐 Excel 실측 값이 아니다. 3번 이후는 2차 골든에서 Excel 값을 얻었으나 원인을 모르는 항목이다. 확인되면 해당 행을 이 목록에서 지우고 본문(D-번호 또는 해결한 차이 표)으로 옮긴다.

| # | 항목 | 현재 상태 | 3차에서 넣을 수식 (예) | 확인할 것 |
|---|---|---|---|---|
| 1 | LEFT, RIGHT, MID, FIND, SEARCH, SUBSTITUTE, REPLACE, REPT, UPPER, LOWER, PROPER, CLEAN, TRIM, EXACT에 숫자·논리값 인수 | 어댑터가 숫자를 유효 숫자 15자리 문자열로 바꿔 계산한다(`excel-compat.test.ts`의 기대값은 문서 기준, Excel 실측 전) | `=LEFT(0.1+0.2,5)`, `=RIGHT(1/3,3)`, `=MID(1/3,3,4)`, `=FIND("3",0.1+0.2)`, `=SEARCH(".?",1/3)`, `=SUBSTITUTE(1/3,"3","x")`, `=REPLACE(0.1+0.2,3,1,"x")`, `=REPT(0.1+0.2,2)`, `=UPPER(TRUE)`, `=EXACT(0.1+0.2,0.3)` | 15자리 규칙이 이 함수들에도 적용되는지, 논리값이 `TRUE`로 바뀌는지 |
| 2 | 아주 크거나 작은 수의 문자열 변환 | 현재 JavaScript 규칙(1e21 이상, 1e-6 미만만 지수 표기). 2차 골든: `10^15`는 `1000000000000000`, `10^20`은 `1E+20`, `1/10000000`은 `0.0000001`(D-9e, D-9f) | `="x"&10^16`, `10^17`, `10^18`, `10^19`, `1E+21`, `1/100000`, `1E-9`, `1E-10`, `1E-11`, 음수 | Excel이 지수 표기로 바꾸는 경계(큰 수와 작은 수 각각). CONCAT·CONCATENATE·TEXTJOIN·LEN·1번 함수가 같은 경계를 쓰게 된다 |
| 3 | TRIM의 줄바꿈 없는 공백 (D-14a) | 웹 Excel은 `CHAR(160)`을 지웠다. 엔진은 지우지 않는다 | `=TRIM(CHAR(160)&"a")`, `=LEN(TRIM(CHAR(160)))`, `=TRIM(" "&CHAR(160)&" a")`, `=CODE(CHAR(160))`, `=UNICODE(CHAR(160))` | 웹 Excel의 `CHAR(160)`이 실제로 U+00A0인지, TRIM이 U+00A0까지 지우는 건지. 가능하면 데스크톱 Excel로도 확인 |
| 4 | DATEDIF `"YD"` (D-14b) | 표본 한 건(2000-05-15 ~ 2024-03-15): Excel 304, 엔진 305 | 시작·끝의 월·일 순서와 윤년 포함 여부를 바꾼 표본 10건 이상, 예: 같은 해 안, 끝 날짜가 먼저인 달, 2월 29일 시작/끝, 윤년 경계를 넘는 경우 | Excel의 "YD" 계산 규칙(끝 연도 대체 방식, 윤일 처리). 규칙이 나오면 어댑터 `datedif`를 고친다 |
| 5 | AND·OR의 문자 처리 (D-14c, D-14d) | 웹 Excel: `=AND(1,"a")` TRUE, `=OR(문자만 있는 범위)` `#VALUE!`. 엔진은 `#VALUE!`, FALSE | `=AND(1,"a")`, `=AND(1,"TRUE")`, `=AND("a")`, `=OR("a")`, `=OR(0,"a")`, `=AND(TRUE,범위(문자 포함))`, `=AND(범위(문자만))`, 빈 셀만 있는 범위 | 직접 입력한 문자 인수와 범위 안의 문자를 어떻게 다루는지. 문서와 다르면 웹 Excel만의 동작인지 |
| 6 | FILTER 일치 없음 (D-12) | 웹 Excel이 구형 배열 수식에서 `#VALUE!`로 저장했다. 동적 배열의 `#CALC!`인지 알 수 없다 | 동적 배열로 저장되는 `=FILTER(범위,조건)`(일치 없음), 같은 수식을 `=IFERROR(...)`, `=ISERROR(...)`, `=ERROR.TYPE(...)`로 감싼 셀 | 일치 없음이 `#CALC!`(오류 유형 14)인지, 구형 배열에서 `#VALUE!`로 바뀌는지. 3차 파일은 동적 배열(`cm` 속성)로 쓰는 방법을 정해야 한다 |
| 7 | 이미 기록한 차이 (D-10, D-13) | 이번에 고치지 않기로 한 항목 | D-10: 16자리 이상 숫자 상수를 여러 길이로. D-13: UNIQUE 대상에 빈 셀이 있는 경우와 `SORT`, `FILTER` 결과에 빈 셀이 섞이는 경우 | 15자리 절삭 규칙의 정확한 범위, 배열 함수 결과의 빈 셀이 0으로 바뀌는 범위 |
| 8 | 어댑터가 문서 규칙으로 구현한 세부 동작 | `SUBSTITUTE`의 빈 검색어, `REPT` 32,767자 경계, `FIND`·`SEARCH` 시작 위치 오류, `MATCH` 와일드카드 이스케이프(`~*`), `EDATE`의 소수 개월, `TEXT`의 음수·반올림 | `=SUBSTITUTE("a","","x")`, `=REPT("a",32767)`, `=FIND("a","abc",4)`, `=MATCH("a~*b",범위,0)`, `=EDATE(DATE(2024,1,15),1.9)`, `=TEXT(-1234.5,"#,##0.00")`, `=TEXT(1.005,"0.00")` | 문서만 보고 구현했으므로 Excel 값과 같은지 |

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
