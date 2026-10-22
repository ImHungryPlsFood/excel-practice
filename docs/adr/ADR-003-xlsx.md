# ADR-003: XLSX 파일 처리 및 보안 격리 파이프라인 (XLSX Processing & Security)

- **문서 번호:** ADR-003
- **상태:** 채택됨 (Accepted)
- **작성일자:** 2026-10-22
- **작성자:** 수석 소프트웨어 아키텍트

---

## 1. 배경 및 맥락 (Context)

`docs/MASTER_PROMPT.md` 제2.2장, 제4.5장, 제8.3장 및 본 보강 지침(2.3절)에 따라, 사용자의 로컬 Excel 파일(`.xlsx`)을 연습실(Sandbox)로 가져오거나 학습 결과를 내보내는 기능이 요구된다.
그러나 오픈소스 스프레드시트 파서 생태계에는 심각한 공급망 및 보안 취약점이 존재한다:
1. **공식 npm 레지스트리의 `xlsx` 패키지는 `0.18.5`에서 업데이트가 중단됨.**
2. **SheetJS `0.19.2` 이하 버전에는 조작된 파일 파싱 시 발생하는 Prototype Pollution 취약점(CVE-2023-30533)이 존재함.**
3. SheetJS의 공식 최신 배포처는 `https://cdn.sheetjs.com`이다.
4. 사용자가 업로드하는 임의의 `.xlsx` 파일은 원격 코드 실행, DoS(브라우저 프리징), 프로토타입 오염을 시도할 수 있는 **신뢰할 수 없는 외부 입력(Untrusted Input)**이다.

---

## 2. 결정 사항 (Decision)

### 2.1 패키지 조달 방식: npm 공식 배포처 금지 및 CDN Tarball 고정
- 표준 `npm install xlsx` 실행을 프로젝트 규칙(S-10)으로 **엄격히 금지**한다.
- `package.json`에 SheetJS 공식 CDN tarball의 SHA-512 무결성 해시가 포함된 특정 버전(v0.20.2 이상)을 명시적으로 고정하거나, 검증된 tarball을 `vendor/sheetjs/`에 안전하게 배치하여 참조한다:
  ```json
  "dependencies": {
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz"
  }
  ```
- lockfile(`package-lock.json`)을 필수 커밋하여 공급망 변조를 차단한다.

### 2.2 신뢰할 수 없는 파일 수신 및 방어 규칙

사용자가 업로드한 XLSX 파일은 다음 5단계 보안 게이트를 통과해야만 인메모리 스프레드시트 엔진에 로드된다:

1. **파일 크기 상한 (File Size Limit):**
   - 최대 **5MB** 초과 파일은 브라우저 FileReader 단계에서 즉시 거부 (`FileTooLargeError`).
2. **Web Worker 비동기 격리 (Isolated Execution):**
   - 파일 파싱은 메인 UI 스레드가 아닌 전용 Web Worker (`xlsx.worker.ts`) 내부에서 실행한다.
   - Worker 내부에서 `Object.freeze(Object.prototype)`를 선제 적용하여 혹시 모를 프로토타입 오염 공격을 원천 무력화한다.
3. **파싱 시간 초과 차단 (Timeout Protection):**
   - Worker 작업 시간 제한을 **5,000ms(5초)**로 설정한다. 초과 시 Worker를 즉시 강제 종료(`worker.terminate()`)하고 `ParseTimeoutError`를 반환하여 DoS 공격(Zip Bomb, 무한 재귀 참조)을 방어한다.
4. **시트 및 셀 수 상한 (Complexity Limits):**
   - 워크시트 수: 최대 **10개**.
   - 총 셀 수: 최대 **100,000개** (초과 시 파싱 중단 및 경고 알림).
5. **위험 요소 무시 및 제거 (Sanitization):**
   - VBA 매크로(`.xlsm` 바이너리 스트림, `bookVBA` 속성) 무조건 무시 및 삭제.
   - 외부 통합 문서 링크(External Link References) 무시.
   - DDE(Dynamic Data Exchange) 주입 공격 패턴(예: `=cmd|' /C ...'!A1`) 검출 시 해당 셀을 일반 텍스트 문자열로 강제 이스케이프.

---

## 3. Web Worker 파이프라인 아키텍처

```
[사용자 파일 업로드 (.xlsx)]
          │ (최대 5MB 검사)
          ▼
   [FileReader ArrayBuffer]
          │ (postMessage)
          ▼
┌──────────────────────────────────────────────┐
│  Dedicated Web Worker (xlsx.worker.ts)       │
│  - Object.freeze(Object.prototype)          │
│  - 5초 타임아웃 워치독                        │
│  - SheetJS v0.20.2 파싱                      │
│  - 매크로/외부링크/DDE 필터링                │
│  - 순수 데이터 JSON 추출                     │
│    (Record<string, CellValue[][]>)           │
└──────────────────────────────────────────────┘
          │ (Structured Clone 반환)
          ▼
[FormulaEngine 어댑터 초기화]
          │
          ▼
[React Spreadsheet UI 렌더링]
```

---

## 4. 파급 효과 및 검증 (Consequences & Verification)

- **보안성:** 브라우저 메인 스레드 프리징 0건, CVE-2023-30533 취약점 원천 방어, DDE 인젝션 차단.
- **성능:** 대용량 파일 파싱 중에도 튜토리얼 UI 및 다른 컴포넌트의 60fps 반응성 유지.
- **검증 테스트:** 악성 샘플(비정상 XML, 100만 행 데이터, Zip Bomb 더미)을 `tests/fixtures/malicious/`에 배치하고 격리 파서 단위 테스트(`tests/unit/xlsx-security.test.ts`)를 Phase 7 착수 전 필수 통과시킨다.

