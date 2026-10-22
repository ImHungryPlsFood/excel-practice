# CELLCRAFT 위협 모델링 및 보안 아키텍처 (THREAT_MODEL)

- **문서 버전:** 1.1.0
- **최종 수정일:** 2026-10-22 (사용자 결정 사항 확정 반영)
- **작성자:** 수석 소프트웨어 아키텍트 & 보안 검수자
- **상태:** 확정 (Approved for Implementation)

---

## 1. 자산, 공격자, 공격 경로 및 대응 개요 (STRIDE 기반 위협 행렬)

| 위협 ID | 대상 자산 (Asset) | 공격자 (Attacker) | 공격 경로 (Attack Vector) | 완화 대책 (Mitigation) | 검증 테스트 (Verification Test) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-01** | 사용자 개인정보 및 학습 진도 | 악의적 사용자 / 크롤러 | Firestore REST API로 타인 UID 경로 직접 읽기/쓰기 시도 (S-01, S-13) | `request.auth.uid == userId` 소유권 강제, Default Deny | 규칙 단위 테스트 (`rules-unit-testing`) 타인 UID 읽기/쓰기 거부 확인 |
| **T-02** | 정답 및 채점 기준표 | 일반 수험생 / 시험 응시자 | 프런트엔드 번들 및 네트워크 패킷 분석 (S-02, S-04) | 공용 콘텐츠 컬렉션 쓰기 차단, 자격증 시험 모드는 제출 후 결과 확인 | 네트워크 페이로드 검사 및 클라이언트 번들 내 시험 정답 원문 노출 차단 테스트 |
| **T-03** | 경험치(XP) 및 업적 점수 | 스크립트 작성자 / 봇 | Firestore 클라이언트 SDK로 `xp: 999999` 직접 쓰기 시도 (S-03, ADR-004) | 단조 증가 검증, 1회 상한(50XP), 5초 간격 제한 / 전체 사용자 순위표 제작 금지 | 규칙 테스트: 비정상 XP 폭증 쓰기 시 Firestore 규칙 차단 확인 |
| **T-04** | 클라이언트 브라우저 런타임 | 악성 파일 배포자 | 악의적으로 조작된 `.xlsx` 파일 업로드 (Prototype Pollution, DoS) (S-09, ADR-003) | 5MB 크기 제한, SheetJS 최신 CDN 고정, Web Worker 격리, 5초 타임아웃, `Object.freeze` | 악성 zip bomb 및 프로토타입 오염 샘플 파싱 테스트 시 메인 스레드 무영향 검증 |
| **T-05** | 브라우저 DOM 세션 | 외부 공격자 (XSS) | 셀 값, 수식 결과, 설명문에 스크립트 태그 삽입 (`<img onerror=...>`) (S-08) | `dangerouslySetInnerHTML` 전면 금지, DOMPurify 화이트리스트 렌더링 | XSS 벡터 문자열 셀 입력 E2E 테스트에서 단순 텍스트 이스케이프 확인 |
| **T-06** | 수식 연산 엔진 | 악의적 사용자 | 악의적인 수식(`=REPT("A", 10^8)`) 또는 무한 순환 수식 입력 (S-09) | 수식 최대 길이(1,000자), Worker 계산 시간 제한(2초), 순환 참조(Cycle) 감지기 | 순환 참조 수식 및 대규모 수식 입력 시 `#CYCLE!` 또는 에러 반환 검증 |
| **T-07** | Firebase 인프라 및 API Quota | 자원 고갈 공격자 | API Key를 도용하여 외부 도메인에서 Firebase API 무한 호출 (S-05, S-06) | Google Cloud 콘솔 HTTP Referrer 제한, Firebase App Check (reCAPTCHA Enterprise) | 승인되지 않은 도메인 및 App Check 토큰 누락 요청 차단 확인 |
| **T-08** | 소스코드 공급망 (Supply Chain) | 공급망 침해자 | 취약한 npm 패키지 설치, `.env` 비밀키 커밋 (S-10, S-11) | `package-lock.json` 필수 커밋, `npm audit` CI 게이트, git-secrets 비밀값 스캔 | CI 파이프라인 취약점 검출 및 `.gitignore` 누락 여부 검사 |

---

## 2. 보안 상세 명세 (S-01 ~ S-14)

