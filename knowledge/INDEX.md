# knowledge/ — Knowledge Base

> 지식 한 가지 = Knowledge Item(KI) 파일 하나. 방법론은 `docs/agentops/KNOWLEDGE_LIFECYCLE.md`.

## 영역
| 영역 | 담는 것 | 시작 문서 |
| --- | --- | --- |
| `raw/` | 원본. 수정하지 않는다 | `raw/cases/_CASE_TEMPLATE/meta.md` |
| `domain/` | 사람의 판단 | [domain/INDEX.md](./domain/INDEX.md) |
| `data/` | 데이터를 찾는 법 | [data/INDEX.md](./data/INDEX.md) |
| `learned/` | 에이전트가 배운 것 | [learned/INDEX.md](./learned/INDEX.md) |
| `dev/` | 개발 과정에서 배운 것 | [dev/INDEX.md](./dev/INDEX.md) |

## ID 규칙
| 접두사 | type | 위치 |
| --- | --- | --- |
| `D-` | decision-heuristic | `domain/heuristics/` |
| `EX-` | exception-case | `domain/exceptions/` |
| `CAT-` | data-catalog | `data/catalog/` |
| `Q-` | query-pattern | `data/query-patterns/` |
| `DC-` | data-caveat | `data/caveats/` |
| `F-` | finding | `learned/items/` |
| `L-` | lessons-learned | `dev/lessons/` |
| `FM-` | failure-mode | `dev/failure-modes/` |
| `ADR-` | adr | `dev/decisions/` |
| `RJ-` | rejected-experiment | `dev/rejected/` |

파일명은 `<ID>-<짧은-설명>.md`. 번호는 4자리, 재사용하지 않는다.

## 공통 frontmatter
```yaml
id: Q-0001
type: query-pattern
status: draft            # draft | validated | deprecated
tags: []
source: []               # raw/ 경로, ISS·CHG ID
evidence: []             # replay:CASE-###, evals/<suite>/<ID>, CHG-####
last_verified: null      # validated면 필수 (YYYY-MM-DD)
superseded_by: null      # deprecated면 대체 KI ID 또는 사유
```

## 규칙
- `validated`는 `evidence`와 `last_verified`가 있어야 한다.
- `evals/splits.json`의 `holdout` 케이스는 `source`에 쓸 수 없다.
- KI 하나는 100줄 이내, 사실 하나.
- 새 KI는 유형별 `_TEMPLATE.md`를 복사해 만든다.
- 검사: `node ci/check-harness.mjs`
