---
name: log-change
description: agent/(프롬프트·스킬·도구·검색 설정·모델)를 바꿀 때 Change Record를 만들고 전후 평가로 닫는다. "/log-change", "변경 기록", "에이전트 수정" 요청에 사용한다.
---

# Log Change

## 목적
`agent/` 변경 한 건을 "왜 바꿨고, 무엇을 바꿨고, 성능이 어떻게 달라졌나"로 남긴다. 경로는 `docs/agentops/CHANGE_LOOP.md`.

## Task Brief
- **목표**: 가설 하나를 검증하고 Change Record를 `adopted` 또는 `rejected`로 닫는다.
- **가드레일**: 변경 하나에 가설 하나. Eval Case와 Baseline은 건드리지 않는다. `knowledge/raw/`는 건드리지 않는다.
- **종료 조건**: Change Record에 전후 평가가 있고 REGISTRY에 한 줄이 있다.
- **검증 수단**: `run-evals`, `node ci/eval-gate.mjs`, `node ci/check-harness.mjs`.

## 절차
1. **계기 확인.** Issue·KI·제안 ID가 있는가. 없으면 먼저 Issue를 등록한다 (`ops/issues/_TEMPLATE.md`).
2. **Prior Knowledge.** `knowledge/dev/`에서 같은 태그의 Lessons Learned·Failure Mode·Rejected를 찾는다. 이미 기각된 시도면 무엇이 달라졌는지 설명할 수 있을 때만 진행한다.
3. **Eval Case 확인.** 계기가 Issue면 재현 케이스가 있는가. 없으면 `case-from-ki`를 먼저 실행한다.
4. **Change Record 생성.** `ops/changes/_TEMPLATE.md`를 다음 번호로 복사한다. `status: proposed`, `trigger`, `targets`, 가설, Prior Knowledge를 채운다.
5. **변경 전 평가.** `run-evals`로 현재 상태를 측정해 `eval_before`에 결과 파일을 적는다.
6. **변경 적용.** `targets`에 적은 경로만 바꾼다. 범위가 넓어지면 Change Record를 나눈다.
7. **변경 후 평가.** `run-evals` 후 `eval_after`를 적고 평가 결과 표를 채운다. `node ci/eval-gate.mjs`를 실행한다.
8. **결정.**
   - 목표 케이스 통과 + Regression 없음 → `adopted`. Baseline이 올랐으면 `evals/baseline.json`을 갱신하고 `change`에 이 ID를 적는다.
   - 아니면 → 변경을 되돌리고 `rejected`. 부작용과 이유를 적는다.
   - 판단이 애매하면 (목표는 올랐지만 다른 Suite가 떨어짐 등) 사용자에게 결과 표를 보여 주고 묻는다.
9. **기록.** `ops/changes/REGISTRY.md` 맨 위에 한 줄을 추가한다. Issue의 `status`·`change`를 갱신한다.
10. **Distill.** `distill-knowledge` 회고 모드로 Lessons Learned 또는 Rejected Experiment를 만들고 `knowledge`에 ID를 적는다.

## 급한 수정
먼저 고쳐야 했다면 사후에 4~10을 수행한다. `eval_before`는 변경 전 커밋에서 측정한다.

## 보고
Change Record ID, 가설, Suite별 전 → 후 점수, Regression 여부, 결정, 추출한 KI.
