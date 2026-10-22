# CELLCRAFT 사용자 의사결정 및 미결 사항 (OPEN_QUESTIONS)

- **문서 버전:** 2.0.0
- **최종 수정일:** 2026-10-22 (사용자 의사결정 전원 확정 반영)
- **작성자:** 수석 소프트웨어 아키텍트
- **상태:** 핵심 의사결정 완료 (Core Decisions Resolved)

---

## [의사결정 1] 수식 엔진 라이선스 및 배포 정책 (결정 완료)

- **상태:** **결정됨 (Resolved) — 2026-10-22 확정**
- **관련 문서:** `docs/adr/ADR-001-formula-engine.md`, 요구사항 R-03.0-04, S-10, CARD-01A, CARD-02B
- **사용자 확정 결정:** **선택지 A 채택 — HyperFormula를 GPLv3 라이선스로 사용**
- **결정 내용 및 실행 지침:**
  1. 수식 엔진으로 **HyperFormula**를 공식 채택하고, 설정에 `licenseKey: 'gpl-v3'`를 명시한다.
  2. GPLv3 의무 준수를 위해 프로젝트 루트에 `LICENSE` (GNU General Public License v3.0) 파일을 생성한다.
  3. `package.json`의 `license` 필드를 `"GPL-3.0-or-later"`로 명시한다.
  4. 웹 배포 사이트(랜딩 페이지 푸터 및 설정/정보 모달)에서 전체 소스코드 공개 저장소 링크를 사용자에게 제공한다.
  5. 설치되는 모든 npm 의존성의 라이선스가 GPLv3와 법적으로 호환(Compatible)되는지 점검하는 검증 단계를 `CARD-01A` 및 CI에 포함한다.
  - *공식 라이선스 참고 링크:*
    - HyperFormula 라이선스 안내: https://hyperformula.handsontable.com/guide/license-key.html
    - GNU GPLv3 공식 전문: https://www.gnu.org/licenses/gpl-3.0.html
    - GNU GPL 호환 라이선스 목록: https://www.gnu.org/licenses/license-list.html

---

## [의사결정 2] 경험치(XP) 채점 무결성 및 Firebase 요금제 모델 (결정 완료)

- **상태:** **결정됨 (Resolved) — 2026-10-22 확정**
- **관련 문서:** `docs/adr/ADR-004-backend-scoring.md`, `docs/THREAT_MODEL.md` (S-03), CARD-06C
- **사용자 확정 결정:** **선택지 A 채택 — 서버 없는 규칙 제한형 (Serverless Rule-Bounded Model)**
- **결정 내용 및 실행 지침:**
  1. Firebase Spark 요금제(무료) 내에서 운영하며, 별도의 Cloud Functions 서버 재채점 없이 클라이언트 채점 + Firestore 보안 규칙으로 검증한다.
  2. Firestore 규칙으로 1회당 증가 상한(최대 50 XP), 5초 간격 제한, 단조 증가를 강제한다.
  3. **[금지 규칙 명통]** 규칙 제한형 환경에서는 악의적인 클라이언트의 XP 변조를 100% 원천 차단할 수 없으므로, **전체 사용자 공개 순위표(Leaderboard) 및 공정성이 필수인 경쟁 기능은 절대 구현하지 않는다.**
  4. 대시보드와 진도 화면에 "본 경험치는 개인 학습 기록 및 자기주도 학습용"임을 정직하게 안내한다.

---

## [의사결정 3] 서비스 대상 연령 및 개인정보보호법(14세 미만 동의) 정책 (결정 완료)

- **상태:** **결정됨 (Resolved) — 2026-10-22 확정**
- **관련 문서:** `docs/THREAT_MODEL.md` (S-12), CARD-06A, CARD-06B
- **사용자 확정 결정:** **선택지 A 채택 — 만 14세 이상만 계정 가입 허용, 14세 미만은 무계정 체험 모드 이용**
- **결정 내용 및 실행 지침:**
  1. 회원가입 화면에 "만 14세 이상 이용자입니다" 확인 체크박스를 의무화하고 동의하지 않으면 계정 가입을 차단한다.
  2. 만 14세 미만 학습자는 회원가입/로그인 없이 이용 가능한 **'체험 모드(Guest Practice Mode)'**를 제공한다.
  3. **[개인정보 원칙]** 체험 모드에서는 어떠한 개인정보(이메일, 실명, 식별자 등)도 일체 수집·저장하지 않으며, 오직 브라우저 로컬 스토리지에만 실습 데이터를 임시 보관한다.

---

## [의사결정 4] Excel 대조 골든 테스트 기준 파일 제공 방식 (결정 완료)

- **상태:** **결정됨 (Resolved) — 2026-10-22 확정**
- **관련 문서:** `docs/TEST_STRATEGY.md` (Q-01), CARD-02B
- **사용자 확정 결정:** **사용자가 Phase 2 시작 전까지 `tests/fixtures/golden-excel-calculations.xlsx`를 직접 작성하여 제공**
- **결정 내용 및 실행 지침:**
  1. `CARD-02B`의 선행 필수 조건(Prerequisite)으로 본 기준 파일의 존재 여부를 등록한다.
  2. 기준 파일이 `tests/fixtures/golden-excel-calculations.xlsx` 경로에 존재하지 않으면 Claude Code는 Phase 2(`CARD-02B`) 작업을 착수하지 않고 대기한다.
  3. 기준 파일 포함 권장 시트: 사칙연산(`Arithmetic`), 핵심함수(`CoreFunctions`), 날짜일련번호(`DateSerial`), 오류값(`ErrorValues`).

---

## [의사결정 5] 컴퓨터활용능력 2027년 개편 세부 PDF 확인 여부 (안내 완료)

- **상태:** **안내 완료 — 공식 공지 반영 및 [확인 불가] 처리 완료**
- **관련 문서:** `docs/RESEARCH_NOTES.md`, `docs/CURRICULUM.md`
- **현황:**
  - 상공회의소 공식 사이트(https://license.korcham.net/)를 통해 2027~2029년 개편안(Windows 11, AI 기초) 공지 확인 완료.
  - 세부 실기 PDF 원문은 비공개/수험자 인증 대상이므로 [확인 불가]로 공식 표시.
  - 콘텐츠 데이터 스키마는 `examVersion: '2024-2026' | '2027-2029'` 모두 수용하도록 완전 준비됨.
