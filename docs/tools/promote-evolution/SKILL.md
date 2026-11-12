---
name: promote-evolution
description: 에이전트의 자가 개선 제안(evolution/proposals/)을 검토해 Change Loop에 태울 때 사용한다. "/promote-evolution", "자가 개선 제안 검토" 요청에 사용한다.
---

# Promote Evolution

## 목적
에이전트가 실행 중 배운 것(`evolution/proposals/P-####.md`)을 사람의 변경과 같은 Eval Gate에 태워 반영하거나 기각한다. 자동화 수준은 `docs/adaptation/AUTONOMY_LEVELS.md`.

## 시작 전 확인
- 현재 Autonomy Level을 읽는다. L0이면 이 스킬을 쓰지 않는다 (제안을 받지 않는 단계).
- `evals/baseline.json`이 측정돼 있는가. 없으면 중단하고 `run-evals`의 첫 Baseline 측정을 안내한다.

## 절차
1. **모으기.** `status: submitted`인 제안을 읽는다. 같은 내용의 제안은 하나로 묶고 관찰 횟수를 합친다.
2. **걸러내기.** 아래는 기각(`rejected`)하고 이유를 적는다.
   - 기존 Validated KI와 같은 내용
   - `knowledge/dev/rejected/`에 같은 시도가 있고 새 근거가 없음
   - 관찰이 한 번뿐이고 재현되지 않음
   - Eval Case·Baseline·`knowledge/raw/`를 바꾸자는 제안
3. **분류.** `kind: knowledge`면 KI Draft로, `kind: agent`면 `agent/` 변경안으로 다룬다.
4. **Eval Case.** 제안이 해결한다는 상황의 Eval Case가 있는가. 없으면 `case-from-ki`로 만든다. 정답을 확정할 수 없으면 전문가 질문으로 남기고 보류한다.
5. **Change Loop.** `log-change` 절차로 Change Record를 만든다 (`author: agent`, `trigger`에 제안 ID). KI 제안은 Draft KI를 실험 실행에 넣은 상태를 "변경 후"로 평가한다.
6. **승격.**
   - 통과 → 현재 Level이 허용하면 KI를 `validated`로 올려 `knowledge/learned/`에 두고 INDEX에 등록한다. Level이 허용하지 않으면 결과 표와 함께 사용자 승인을 요청한다.
   - 실패 → 제안 `rejected`, Rejected Experiment로 남긴다.
7. **기록.** 제안의 `status`와 `change`를 갱신한다.

## 가드레일
- Decision Heuristic, `agent/prompts/`, `agent/tools/`, 검색 설정은 Level과 관계없이 사람 승인을 받는다 (프로젝트가 저위험 목록을 바꿨다면 그 목록을 따른다).
- 제안 여러 건을 한 Change Record로 묶지 않는다.

## 보고
제안별 결과(채택·기각·보류와 이유), 만든 Change Record, 승인이 필요한 항목.
