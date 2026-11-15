# Architecture
> 대상 에이전트의 경계와 런타임 흐름을 빠르게 잡기 위한 상위 지도다.
> 세부는 각 폴더의 INDEX와 agentops 문서로 내려간다.

## Runtime Shape
- <에이전트 실행 형태: 단일/멀티 에이전트, 프레임워크, 호출 방식(API·CLI·배치)>
- <데이터 소스: 정형 DB / RAG 인덱스 / 둘 다, 접근 권한(read-only 여부)>
- <기반 모델과 판정 모델 한 줄. 상세는 agent/MODELS.md>

## Main Boundaries
- 진화 대상은 `agent/`, 지식은 `knowledge/`, 평가는 `evals/`, 변경 추적은 `ops/`·`evolution/`이다. 각 폴더의 `INDEX.md`가 시작 문서다.
- <에이전트를 부르는 응용 코드가 있으면 그 위치와 시작 INDEX>
- <설정·비밀값 위치(.env 변수명), 데이터 접근 계정의 범위>

## Core Flows
- 런타임: 요청 → 목적 파악 → 조회 계획 → DB/RAG 조회 → 분석 → 답변 → Trace. <단계별 담당 파일>
- 관측: 실행마다 `traces/<id>.json`(trigger·llm·tool·output span) → 뷰어(흐름·비용) → (선택) Langfuse. 형식은 `observability/TRACE_FORMAT.md`
- 지식: Capture → Distill → Validate → Promote → Serve → Maintain
- 변경: Signal → Eval Case → Change Record → Eval Gate → 채택/기각 → Distill
- <프로젝트 고유 흐름 1~2개>

## Change Notes
- <변경 시 좁히는 순서. 예: 실패 단계 특정(목적 파악/조회/분석) → 관련 KI → prompt → tool → retrieval 설정>
- <가장 흔한 누락을 "우선 의심" 항목으로. 예: 기간 조건, 단위, 중복 집계, 데이터 시점>

## Reference Map
| 작업 범위 | 추가 참조 |
| --- | --- |
| AgentOps (지식·평가·변경) | [agentops/INDEX.md](./agentops/INDEX.md) |
| 구조 수정 가이드 | [adaptation/INDEX.md](./adaptation/INDEX.md) |
| 에이전트 구성 | [../agent/INDEX.md](../agent/INDEX.md) |
| 모델 배분 | [../agent/MODELS.md](../agent/MODELS.md) |
| Knowledge Base | [../knowledge/INDEX.md](../knowledge/INDEX.md) |
| Eval Suite | [../evals/INDEX.md](../evals/INDEX.md) |
| 실행 기록·LLMOps | [../observability/INDEX.md](../observability/INDEX.md) |
| Workflow tools | [tools/INDEX.md](./tools/INDEX.md) |
