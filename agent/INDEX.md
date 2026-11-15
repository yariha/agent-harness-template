# agent/ — 진화 대상

> 대상 에이전트의 성능에 영향을 주는 것은 전부 여기 둔다. 여기 밖에 있는 설정이 성능을 바꾸면 변경을 추적할 수 없다.

## 구성
- `prompts/`: 시스템 프롬프트, 단계별 프롬프트 (목적 파악, 조회 계획, 분석 등)
- `skills/`: 에이전트가 쓰는 절차·플레이북
- `tools/`: 도구 정의 (DB 조회, 검색 등)와 설명문
- `retrieval/`: 검색 설정 (인덱스, 청킹, 임베딩, top-k, 라우팅)
- `MODELS.md`: 단계별 모델 배분(판단 모델·생성 모델), 키·엔드포인트 변수명. 모델 ID와 주요 파라미터는 설정값 한 곳에서 읽는다.

## 변경 규칙
- 이 폴더의 변경은 Change Record(`ops/changes/CHG-####.md`)와 전후 평가 결과가 있어야 한다.
- 변경 전에 `knowledge/dev/`에서 같은 주제의 과거 시도를 조회한다.
- 변경 하나에 가설 하나.
- 절차: `docs/tools/log-change/SKILL.md`

## Knowledge Base와의 관계
- 에이전트는 실행 시 `knowledge/domain/`, `knowledge/data/`, `knowledge/learned/`에서 상황 `tags`에 맞는 KI만 받아 쓴다.
- 운영 실행은 `status: validated`만 쓴다. `draft`는 실험 실행에서만 쓴다.
- 에이전트가 배운 것은 `agent/`나 `knowledge/`에 직접 쓰지 않고 `evolution/proposals/`에 제안으로 남긴다.

## 실행 기록
- 실행 기록은 `traces/`에 남긴다 (git 제외, 형식 `observability/TRACE_FORMAT.md`). 실패 사례로 등록할 표본만 `ops/issues/`에 요약해 옮긴다.
- 실행에 지금 운영 중인 Change Record ID를 붙인다(`AGENT_CHANGE`). 변경 전후 실행을 나눠 볼 수 있다.
