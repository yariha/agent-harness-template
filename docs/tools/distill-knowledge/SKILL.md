---
name: distill-knowledge
description: 새 원본(분석 케이스·스키마·리포트·Change Record)에서 Knowledge Item Draft를 추출할 때 사용한다. "/distill-knowledge", "지식 추출", "역분석" 요청에 사용한다.
---

# Distill Knowledge

## 목적
원본에서 Knowledge Item(KI) Draft를 추출한다. KI 하나에 사실 하나. 방법론은 `docs/agentops/KNOWLEDGE_LIFECYCLE.md`, 초기 구축은 `docs/agentops/BOOTSTRAPPING.md`.

## 시작 전 확인
- 대상 원본이 `knowledge/raw/` 또는 `ops/`에 있는가. 없으면 먼저 Capture한다 (원본은 이후 수정하지 않는다).
- 대상이 분석 케이스면 `evals/splits.json`에서 `holdout`이 아닌지 확인한다. **Hold-out 케이스에서는 추출하지 않는다.** Split이 정해지지 않았으면 사용자에게 묻는다.

## 모드
| 원본 | 모드 | 나오는 KI |
| --- | --- | --- |
| 분석 케이스 (문서 + raw data) | 역분석 | Decision Heuristic, Query Pattern, Data Caveat |
| 리포트만 (data 없음) | 절차 추출 | Decision Heuristic (Draft 유지) |
| 스키마·쿼리 이력 | 카탈로그 | Data Catalog, Query Pattern, Data Caveat |
| 인터뷰·전문가 답변 | 정리 | Decision Heuristic, Exception Case, Glossary |
| Change Record·Issue | 회고 | Lessons Learned, Failure Mode, Rejected Experiment |

## 역분석 절차 (분석 케이스)
1. 문서 전체와 캡처 이미지를 읽고, 결론과 그 근거로 제시된 수치·그림을 목록으로 만든다.
2. 각 수치·그림이 데이터의 어느 부분에서 어떤 조건으로 나왔는지 데이터와 대조해 찾는다.
3. 세 가지를 재구성한다: 요청의 목적 / 조회한 데이터와 조건 / 결론을 낸 판단 기준.
4. 재구성한 조회 방법으로 실제로 조회해 문서의 수치가 나오는지 확인한다 (Replay). 결과를 기록한다.
5. 유형별 `_TEMPLATE.md`를 복사해 KI를 만든다. `status: draft`, `source`에 케이스 경로.
6. 문서로 설명되지 않는 판단은 추측해서 채우지 않는다. 전문가 질문 목록으로 남긴다.

## 회고 절차 (Change Record·Issue)
1. `adopted` → Lessons Learned, `rejected`·`rolled-back` → Rejected Experiment.
2. 같은 원인의 Issue가 2건 이상이면 Failure Mode로 묶는다.
3. 만든 KI ID를 Change Record의 `knowledge`에 적는다. 전후 점수가 있으므로 `evidence`에 CHG ID를 적고 Validated로 올릴 수 있다.

## 가드레일
- 기존 KI와 같은 내용이면 새로 만들지 않고 `source`만 보탠다. 상반되면 둘 다 두고 `review-knowledge` 대상으로 보고한다.
- 에이전트는 Draft까지만 쓴다. 승격은 `docs/adaptation/AUTONOMY_LEVELS.md`의 현재 단계를 따른다.

## 종료 조건과 보고
- `node ci/check-harness.mjs` 통과.
- 보고: 만든 KI 목록(ID·유형·한 줄 요약), Replay 결과(재현됨/안 됨), 전문가 질문 목록, 다음 단계(`case-from-ki`).