### [S-01] Firestore 규칙 기본 거부 (Default Deny) 및 소유권 강제
- 모든 Firestore 규칙은 루트에서 기본 거부로 시작한다:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if false;
      }
      
      // 사용자 개인 데이터 영역
      match /users/{userId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.auth.uid == userId
          && request.resource.data.keys().hasOnly(['uid', 'email', 'createdAt', 'updatedAt', 'profile', 'stats'])
          && request.resource.data.createdAt == request.time;
        allow update: if request.auth != null && request.auth.uid == userId
          && request.resource.data.uid == resource.data.uid // UID 변경 불가
          && request.resource.data.createdAt == resource.data.createdAt // 생성 시각 변경 불가
          && request.resource.data.updatedAt == request.time;
      }
    }
  }
  ```

### [S-02] 공용 콘텐츠 클라이언트 읽기 전용
- 문제(`problems`), 교육과정(`courses`), 튜토리얼 스키마(`tutorials`)는 모든 인증/비인증 사용자에게 읽기 전용으로 열리며, 클라이언트를 통한 쓰기(`create`, `update`, `delete`)는 무조건 차단한다.
  ```javascript
  match /courses/{courseId} {
    allow read: if true;
    allow write: if false; // 관리자 SDK(Admin SDK)로만 배포 가능
  }
  match /problems/{problemId} {
    allow read: if true;
    allow write: if false;
  }
  ```

### [S-03] 경험치(XP) 및 업적 조작 방지 규칙 & 전체 순위표 금지
- **아키텍처 확정:** 사용자 결정(2026-10-22)에 따라 **서버 없는 규칙 제한형 모델(ADR-004)**을 공식 채택한다.
- **Firestore 쓰기 상한 강제:**
  ```javascript
  match /users/{userId}/stats/progress {
    allow read: if request.auth != null && request.auth.uid == userId;
    allow update: if request.auth != null && request.auth.uid == userId
      // 단조 증가 및 1회 최대 50 XP 상한
      && request.resource.data.xp >= resource.data.xp
      && request.resource.data.xp <= resource.data.xp + 50
      // 마지막 문제 해결 시간으로부터 최소 5초 경과
      && request.time > resource.data.lastSolvedAt + duration.value(5, 's')
      && request.resource.data.lastSolvedAt == request.time;
  }
  ```
- **[절대 금지 규칙] 전체 사용자 순위표(Global Leaderboard) 개발 금지:**
  - 본 모델 하에서는 스크립트를 통한 5초당 50XP 취득을 원천 봉쇄할 수 없으므로, XP가 조작 가능함을 문서에 정직하게 인정한다.
  - 따라서 **전체 사용자 순위표(Leaderboard) 및 공정성이 필수인 글로벌 경쟁 기능은 절대 개발하지 않는다.** XP는 오직 개인의 자기주도적 학습 진도 관리용으로만 사용된다.

### [S-04] 정답 노출 방지 및 시험 모드 분리
- **일반 학습 모드(Level 0~8):** 즉각적인 피드백과 힌트 학습이 목적이므로 검증 기준이 클라이언트 채점기에 로드되나, 정답 문자열 원본을 평문 노출하지 않고 기대값 해시 및 셀 결과 조건식으로 평가.
- **컴퓨터활용능력 모의시험 모드(Level 9):** 시험 진행 중에는 클라이언트 화면에 정답과 해설을 일체 전달하지 않으며, 최종 '시험 제출' 버튼 클릭 시에만 결과를 집계하여 노출.

### [S-05] Firebase App Check 도입
- 웹 애플리케이션에 **reCAPTCHA Enterprise** 기반 App Check를 적용한다.
- 배포 초기에는 메트릭 모니터링 모드(`enforcement: false`)로 수집 후, 정상 트래픽 비율 확인 뒤 강제 차단(`enforcement: true`)으로 전환한다.
- 로컬 개발 환경(`localhost`)에서는 `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`를 선언하고, 콘솔에 등록된 디버그 토큰을 사용한다.
- *비용 알림:* 월 1만 회 평가까지 무료이며 초과 시 \$1/1000회 비용 발생을 모니터링한다.

### [S-06] API 키 및 도메인 보안 설정 체크리스트
- `firebaseConfig`의 `apiKey`, `authDomain`, `projectId`는 브라우저에 공개되는 식별자임을 명시한다.
- **Google Cloud 콘솔 보안 체크리스트:**
  1. API Key 애플리케이션 제한을 **HTTP 리퍼러(웹사이트)**로 설정: `https://<프로젝트명>.netlify.app/*` 및 커스텀 도메인만 등록.
  2. API 제한사항(API Restrictions)을 설정하여 `Firebase Authentication`, `Cloud Firestore API`, `reCAPTCHA Enterprise API`만 허용.
  3. Firebase Authentication의 "승인된 도메인(Authorized Domains)" 목록에 불필요한 도메인 제거.
- **Vite 환경 변수 원칙:**
  - `VITE_` 접두사가 붙은 모든 변수는 클라이언트 번들에 평문 포함된다. 비밀 키(Private Key, Admin Secret)에 절대 `VITE_`를 붙이지 않는다.

### [S-07] Netlify 배포 보안 헤더 및 SPA 리디렉션
`public/_headers` 및 `netlify.toml`에 다음 보안 헤더를 강제 적용한다:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://apis.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.googleusercontent.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://cdn.sheetjs.com; frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=()"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
*(주의: SPA 리디렉션 상태 코드는 301이 아닌 200 rewrite여야 함)*

### [S-08] XSS (Cross-Site Scripting) 원천 차단
- React JSX 기본 이스케이프 메커니즘을 100% 신뢰한다.
- 셀 데이터 렌더링, 수식 파싱 결과, 문제 설명에서 `dangerouslySetInnerHTML` 사용을 **ESLint 규칙(`react/no-danger: error`)으로 강제 금지**한다.
- 서식 텍스트(Markdown 또는 안전한 HTML 강조 태그)가 필요한 문제 설명 영역은 `DOMPurify` 화이트리스트(`<b>`, `<i>`, `<code>`, `<kbd>`, `<span class="...">`)를 통과한 결과만 렌더링한다.

