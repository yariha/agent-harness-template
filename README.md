# Agent Harness Template

자가진화 에이전트를 개발하는 프로젝트를 위한 하네스 템플릿이다. 문서 지도·워크플로우 스킬·CI 게이트 위에 **Knowledge Base, Eval Suite, Change Registry**를 얹어, 에이전트에 대한 모든 변경에 대해 "왜 바꿨고, 무엇을 바꿨고, 성능이 어떻게 달라졌는가"에 답할 수 있게 한다.

## 어떤 문제를 푸는가

- 이슈가 날 때마다 고치다 보니 나아졌는지, 부작용이 생겼는지 알 수 없다 → 고정된 Eval Suite와 Baseline, Eval Gate
- 어떤 이슈 때문에 무엇을 어떻게 고쳤는지 추적이 안 된다 → Issue → Eval Case → Change Record → Knowledge Item으로 이어지는 Traceability
- 사람의 암묵지와 개발 과정에서 배운 것이 흩어진다 → 네 영역의 Knowledge Base와 하나의 라이프사이클
- 에이전트가 스스로 배운 것을 검증 없이 반영한다 → 자가 개선 제안도 같은 Eval Gate를 지난다

## 구조

```text
CLAUDE.md · AGENTS.md     → docs/SSOT.md 한 줄 위임 (진입점)
docs/                     문서 지도: SSOT → 영역 INDEX → topic
  agentops/               방법론: 지식 라이프사이클, 변경 순환, Bootstrapping, 용어
  adaptation/             시나리오별 구조 수정 가이드, 자동화 수준
  tools/                  절차 스킬 본문
agent/                    진화 대상: prompts · skills · tools · retrieval
knowledge/                Knowledge Base
  raw/                    원본 (수정 금지): cases · reports · schemas · transcripts
  domain/                 사람의 판단: Decision Heuristic · Exception · Glossary
  data/                   데이터를 찾는 법: Data Catalog · Query Pattern · Data Caveat
  learned/                에이전트가 배운 것 (검증 후)
  dev/                    개발 과정 지식: Lessons Learned · Failure Mode · ADR · Rejected
evals/                    Eval Suite: retrieval · analysis · regression, baseline, splits
ops/                      Change Registry: issues · changes · experiments
evolution/proposals/      자가 개선 제안
traces/                   실행 기록 (git 제외)
ci/                       check-harness (불변 원칙 검사), eval-gate (Baseline 비교)
artifacts/                긴 산출물
bootstrap/ → dist/        새 프로젝트 설치용 배포본
overview/                 구조 설명 HTML (다이어그램)
```

## 먼저 읽을 것

| 목적 | 문서 |
| --- | --- |
| 전체 그림을 다이어그램으로 | `overview/structure.html` |
| 용어가 낯설다 | `overview/bootstrapping-explained.html`, [docs/agentops/GLOSSARY.md](./docs/agentops/GLOSSARY.md) |
| 방법론 | [docs/agentops/INDEX.md](./docs/agentops/INDEX.md) |
| 분석 케이스로 지식 베이스를 처음 채우기 | [docs/agentops/BOOTSTRAPPING.md](./docs/agentops/BOOTSTRAPPING.md) |
| 내 프로젝트에 맞게 구조 바꾸기 | [docs/adaptation/INDEX.md](./docs/adaptation/INDEX.md), `overview/adaptation-guide.html` |

HTML 파일은 내려받아 브라우저로 연다.

## 불변 원칙

폴더 이름과 개수는 바꿔도 된다. 아래 여섯 가지는 바꾸지 않는다.

1. `agent/` 변경에는 Change Record와 전후 평가가 따른다.
2. 이슈는 고치기 전에 Eval Case로 등록한다.
3. 근거 없는 Knowledge Item은 Draft다.
4. `knowledge/raw/`는 수정하지 않는다.
5. Hold-out 케이스에서 지식을 추출하지 않는다.
6. 자가 개선 제안도 같은 Eval Gate를 지난다.

`ci/check-harness.mjs`가 1~5를, `ci/eval-gate.mjs`가 평가 점수를 기계로 확인한다.

## 사용법 — 부트스트랩 배포본

```bash
cp -R /path/to/agent-harness-template/dist/. /path/to/new-project/
```

그 폴더에서 Claude Code를 열고 "시작"이라고 말한다. 에이전트가 프로젝트를 살펴보고, 코드로 알 수 없는 것만 묻고, 키트를 풀어 프로젝트에 맞게 채우고 검증한 뒤 `CLAUDE.md`를 `@docs/SSOT.md` 한 줄로 바꾼다.

수동으로 쓰려면 `bootstrap/`, `dist/`, `overview/`를 뺀 나머지를 복사하고 `docs/SSOT.md`의 `<...>` 자리를 채운다.

## 절차 스킬

| 스킬 | 언제 |
| --- | --- |
| `/distill-knowledge` | 새 원본(분석 케이스·스키마·Change Record)에서 Knowledge Item Draft 추출 |
| `/case-from-ki` | Knowledge Item·Issue를 Eval Case로 |
| `/log-change` | `agent/` 변경: Change Record 생성 → 전후 평가 → 채택/기각 |
| `/run-evals` | 평가 실행과 Baseline 비교 |
| `/promote-evolution` | 자가 개선 제안을 Eval Gate에 태우기 |
| `/review-knowledge` | Re-validation, 충돌 해소, Deprecated 처리 |
| `/empirical-coding`, `/maintain-highway`, `/prune-harness` | Task Brief·검증 우선, 문서 지도 보수, 하네스 규칙 정리 |

## 프로젝트가 직접 만들어야 하는 것

- **평가 러너**: 스택에 맞게 구현한다. 지킬 것은 출력 형식뿐이다 ([evals/INDEX.md](./evals/INDEX.md)의 러너 계약).
- **Knowledge Item을 에이전트에 제공하는 방식**: 태그 검색, 임베딩 검색 등. 운영 실행에는 Validated만 쓴다.
- **대상 에이전트 자체**: `agent/` 아래에 둔다.

## 검증

```bash
node --test ci/*.test.mjs
```

```bash
node ci/check-harness.mjs
```

템플릿을 고친 뒤에는 `node bootstrap/pack.mjs`로 `dist/`를 다시 만든다.
