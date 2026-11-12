# Change Loop

> `agent/`에 대한 변경 한 건이 지나는 경로. 사람의 변경과 에이전트의 자가 개선 제안이 같은 경로를 쓴다.

## 경로
1. **Signal**: 변경의 계기는 셋이다. Issue(`ops/issues/`), 새 KI, 자가 개선 제안(`evolution/proposals/`).
2. **Prior Knowledge**: `knowledge/dev/`에서 같은 태그의 Lessons Learned·Failure Mode·Rejected를 먼저 조회한다. 이미 기각된 시도면 새 근거 없이 반복하지 않는다.
3. **Eval Case**: 고치기 전에 실패를 재현하는 Eval Case를 등록한다. 등록 직후 실패하는 것을 확인한다. (`case-from-ki`)
4. **Change Candidate**: `ops/changes/CHG-####.md`를 `status: proposed`로 만든다. 가설 하나, 대상 경로, 기대하는 점수 변화를 적는다. (`log-change`)
5. **Eval Gate**: 변경 전 평가(`eval_before`) → 변경 적용 → 변경 후 평가(`eval_after`). 목표 케이스가 통과하는지, Regression Suite가 Baseline 아래로 떨어지지 않는지 본다. (`run-evals`, `ci/eval-gate.mjs`)
6. **Decide**: 통과하면 `adopted`, 아니면 `rejected`로 닫고 변경을 되돌린다. 어느 쪽이든 Change Record는 남긴다.
7. **Record · Distill**: `ops/changes/REGISTRY.md`에 한 줄을 추가하고, 배운 점을 `knowledge/dev/` KI로 추출한다. Baseline이 올랐으면 `evals/baseline.json`을 갱신한다.

## Change Record가 답하는 질문
| 질문 | 필드 |
| --- | --- |
| 왜 바꿨나 | `trigger` (ISS·KI·제안 ID), 가설 |
| 무엇을 바꿨나 | `targets` (agent/ 경로), 변경 내용 |
| 성능이 어떻게 달라졌나 | `eval_before`, `eval_after`, 평가 결과 표 |
| 부작용은 | Regression 결과, 부작용 절 |
| 그래서 어떻게 했나 | `status`, 결정과 이유 |
| 무엇을 배웠나 | `knowledge` (추출한 KI ID) |

## 규칙
- **변경 하나에 가설 하나.** 여러 변경을 함께 평가하면 무엇이 효과였는지 알 수 없다.
- **Eval Case 수정도 변경이다.** 채점 기준이나 정답을 바꾸면 Change Record를 남긴다.
- **급한 수정**도 Change Record는 사후에라도 남긴다. 기록 없는 변경은 이후 모든 점수 변화의 원인 불명 요소가 된다.
- **기반 모델·검색 인덱스 교체**는 `agent/` 변경과 같다. 전체 평가 후 Baseline을 다시 잡는다.
- **롤백**은 새 Change Record가 아니라 원래 레코드의 `status: rolled-back`과 이유로 남긴다.

## Traceability
ID로 서로를 가리킨다. 어느 한 곳에서 시작해도 나머지를 따라갈 수 있다.

```text
ISS-0017 ──eval_case──▶ R-0021 ──(CHG.trigger)──▶ CHG-0031 ──knowledge──▶ L-0012
   ▲                                                                        │
   └────────── 유사 이슈가 오면 L-0012를 먼저 조회 (Prior Knowledge) ◀──────┘
```

## 기계가 확인하는 것
- `node ci/check-harness.mjs --changed-base <ref>`: `agent/`가 바뀌었는데 Change Record가 없으면 실패. `adopted` 레코드에 전후 평가가 없으면 실패. `fixed` 이슈에 Eval Case가 없으면 실패.
- `node ci/eval-gate.mjs`: 결과가 Baseline보다 낮은 Suite가 있으면 실패.
