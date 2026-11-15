# SSOT — <PROJECT_NAME>

## Core Principles
- 이 파일 SSOT는 레포지토리 작업을 위한 문서의 최우선 원칙이자 시작점이다. 작업 시작 전 내부 점검에서 이 `Core Principles`를 지키겠다고 먼저 선언하고 확인한다. 상세 사고 과정은 노출하지 않는다.
- 비사소한 코드 변경은 `docs/tools/empirical-coding`의 Task Brief(목표·가드레일·종료조건·검증수단)로 시작하고, 검증 명령을 실제로 실행해 확인한 뒤에만 완료로 보고한다.
- `agent/`를 바꾸는 변경은 Change Record(`ops/changes/`)와 전후 평가 결과가 있어야 한다. 이슈는 고치기 전에 Eval Case로 먼저 등록한다. 평가 점수를 맞추려고 Eval Case를 고치지 않는다.
- Knowledge Item은 근거(Eval Case·재현 결과·Change Record) 없이는 Validated가 될 수 없다. `knowledge/raw/`는 수정하지 않고, Hold-out 케이스에서 지식을 추출하지 않는다.
- 자가 개선 제안(`evolution/proposals/`)도 같은 Eval Gate를 지난다. 에이전트는 Draft까지만 쓰고, 승격 권한은 `docs/adaptation/AUTONOMY_LEVELS.md`의 현재 단계를 따른다.
- 이 문서·영역 INDEX·스킬·훅에 행동 규칙을 추가하는 것은 같은 실수가 2회 이상 관찰됐을 때만 한 줄씩 한다. 모델 세대가 바뀌면 `prune-harness`로 걷어낸다.
- `Source Map`은 코드 작업을 위한 지도의 시작점이다. 반드시 직접 탐색보다, 지도를 통한 필요 작업 영역 `INDEX.md`의 Reference Map 탐색을 우선한다.
- <되돌리기 어려운 변경 1(예: DB schema 변경, 운영 데이터 쓰기, 검색 인덱스 재구축)>은 반드시 작업자의 명시 허락을 받은 뒤에만 진행한다.
- 어떤 작업이든 먼저 <핵심 계층(예: 데이터 접근 도구, 스키마)> 변경 없이 해결 가능한 방법(예: Knowledge Item 보강)을 찾고, 변경이 필요하면 이유와 영향 범위를 설명한다. 오버엔지니어링을 피하고 기존 공용 구조와 확장 가능한 경로를 먼저 확인한다.
- <프로젝트 고유 도메인 규칙은 여기에 한 줄씩. 예: 에이전트의 DB 접근은 read-only 계정만>

## 테스트 실행 규칙
- <동시 워크트리 수와 테스트 러너 제약을 적는다. 예: 단위 테스트는 워커 2개 이하, 평가는 smoke 세트를 먼저 돌린다>
- 하네스 무결성은 `node ci/check-harness.mjs`, 평가 게이트는 `node ci/eval-gate.mjs`로 확인한다.
- 실행 기록 도구는 `node --test observability/test/`로 확인한다. Langfuse 키가 없어도 통과해야 한다.

## Source Map
| 영역 | 코드 |
| --- | --- |
| 에이전트(진화 대상) | `agent/` |
| Knowledge Base | `knowledge/` |
| 평가 | `evals/` |
| 변경 추적·자가 개선 | `ops/`, `evolution/` |
| 실행 기록·흐름 보기·비용 (LLMOps) | `observability/`, `traces/` |
| <응용 코드 영역(에이전트를 부르는 서비스·CLI). 없으면 이 행 삭제> | `<경로>` |
| 게이트 | `ci/` |
| 작업 산출물 | `artifacts/*` |

## Working Protocol
1. 워크트리에서 시작한 세션이면 `git rev-parse --show-toplevel`로 워크트리 루트를 먼저 확인하고, 이후 모든 파일 편집/실행은 그 경로 안에서 한다.
2. `SSOT.md`에서 영역을 고르고, 영역 `INDEX.md`에서 소스 위치와 Reference Map을 확인한다.
3. `agent/` 변경이면 먼저 `knowledge/dev/`에서 과거 시도를 조회하고 `log-change` 절차를 따른다.
4. 수정 전에 검증 루프(Eval Case·테스트·재현 스크립트)를 먼저 세운다.
5. 문서가 코드와 다르면 코드를 기준으로 문서를 갱신한다.

## Doc Rules
- 탐색 순서: `docs/SSOT.md` → `<MAIN_AREA>/INDEX.md` → 선택적 `<SUB_AREA>/INDEX.md` → topic `*.md`. 깊이는 최대 3단계다.
- 기준형 문서(`SSOT.md`, `INDEX.md`)는 60줄 이내, 자료형 topic 문서와 Knowledge Item은 100줄 이내다. 넘으면 새 영역과 `INDEX.md`로 나눈다.
- 기준형 문서에는 구현 코드, 장문 API 상세, 긴 조사 결과를 넣지 않는다.
- 긴 ticket/spec/plan/report는 `artifacts/{issues,specs,plans,reports,scripts,versions}/`에 `YYYY-MM-DD-<topic>-<kind>.md`로 둔다. 줄 수 제한 대상이 아니다.

## Reference Map
| 작업 범위 | 추가 참조 |
| --- | --- |
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| AgentOps (지식·평가·변경 방법론) | [agentops/INDEX.md](./agentops/INDEX.md) |
| 구조 수정 가이드 | [adaptation/INDEX.md](./adaptation/INDEX.md) |
| 에이전트 구성·모델 배분 | [../agent/INDEX.md](../agent/INDEX.md) |
| 실행 기록·흐름 보기·비용·Langfuse(선택) | [../observability/INDEX.md](../observability/INDEX.md) |
| Workflow Tools | [tools/INDEX.md](./tools/INDEX.md) |
