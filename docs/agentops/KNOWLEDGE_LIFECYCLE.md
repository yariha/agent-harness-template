# Knowledge Lifecycle

> Knowledge Item(KI)이 생기고, 검증되고, 쓰이고, 폐기되는 과정. 네 영역 모두 같은 여섯 단계를 따른다.

## 네 영역
| 영역 | 담는 것 | 원천 | 소비자 |
| --- | --- | --- | --- |
| `knowledge/domain/` | 사람이 하던 판단 (상황 → 볼 데이터 → 판단 기준) | 분석 케이스, 리포트, 인터뷰, 전문가 교정 | 대상 에이전트 |
| `knowledge/data/` | 방대한 DB·RAG에서 올바른 데이터를 찾는 법 | 스키마, 성공·실패한 쿼리, 검색 결과 분석 | 대상 에이전트 |
| `knowledge/learned/` | 에이전트가 실행 중 스스로 발견한 것 | 트레이스, 자가 개선 제안 | 대상 에이전트 (Validate 후) |
| `knowledge/dev/` | 에이전트를 만드는 과정에서 배운 것 | Issue, Change Record, 기각된 실험 | 개발 에이전트·사람 |

## 여섯 단계
1. **Capture**: 원본을 `knowledge/raw/`에 그대로 둔다. 수정하지 않는다. 개발 과정의 원본은 `ops/`의 Issue와 Change Record다.
2. **Distill**: 원본에서 KI 하나 = 사실 하나로 추출한다. 상태는 `draft`. (`distill-knowledge`)
3. **Validate**: 근거를 만든다. 근거는 셋 중 하나다.
   - Eval Case: KI를 평가 케이스로 만들고 통과를 확인한다. (`case-from-ki`)
   - Replay: raw data가 있는 케이스에서 KI대로 조회해 원본 문서의 수치가 재현되는지 확인한다.
   - Change Record: KI를 적용한 변경의 전후 점수.
4. **Promote**: 근거를 `evidence`에 적고 `status: validated`, `last_verified`를 갱신한 뒤 영역 `INDEX.md`에 등록한다. 승격 권한은 `docs/adaptation/AUTONOMY_LEVELS.md`의 현재 단계를 따른다.
5. **Serve**: 전체를 컨텍스트에 싣지 않는다. 상황 `tags`로 검색해 관련 KI만 제공한다. 운영 실행에는 `validated`만, `draft`는 실험 실행에서만 쓴다.
6. **Maintain**: 낡았거나 충돌하면 Re-validation 한다. 진 쪽은 `status: deprecated`로 바꾸고 `superseded_by`로 대체 KI를 가리킨다. 삭제하지 않는다. (`review-knowledge`)

## KI 형식
모든 KI는 frontmatter를 가진다. `ci/check-harness.mjs`가 검사한다.

```yaml
---
id: Q-0012                 # 영역 내 고유. 접두사는 knowledge/INDEX.md 참고
type: query-pattern
status: validated          # draft | validated | deprecated
tags: [매출, 주간집계]
source: [raw/cases/CASE-003]
evidence: [replay:CASE-003, evals/retrieval/R-0021]
last_verified: 2026-01-15
superseded_by: null
---
```

본문은 유형별 `_TEMPLATE.md`의 소제목을 따른다. 100줄 이내, 사실 하나.

## 관리 규칙
- **근거 필수**: `validated`는 `evidence`가 비어 있을 수 없다.
- **충돌은 평가로 결정**: 같은 상황에 상반된 KI가 있으면 둘 다 평가에 올리고 진 쪽을 Deprecated 처리한다.
- **Re-validation 계기**: 스키마 변경(관련 `data/` KI), 기반 모델 교체, `last_verified`가 오래된 KI, 관련 Eval Case 실패.
- **Hold-out 격리**: `evals/splits.json`의 `holdout` 케이스는 KI의 `source`가 될 수 없다.
- **Rejected도 자산**: 효과가 없던 시도는 `knowledge/dev/rejected/`에 남긴다. 같은 시도의 반복을 막는다.
- **분할**: 영역 INDEX가 60줄을 넘으면 하위 영역으로 나누고, KI가 수백 건이 되면 `docs/adaptation/SCENARIOS.md`의 "지식량 급증" 행을 따른다.

## 개발 과정 지식이 쌓이는 지점
- Change Record가 `adopted`되면 → Lessons Learned (무엇이 통했나, 부작용은)
- Change Record가 `rejected`·`rolled-back`되면 → Rejected Experiment
- 같은 원인의 Issue가 2회 이상이면 → Failure Mode
- 구조·방식을 정했으면 → ADR (`knowledge/dev/decisions/`)
- 평가 설계에서 배운 점 → Lessons Learned (tag: eval-design)
