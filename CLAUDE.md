# CELLCRAFT — Claude Code 개발자 지침서 (Developer Guidelines)

## 1. 프로젝트 개요
**CELLCRAFT**는 실제 스프레드시트 조작 기반의 인터랙티브 교육 플랫폼입니다.
- **최우선 원칙:** 사용자가 설명을 읽는 것만으로 완료할 수 없으며, 실제 셀에서 직접 작업하고 교란 채점기로 검증받아야 합니다.
- **주요 설계 문서:**
  - 작업 카드 및 인계 지침: [`docs/CLAUDE_CODE_HANDOFF.md`](docs/CLAUDE_CODE_HANDOFF.md)
  - 요구사항 추적표: [`docs/REQUIREMENTS_TRACE.md`](docs/REQUIREMENTS_TRACE.md)
  - 기술 아키텍처: [`docs/TECHNICAL_DESIGN.md`](docs/TECHNICAL_DESIGN.md)
  - 위협 모델 및 보안: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)
  - 테스트 및 품질 전략: [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md)
  - 의사결정 기록: [`docs/adr/`](docs/adr/)
  - 사용자 결정 항목: [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md)

---

## 2. 5대 절대 금지 규칙 (Strict Prohibitions)
1. **테스트 약화·삭제·스킵 금지:** 테스트를 통과시키기 위해 기대값을 임의로 낮추거나 `skip`/`only`를 사용하지 마십시오.
2. **정답 하드코딩 금지:** 채점기나 수식 엔진에 문제 ID별 정답을 하드코딩하여 우회 통과시키지 마십시오.
3. **오류 은폐 금지:** `@ts-ignore`, `@ts-nocheck`, 불필요한 `any` 남용, 빈 `catch(e) {}`, `eslint-disable`을 금지합니다.
4. **목업 완료 보고 금지:** 실제 동작하지 않는 가짜 UI/버튼을 구현해 두고 작업 카드를 완료로 처리하지 마십시오.
5. **package.json에 없는 패키지를 npx로 내려받아 실행하지 않는다. 필요하면 먼저 사용자에게 묻는다.**

---

## 3. 개발 환경 및 필수 명령어
- **운영체제 및 프로젝트 위치:** Windows 11 (VS Code) — 작업 경로: `C:\dev\Excel Practice`
  - 모든 스크립트는 공백 경로(`Excel Practice`)를 따옴표(`"..."`)로 감싸 처리.
  - **주의:** OneDrive, Dropbox 등 클라우드 동기화 폴더 내부에서 `npm install` 실행 절대 금지 (파일 잠금 및 node_modules 손상 방지).
- **Node.js:** Node LTS 24 (`.nvmrc`: `24`, `package.json` engines: `>=24.0.0`)
  - *결정 근거:* nodejs.org 공식 릴리스 일정에 따라 Node 20은 2026-04-30에 EOL(지원 종료)되었으며, 현행 활성 LTS는 Node 24임.
- **패키지명:** `package.json`의 `name`은 반드시 **`excel-practice`**여야 합니다.

### 핵심 실행 명령
```powershell
# 타입 검사 (Strict)
npm run typecheck

# 정적 분석 및 린트
npm run lint

# 포맷팅 검사
npm run format:check

# 단위 및 통합 테스트 (Vitest)
npm test

# 콘텐츠 스키마 및 정답 자체 검증 (CARD-04E에서 추가 예정)
npm run verify-content

# Firestore 보안 규칙 테스트 (로컬 에뮬레이터) (CARD-06C에서 추가 예정)
npm run test:rules

# E2E 브라우저 테스트 (Playwright)
npx playwright test

# 프로덕션 빌드
npm run build
```

---

## 4. 작업 진행 프로세스
1. [`docs/CLAUDE_CODE_HANDOFF.md`](docs/CLAUDE_CODE_HANDOFF.md)에서 현재 순서의 **작업 카드(CARD-ID)**를 확인합니다.
2. 카드에 명시된 파일만 수정/생성하고, 지침과 금지 규칙을 준수합니다.
3. 명시된 검증 명령을 직접 실행하여 100% 통과를 확인합니다.
4. [`docs/REQUIREMENTS_TRACE.md`](docs/REQUIREMENTS_TRACE.md)의 상태를 `[계획됨]`에서 `[완료됨]`으로 갱신합니다.
5. `docs/CLAUDE_CODE_HANDOFF.md`의 [G-02] 표준 양식에 맞추어 사용자에게 완료를 보고하고 다음 카드로 진행합니다.

👉 **지금 바로 시작할 첫 번째 작업 카드:** **`CARD-01A`** (프로젝트 초기화 및 도구 체계 구축)

