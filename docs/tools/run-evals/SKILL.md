---
name: run-evals
description: Eval Suite를 실행하고 Baseline과 비교할 때 사용한다. agent/ 변경 전후, Baseline 측정, 정기 점검에 실행한다. "/run-evals", "평가 실행" 요청에 사용한다.
---

# Run Evals

## 목적
고정된 Eval Suite를 실행해 결과 파일을 남기고 Baseline과 비교한다. 형식과 러너 계약은 `evals/INDEX.md`.

## 입력
- 세트: `smoke`(빠른 확인) 또는 `full`(전체). 지정이 없으면 변경 중에는 smoke, 채택 직전에는 full.
- 연결할 Change Record ID (있으면).

## 절차
1. **러너 확인.** 프로젝트의 평가 러너 명령을 `evals/INDEX.md`에서 찾는다. 러너가 아직 없으면 중단하고, 러너 계약(출력 형식)을 사용자에게 보여 준 뒤 구현 여부를 묻는다.
2. **상태 고정.** 작업 트리에 평가와 무관한 변경이 섞여 있지 않은지 확인한다. 측정 대상 커밋·변경을 결과에 남긴다.
3. **실행.** 러너를 실행한다. 결과는 `evals/results/<run-id>.json`과 `evals/results/latest.json`에 쓰인다.
4. **비교.** `node ci/eval-gate.mjs`를 실행한다.
5. **실패 케이스 확인.** Baseline보다 떨어진 Suite가 있으면 `failed` 케이스를 열어 원인이 이번 변경인지, 측정 잡음인지 본다. 잡음이 의심되면 같은 조건으로 한 번 더 실행해 비교한다.

## 가드레일
- 점수를 올리려고 Eval Case, 채점 기준, `tolerance`를 고치지 않는다.
- `evals/baseline.json`은 채택된 Change Record의 결과로만 갱신한다 (`log-change` 8단계).
- 평가 실행이 운영 데이터에 쓰기를 하지 않는지 확인한다. 쓰기 작업을 하는 에이전트는 격리 환경에서만 평가한다.
- Blind 평가에서는 에이전트에게 Hold-out 케이스의 분석 문서를 주지 않는다.

## 첫 Baseline 측정
1. Hold-out 케이스로 만든 Eval Case가 Suite마다 있는지 확인한다.
2. full 세트를 실행한다.
3. 결과의 `suites`를 `evals/baseline.json`에 옮기고 `measured_at`을 적는다. 표본이 적으면 `notes`에 적는다.
4. 이 측정을 Change Record로 남긴다 (`trigger`: Baseline 최초 측정).

## 보고
Suite별 점수와 건수, Baseline 대비 변화, 실패 케이스 ID, 결과 파일 경로.
