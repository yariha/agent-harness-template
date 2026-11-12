---
name: case-from-ki
description: Knowledge Item이나 Issue를 Eval Case로 만들 때 사용한다. 이슈를 고치기 전, KI를 Validated로 올리기 전에 실행한다. "/case-from-ki", "평가 케이스 추가" 요청에 사용한다.
---

# Case From KI / Issue

## 목적
KI나 Issue를 고정된 Eval Case로 바꾼다. 이슈는 고치기 전에 케이스가 되어야 하고, KI는 케이스가 근거가 되어야 Validated가 된다. 형식은 `evals/INDEX.md`.

## 입력
- KI ID, Issue ID, 또는 Hold-out 분석 케이스 ID.

## 절차
1. **Suite를 고른다.**
   - 맞는 데이터를 가져왔는가 → `evals/retrieval/` (`R-`)
   - 가져온 데이터로 내린 판단이 맞는가 → `evals/analysis/` (`A-`)
   - 과거에 고친 실패가 다시 생기지 않는가 → `evals/regression/` (`G-`)
   한 Issue가 조회와 분석 둘 다 걸리면 케이스를 둘로 나눈다.
2. **`_TEMPLATE.json`을 복사해 채운다.**
   - `input`: 에이전트가 실제로 받는 것만 넣는다. 정답이 드러나는 힌트를 넣지 않는다.
   - `expected`: 기대 결과와 채점 기준. 수치 일치면 `grading: exact`, 판단이면 `rubric`과 `criteria` 목록.
   - `source`: 출처 KI·Issue·케이스 ID.
3. **출처 케이스의 Split을 확인한다.** Blind 평가용은 `holdout` 케이스로만 만든다. `distill` 케이스로 만든 것은 `notes`에 재현 확인용이라고 적는다 (Baseline에 넣지 않는다).
4. **한 번 실행한다.** Issue에서 온 케이스는 지금 실패해야 정상이다. 통과하면 실패를 재현하지 못한 것이므로 `input`을 다시 본다.
5. **서로 연결한다.** Issue의 `eval_case`, KI의 `evidence`(통과한 경우)에 케이스 ID를 적는다.

## 가드레일
- 기존 Eval Case의 `expected`나 채점 기준을 고치지 않는다. 고쳐야 하면 Change Record로 남긴다.
- 사람의 결론이 정답이다. 에이전트의 출력을 보고 정답을 정하지 않는다.
- 정답을 확정할 수 없으면 만들지 않고 전문가 질문으로 남긴다.

## 종료 조건과 보고
- `node ci/check-harness.mjs` 통과.
- 보고: 만든 케이스 ID, Suite, 현재 통과/실패, 연결한 Issue·KI.
