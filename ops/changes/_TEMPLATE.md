---
id: CHG-0000
status: proposed          # proposed | adopted | rejected | rolled-back
date: null                # YYYY-MM-DD
author: human             # human | agent
trigger: []               # ISS-####, KI ID, P-####
targets: []               # agent/ 경로
eval_suite: smoke         # smoke | full
eval_before: null         # evals/results/<run-id>.json
eval_after: null
knowledge: []             # 이 변경에서 추출한 KI ID
---
## 가설
<무엇을 바꾸면 어떤 케이스·점수가 어떻게 달라질 것인가. 하나만 적는다.>

## Prior Knowledge
<knowledge/dev/에서 찾은 관련 KI ID. 없으면 없음.>

## 변경 내용
<바꾼 것을 대상 경로별로 요약.>

## 평가 결과
| Suite | 전 | 후 | 비고 |
| --- | --- | --- | --- |

- 목표 Eval Case: <ID와 통과 여부>
- Regression: <떨어진 케이스 ID 또는 없음>

## 부작용
<함께 나빠진 것, 비용·지연 변화.>

## 결정과 이유
<adopted / rejected / rolled-back 중 무엇으로 닫았고 왜인가.>
