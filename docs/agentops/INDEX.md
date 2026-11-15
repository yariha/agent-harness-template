# Sub-SSOT — AgentOps

> 자가진화 에이전트를 개발할 때 지식·평가·변경을 다루는 방법론의 시작 문서다.
> 목표는 하나다. 모든 변경에 대해 "왜 바꿨고, 무엇을 바꿨고, 성능이 어떻게 달라졌는가"에 답할 수 있어야 한다.

## 세 축
- **Knowledge Base** (`knowledge/`): 에이전트와 개발자가 아는 것. Domain·Data·Learned·Dev 네 영역, 같은 Knowledge Item(KI) 형식.
- **Eval Suite** (`evals/`): 얼마나 잘하는가. Retrieval·Analysis·Regression 세트와 Baseline.
- **Change Registry** (`ops/`): 무엇이 왜 바뀌었는가. Issue, Change Record, 실험.
- 진화 대상은 `agent/`다. Eval Gate를 통과한 변경만 반영된다.

## 불변 원칙
1. `agent/` 변경에는 Change Record와 전후 평가가 따른다.
2. 이슈는 고치기 전에 Eval Case로 등록한다.
3. 근거 없는 KI는 Draft다.
4. `knowledge/raw/`는 수정하지 않는다.
5. Hold-out 케이스에서 지식을 추출하지 않는다.
6. 자가 개선 제안도 같은 Eval Gate를 지난다.

## 하루 작업 흐름
- 새 원본(분석 케이스·스키마)이 들어왔다 → `distill-knowledge`
- KI나 이슈가 생겼다 → `case-from-ki`
- `agent/`를 고친다 → `log-change` → `run-evals`
- 자가 개선 제안이 쌓였다 → `promote-evolution`
- 스키마가 바뀌었거나 정기 점검이다 → `review-knowledge`

## Source Map
- `agent/INDEX.md`: 진화 대상의 구성과 변경 규칙
- `knowledge/INDEX.md`: 영역, KI 형식, ID 규칙
- `evals/INDEX.md`: Eval Case 형식, 러너 계약, Baseline
- `ops/changes/REGISTRY.md`: 변경 한 줄 요약표
- `ci/check-harness.mjs`, `ci/eval-gate.mjs`: 불변 원칙을 기계로 확인
- `observability/INDEX.md`: 실행 기록(Trace), 흐름·비용 화면, Langfuse(선택). 실패 신호가 Issue로 들어오는 입구

## Reference Map
| 작업 범위 | 추가 참조 |
| --- | --- |
| KI가 쌓이고 관리되는 방식 | [KNOWLEDGE_LIFECYCLE.md](./KNOWLEDGE_LIFECYCLE.md) |
| 변경 한 건이 지나는 경로 | [CHANGE_LOOP.md](./CHANGE_LOOP.md) |
| 분석 케이스로 지식 베이스를 처음 채우기 | [BOOTSTRAPPING.md](./BOOTSTRAPPING.md) |
| 실행 기록·비용 보기 | [../../observability/INDEX.md](../../observability/INDEX.md) |
| 용어 해설 | [GLOSSARY.md](./GLOSSARY.md) |
| 시나리오별 구조 수정 | [../adaptation/INDEX.md](../adaptation/INDEX.md) |
| 절차 스킬 | [../tools/INDEX.md](../tools/INDEX.md) |
