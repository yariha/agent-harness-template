# Autonomy Levels

> 자가진화를 어디까지 자동으로 둘지 정하는 단계. 낮은 단계에서 시작하고, 조건을 충족할 때 한 단계씩 올린다.

## 현재 단계
**L0** (프로젝트가 채운다. 단계를 바꾸면 ADR을 남기고 이 줄을 갱신한다.)

## 단계
| 단계 | 에이전트가 할 수 있는 것 | 올리는 조건 |
| --- | --- | --- |
| L0 수동 | 사람만 지식과 `agent/`를 바꾼다. 에이전트는 실행만 한다 | 시작점. Eval Suite와 Baseline이 생기기 전 |
| L1 제안 | 에이전트가 `evolution/proposals/`에 제안을 쌓는다. 반영은 사람이 Change Loop로 한다 | Baseline 확정, Regression Suite 존재, `ci/check-harness.mjs` 통과 |
| L2 조건부 사용 | Draft 지식을 실험 실행에서만 써 보고 결과를 제안에 첨부한다. 운영 실행은 Validated만 쓴다 | 제안의 채택률이 안정적, 실험 실행과 운영 실행이 분리됨 |
| L3 저위험 자동 승격 | Eval Gate를 통과한 저위험 유형은 자동으로 Promote하고 사후 검토한다 | 자동 승격분의 롤백 이력이 낮음, 저위험 유형 목록 합의 |

## 저위험 유형 (L3에서만 의미가 있다)
프로젝트가 정한다. 출발점 제안:
- 저위험: Data Caveat 추가, Glossary 추가, 기존 Query Pattern의 tags 보강
- 고위험 (항상 사람 승인): Decision Heuristic, `agent/prompts/` 변경, `agent/tools/` 변경, 검색 인덱스 설정

## 모든 단계에서 지키는 것
- 에이전트가 쓴 것은 Draft로 시작한다.
- 자동 승격도 Change Record를 남긴다 (`author: agent`).
- Eval Case와 Baseline은 에이전트가 수정하지 않는다.
- `knowledge/raw/`와 Hold-out 케이스는 에이전트가 수정하지 않는다.

## 내릴 때
- 자동 승격된 지식이 Regression을 일으키면 해당 유형을 저위험 목록에서 빼고, 원인을 Failure Mode로 기록한다.
- 한 주기에 롤백이 두 번 이상이면 단계를 하나 내린다.
- 쓰기 작업을 하는 에이전트로 바뀌면 L1 이하로 내린다.

## 단계별로 켜지는 절차
| 단계 | 쓰는 스킬 |
| --- | --- |
| L0 | `distill-knowledge`, `case-from-ki`, `log-change`, `run-evals`, `review-knowledge` |
| L1 이상 | 위 + `promote-evolution` |
| L3 | 위 + 자동 승격 실행기 (프로젝트가 구현, `promote-evolution` 절차를 그대로 따른다) |
