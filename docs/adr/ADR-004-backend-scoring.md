# ADR-004: 채점 신뢰도 및 경험치(XP) 무결성 아키텍처 (Scoring & Anti-Cheat)

- **문서 번호:** ADR-004
- **상태:** **채택됨 (Accepted) — 2026-10-22 사용자 확정**
- **최종 수정일:** 2026-10-22
- **작성자:** 수석 소프트웨어 아키텍트

---

## 1. 배경 및 맥락 (Context)

`docs/MASTER_PROMPT.md` 제11장, 제13.3장 및 본 보강 지침(S-03, S-04)에 따라, 사용자의 문제 해결에 따른 경험치(XP) 부여와 학습 진도 저장 시 부정행위(Cheat)를 방어하는 아키텍처를 결정해야 한다.

---

## 2. 채택된 아키텍처: 서버 없는 규칙 제한형 (Serverless Rule-Bounded Model)

사용자의 결정에 따라 **서버 없는 규칙 제한형 모델**을 공식 채택한다.
- **채점 위치:** 브라우저 클라이언트 로컬 채점기(`GradingEngine`). 레이턴시 0ms 즉각 피드백 제공.
- **인프라 비용:** Firebase Spark 무료 요금제 내에서 평생 무료 운영 가능.
- **Firestore 보안 규칙(`firestore.rules`)을 통한 클라이언트 쓰기 강제 제약:**
  1. `request.resource.data.xp <= resource.data.xp + 50`: 1회 요청당 최대 50 XP까지만 증가 허용 (폭증 차단).
  2. `request.resource.data.xp >= resource.data.xp`: 단조 증가(Monotonic Increase) 강제 (차감 불가).
  3. `request.time > resource.data.lastSolvedAt + duration.value(5, 's')`: 문제 풀이 간격 최소 5초 강제 (스크립트 광클 방어).
  4. `request.resource.data.lastSolvedAt == request.time`: 서버 시각 일치 검증.

---

## 3. 핵심 금지 규칙 및 서비스 제약 사항 (Strict Prohibitions)

> [!CAUTION] 전체 사용자 순위표(Global Leaderboard) 개발 절대 금지 (규칙 위반)
> 본 모델은 서버 측 완전 재채점이 아니므로, 숙련된 공격자가 규칙 허용 범위(5초마다 50XP) 내에서 자동화 스크립트로 XP를 반복 획득하는 것을 기술적으로 100% 원천 봉쇄할 수는 없습니다.
> 따라서 공정성과 보상이 전제되어야 하는 **전체 사용자 공개 순위표(Global Leaderboard), 실시간 랭킹전, 경쟁형 보상 기능의 개발을 전면 금지**합니다.

- **사용자 소통 원칙:**
  - 대시보드와 사용자 프로필에 *"경험치(XP)는 개인의 성실한 학습 기록과 자기주도적 성장을 측정하기 위한 개인용 지표입니다"*라는 안내 문구를 명확히 명시한다.
- **향후 확장 정책:**
  - 추후 공식 인증서 발급이나 공인 시험 등 절대적 신뢰성이 필요한 기능이 도입될 경우에 한하여, 해당 특정 엔드포인트만 Cloud Functions 서버 재검증 모듈(Phase 7)로 분리 확장을 검토한다.