### [S-09] 수식 엔진 남용 및 자원 고갈(DoS) 방지
- 단일 수식 최대 입력 길이: **1,000자** 제한.
- 시트 최대 행/열: **1,000행 × 50열** (실습 모드 기준).
- 순환 참조(Circular Reference) 방어: 수식 파싱 단계에서 DAG 순환 참조 감지 시 즉시 `#CYCLE!` 오류 반환 및 연산 중단.
- 무거운 연산(재계산 및 대규모 셀 갱신)은 Web Worker에서 실행하며 워치독 타임아웃 **2,000ms** 적용.
- 코드베이스 전역에서 `eval()`, `new Function()`, `setTimeout(string)` 사용을 ESLint(`no-eval: error`, `no-new-func: error`)로 전면 차단.

### [S-10] 공급망 보안 및 GPLv3 호환성 감사
- `package-lock.json`을 Git에 필수 커밋한다.
- 모든 의존성은 `package.json`에서 정확한 버전(Exact Version)으로 고정한다.
- CI 파이프라인에서 `npm audit --audit-level=high`를 실행하여 고위험 취약점 발견 시 빌드를 실패 처리한다.
- HyperFormula의 GPLv3 라이선스 채택에 따라, 모든 의존성 패키지의 라이선스가 GPLv3와 법적으로 호환되는지 점검하는 `npm run audit:licenses` 단계를 포함한다.

### [S-11] 비밀 정보 유출 방지 (Secret Scanning)
- `.gitignore` 파일에 다음 항목을 엄격히 지정한다:
  ```gitignore
  .env
  .env.local
  .env.*.local
  *.pem
  serviceAccountKey.json
  firebase-debug.log
  ```
- `.env.example`만 저장소에 커밋하며, 변수명과 플레이스홀더만 기록한다.
- Git Pre-commit 훅 또는 CI에 비밀값 탐지 도구 검사를 구성한다.

### [S-12] 가입 연령 정책 (만 14세 이상) 및 개인정보 최소 수집
- **가입 연령 정책 확정 (사용자 결정 2026-10-22):**
  - **만 14세 이상만 계정 가입을 허용**한다. 회원가입 폼에 *"만 14세 이상 이용자입니다 (필수)"* 확인 체크박스를 의무화하고 미체크 시 가입을 차단한다.
- **체험 모드(무계정 모드) 개인정보 원칙:**
  - 만 14세 미만 사용자 또는 계정이 없는 사용자는 로그인 없는 **'체험 모드(Guest Practice Mode)'**를 이용하도록 안내한다.
  - **체험 모드에서는 일체의 개인정보(이메일, 이름, IP 추적 등)를 서버에 수집·저장하지 않는다.** 모든 실습 데이터는 브라우저 로컬 저장소(localStorage / IndexedDB)에만 임시 보관된다.
- **계정 삭제 및 데이터 내보내기:**
  - 계정 삭제(회원 탈퇴) 시 해당 사용자의 `users/{uid}` 및 하위 컬렉션 전체 데이터를 영구 삭제하는 트랜잭션을 제공한다.
  - 사용자의 모든 학습 기록을 JSON 파일로 다운로드할 수 있는 "데이터 내보내기" 기능을 제공한다.

### [S-13] 인증 보안 및 계정 보호
- 이메일 열거 방지(Email Enumeration Protection): 로그인 실패 시 "존재하지 않는 이메일입니다"와 "비밀번호가 틀렸습니다"를 구분하지 않고, 항상 **"이메일 또는 비밀번호가 올바르지 않습니다"**로 메시지 통일.
- 비밀번호 정책: 최소 8자 이상, 영문 대/소문자, 숫자, 특수문자 중 2종 이상 조합 강제.
- 비밀번호 재설정: Firebase Auth 공식 OOB 비밀번호 재설정 이메일 흐름 준수.

### [S-14] 보안 규칙 자동화 테스트 (Local Emulator Suite)
- `@firebase/rules-unit-testing` 라이브러리를 사용하여 Firestore 규칙 테스트 스위트(`tests/rules/firestore.rules.test.ts`)를 구축한다.
- 필수 검증 시나리오 5종:
  1. 본인 UID 문서 읽기/쓰기 허용 (`alice`가 `users/alice` 쓰기 성공).
  2. 타인 UID 문서 읽기/쓰기 거부 (`bob`이 `users/alice` 읽기/쓰기 실패).
  3. 비인증 사용자의 개인 데이터 접근 거부 (`unauthenticated` 요청 차단).
  4. 허용되지 않은 필드 주입 거부 (`role: 'admin'` 등 정의되지 않은 필드 추가 쓰기 실패).
  5. XP 임의 폭증 거부 (기존 100 XP에서 200 XP로 변경 시 규칙 검증 실패).
- CI 파이프라인에서 Firebase Emulator를 백그라운드로 띄워 본 규칙 테스트를 자동 통과해야 병합이 허용되도록 설계한다.
