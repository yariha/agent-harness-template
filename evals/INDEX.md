# evals/ — Eval Suite

> 고정된 평가 세트. 변경 전후를 같은 케이스로 비교하기 위해 존재한다. 방법론은 `docs/agentops/CHANGE_LOOP.md`.

## Suite
| Suite | 무엇을 보나 | ID |
| --- | --- | --- |
| `retrieval/` | 요청의 목적에 맞는 데이터를 가져왔는가 | `R-####` |
| `analysis/` | 가져온 데이터로 내린 판단이 맞는가 | `A-####` |
| `regression/` | 전에 되던 것이 계속 되는가 (과거 이슈에서 온 케이스) | `G-####` |

## Eval Case 형식
케이스 하나 = JSON 파일 하나. `_TEMPLATE.json`을 복사해 만든다.
- `id`, `suite`
- `source`: 이 케이스의 출처 (`case`, `issue`, `ki`)
- `input`: 에이전트에게 주는 것 (요청, 데이터 위치)
- `expected`: 기대 결과 (조회 결과·정답 문서 ID·결론)와 채점 기준
- `grading`: `exact`(일치 비교) 또는 `rubric`(채점 기준표)

## Split
- `splits.json`의 `holdout` 케이스로만 Blind 평가용 Eval Case를 만든다.
- `distill` 케이스로 만든 Eval Case는 재현 확인용이다. Baseline 점수에 넣지 않는다.

## 러너 계약 (프로젝트가 구현한다)
러너는 스택에 맞게 프로젝트가 만든다. 지켜야 할 것은 출력 형식뿐이다.
- 실행마다 `results/<run-id>.json`을 쓰고 `results/latest.json`을 갱신한다.
- 형식: `{"run_id", "change", "measured_at", "suites": {"<suite>": {"score": 0~1, "n": 건수, "failed": ["<ID>"]}}}`
- 권장: Suite마다 `cost_usd`(합)와 `avg_turns`를 함께 남긴다. 게이트는 보지 않지만 비용을 바꾸는 변경은 이것으로 판단한다(`observability/COSTS.md`).
- `baseline.json`도 같은 `suites` 형식이다.

## Baseline
- `baseline.json`은 채택된 변경의 평가 결과로만 갱신한다. 갱신한 Change Record ID를 `change`에 적는다.
- `tolerance`는 측정 잡음을 허용하는 폭이다. 근거 없이 넓히지 않는다.
- 게이트: `node ci/eval-gate.mjs [결과 파일]` — Baseline보다 낮은 Suite가 있으면 실패한다.

## 규칙
- 점수를 맞추려고 Eval Case를 고치지 않는다. 케이스나 채점 기준의 수정은 Change Record 대상이다.
- 에이전트는 Eval Case와 Baseline을 수정하지 않는다.
