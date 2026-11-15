# HARNESS BOOTSTRAP — 프로젝트 하네스 설치 절차

> 진입점 `CLAUDE.md`(설치 전 임시본)가 이 파일을 가리킨다. 키트 본체는 같은 폴더의 `kit.txt`(파일 {{FILE_COUNT}}개, {{GENERATED_AT}} 생성)이며, **Read로 열지 않고** 2단계 스크립트로만 푼다.

---

## 에이전트에게 — 최우선 지시

이 프로젝트는 **아직 하네스가 설치되지 않은 상태**다. 아래 Bootstrap 절차를 끝까지 진행한다. 사용자가 명시적으로 설치를 거부하면 중단하고 파일은 그대로 둔다.

이 절차 자체도 키트에 든 `empirical-coding` 방법론을 따른다.

- **목표**: 이 프로젝트에 특화된 하네스(문서 지도 + 워크플로우 스킬 + 방법론 + 검증 수단)가 설치되고, `CLAUDE.md`가 `@docs/SSOT.md` 한 줄이 된다.
- **가드레일**: 기존 파일은 덮어쓰지 않는다(충돌 시 묻는다). 사용자 코드는 수정하지 않는다. 추측으로 자리표시자를 채우지 않는다.
- **종료 조건**: 0~7단계 모두 완료, 5단계 검증 전부 통과, `.harness-bootstrap/` 제거.
- **검증 수단**: 5단계의 명령.

> 7단계에서 진입점이 한 줄로 교체되고 `.harness-bootstrap/`이 지워진다. 그 전에 5·6단계를 끝내야 한다. 기존 `CLAUDE.md`가 있어 진입점 없이 `.harness-bootstrap/`만 넣었다면 7단계에서 기존 내용을 지키며 처리한다.

## 하네스가 무엇인가 (30초 요약)

네 층 + 방법론 층 + AgentOps 층이다.
1. 진입점: `CLAUDE.md`/`AGENTS.md` = `@docs/SSOT.md` 한 줄 (지식은 한 곳에).
2. 문서 지도: `docs/SSOT.md`(60줄) → `docs/<영역>/INDEX.md`(60줄) → topic(100줄). 문서는 백과사전이 아니라 코드로 가는 지도다.
3. 워크플로우 스킬: 본체 `docs/tools/<name>/SKILL.md`(사람 소유), 등록 `.claude/skills/<name>/SKILL.md`(2줄 shim).
4. 가드레일: SSOT Core Principles(허락 필수 변경 등) + CI 게이트.
7. 관측: 실행마다 `traces/`에 기록, `observability/viewer`로 흐름·비용을 보고, Langfuse는 선택. 시작 문서는 `observability/INDEX.md`.
6. AgentOps: 자가진화 에이전트 개발용. `agent/`(진화 대상) · `knowledge/`(Knowledge Base 네 영역) · `evals/`(Eval Suite·Baseline) · `ops/`(Issue·Change Record) · `evolution/`(자가 개선 제안). `agent/` 변경에는 Change Record와 전후 평가가 따른다. 시작 문서는 `docs/agentops/INDEX.md`.
5. 방법론(Boris Cherny): Task Brief 4요소(목표·가드레일·종료조건·검증수단), 검증 우선, 과설계 금지, 규칙은 2회 반복 실패 시에만, 모델 세대 교체 시 `prune-harness`.

---

## Bootstrap 절차

### 0단계 — 현재 상태 파악 (묻지 않고 직접 확인)

1. `pwd`, `ls -la`, `git rev-parse --show-toplevel 2>/dev/null`.
2. `CLAUDE.md`·`.harness-bootstrap/` 외에 코드가 있는지 판단한다: **빈 프로젝트** / **기존 코드 있음**.
3. 기존 코드가 있으면 스택을 직접 파악한다: `package.json`, `pyproject.toml`, `requirements*.txt`, `Cargo.toml`, `go.mod`, `*.xcodeproj`, `Package.swift`, `build.gradle*` 등. 앱/패키지 경계(`apps/*`, `packages/*`, `src/`, `services/*`), 테스트 러너, dev server 명령, `.env*` 파일 목록을 확인한다.
4. git 저장소가 아니면 `git init`을 제안한다(사용자 승인 후). `open-worktree`·`close-worktree`·`maintain-highway selected` 모드는 git이 있어야 동작한다. 거부하면 리포트에 그렇게 적는다. git을 쓰면 `.gitignore`에 `artifacts/reports/`를 넣을지도 이때 함께 묻는다(원본 하네스는 report를 gitignore한다).

### 1단계 — 인터뷰 (코드로 알 수 없는 것만, 한 번에 최대 4문항)

AskUserQuestion 같은 선택형 도구가 있으면 그것을 쓴다. 기존 코드에서 확인된 항목은 묻지 않고 "확인한 내용"으로 보여주기만 한다.

| 항목 | 빈 프로젝트 | 기존 코드 |
| --- | --- | --- |
| 프로젝트 이름·한 줄 목적 | 묻는다 | README에서 추론, 없으면 묻는다 |
| 스택·런타임 | 묻는다 (추천안 1개 제시) | 직접 확인 |
| 구조: 에이전트 단독 / 에이전트 + 응용 코드(영역 목록) | 묻는다 | 직접 확인 |
| 되돌리기 어려운 변경 (허락 필수) | 묻는다. 추천: DB schema/migration, 배포, 결제·외부 발송, 비밀값 | 코드에서 후보를 찾아 제시하고 확인 |
| 도메인 고유 규칙 (금지 패턴, read-only 접근 강제 등) | 없으면 비워둔다 | 있으면 묻는다 |
| 테스트 명령·제약: 테스트 워커 수(예: `--maxWorkers=2`)와 동시에 띄울 워크트리 수를 구분해 적는다 | 스택 기본값 제안 | 직접 확인 후 확인만 |
| 에이전트의 데이터 소스 (정형 DB / RAG / 둘 다), 쓰기 작업 여부 | 묻는다 | 코드에서 확인 후 확인만 |
| 분석 케이스 보유 (사람의 분석 문서 + 당시 raw data): 대략 건수, raw data 유무 | 묻는다 | 묻는다 |
| 개발 환경 선택지 (로컬/스테이지/프로덕션 DB 등) | DB가 있을 때만 | `.env*` 보고 제안 |

인터뷰 결과를 아래 "프로젝트 프로필"로 정리해 사용자에게 한 번 보여주고 확인받는다.

```text
PROJECT_NAME / 목적 / 스택 / 패키지 매니저 / 구조(영역 목록: 이름 → 코드 경로) /
허락 필수 변경 / 도메인 규칙 / 데이터 소스·쓰기 여부 / 분석 케이스(건수·raw data 유무) / 테스트 명령·동시성 / 환경 선택지
```

### 2단계 — 파일 풀기

`.harness-bootstrap/kit.txt`를 프로젝트 루트에 푼다. 각 블록은 `~~~~~file path=<상대경로>`로 시작해 `~~~~~` 한 줄로 끝난다.

python3가 있으면 아래로 한 번에 푼다 (기존 파일은 건너뛰고 목록을 출력한다):

```bash
python3 - .harness-bootstrap/kit.txt "$(pwd)" <<'PY'
import sys, os, re
src = open(sys.argv[1], encoding='utf-8').read().split('\n')
root = sys.argv[2]; i = 0; made = []; skipped = []
while i < len(src):
    m = re.match(r'^~~~~~file path=(\S+)$', src[i])
    if not m: i += 1; continue
    rel = m.group(1); i += 1; buf = []
    while src[i] != '~~~~~': buf.append(src[i]); i += 1
    i += 1; dst = os.path.join(root, rel)
    if os.path.exists(dst): skipped.append(rel); continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, 'w', encoding='utf-8').write('\n'.join(buf) + ('\n' if buf else '')); made.append(rel)
print('created', len(made)); print('SKIPPED (already exist):', skipped)
PY
```

python3가 없으면 `grep -n '^~~~~~' .harness-bootstrap/kit.txt`로 블록 위치를 찾고, 블록 단위로 Read(offset/limit)해 Write로 만든다. 진입점(`CLAUDE.md`/`AGENTS.md`)은 번들에 없다. 7단계에서 만든다.
SKIPPED 목록이 있으면 사용자에게 보여주고 병합 방법을 묻는다.

### 3단계 — 프로젝트에 특화 (가장 중요)

프로필을 근거로 자리표시자 `<...>`를 채우고, 스택에 맞지 않는 부분을 고친다. 모르는 것은 추측하지 말고 `TODO(<무엇을 확인해야 하는지>)`로 남긴 뒤 보고한다.

1. **`docs/SSOT.md`**
   - 제목의 `<PROJECT_NAME>`.
   - Core Principles: 허락 필수 변경을 프로필대로(여러 개면 한 줄에 나열), `<핵심 계층>`을 실제 핵심 계층으로, 도메인 규칙 줄은 규칙이 없으면 **줄을 삭제**한다.
   - 테스트 실행 규칙: 실제 테스트 명령과 동시성 제약 한 줄.
   - Source Map: AgentOps 행(`agent/`, `knowledge/`, `evals/`, `ops/` 등)은 그대로 둔다. 응용 코드 영역이 있으면 영역마다 한 행(이름 → 실제 경로)을 채우고, 없으면 자리표시자 행을 삭제한다.
   - Reference Map: 응용 코드 영역 INDEX를 만들었으면 영역마다 한 행을 추가한다.
   - 60줄 이하 유지.
2. **영역 INDEX**: 응용 코드 영역이 있으면 영역마다 `docs/<area>/INDEX.md`를 만든다. 구성은 한 줄 설명, Commands(실제 스택 명령), Runtime(필수 env), Source Map(폴더 → 책임), Reference Map이며 60줄 이내다. 빈 프로젝트면 계획된 명령을 쓰고 `(계획)` 표기. 에이전트 단독 프로젝트면 생략한다.
3. **`docs/ARCHITECTURE.md`**: 한 줄씩 채운다. 빈 프로젝트면 계획된 구조를 쓰고 `(계획)` 표기.
4. **`docs/tools/open-worktree/SKILL.md`**: 환경 선택지와 env 파일 경로를 프로필대로 고정한다. 의존성 설치 명령 자리표시자를 실제 패키지 매니저 명령으로 채운다. DB가 없으면 DB 분기를 지운다.
5. **`agent/MODELS.md`**: 기반 모델·판정 모델이 정해졌으면 표의 예시 행을 실제 행으로 바꾼다. 미정이면 예시 행을 지우고 `TODO(모델 배분)`를 남긴다.
6. **`ci/`**: `check-harness.mjs`·`eval-gate.mjs`는 node만 있으면 스택과 무관하게 동작한다. 수정하지 않는다. node가 없는 환경이면 사용자에게 알리고 리포트의 TODO로 남긴다.
6-1. **`observability/`**: 실행 기록 도구. `topology.json`의 노드 이름·역할·`match`를 이 프로젝트의 도구 이름(MCP 서버명, 내장 도구)에 맞춘다. 응용 코드가 있으면 실행마다 `observability/TRACE_FORMAT.md` 형식으로 `traces/`에 기록하게 하는 것을 리포트의 TODO로 남긴다(Node면 `lib/trace.mjs`를 그대로 쓴다). Langfuse는 권장이지만 묻지 않는다. 기본은 꺼짐이고 켜는 법은 `observability/LANGFUSE.md`.
7. **`.claude/agents/code-generator.md`**: 예시의 도메인 표현만 프로젝트에 맞게 손본다. 모델·절차는 유지.
8. **도메인 예시**: 템플릿의 예시 문장이 남은 곳을 이 프로젝트 도메인 예시로 바꾼다. 절차 문장은 바꾸지 않는다. 대상: `docs/tools/clarify-pre-spec/SKILL.md`의 "허용 질문 예시" 블록, `docs/tools/maintain-highway/selected-target.md`의 "기능/도메인: 예)" 줄, `.claude/agents/code-generator.md`의 description 예시(스택과 맞지 않으면 맥락도 함께). 확인: 5단계의 예시 문장 grep(`clarify-pre-spec` 블록).
9. **방법론 파일**(`docs/tools/empirical-coding/**`, `docs/tools/prune-harness/**`, `docs/agentops/**`)과 AgentOps 스킬(`distill-knowledge`, `case-from-ki`, `log-change`, `run-evals`, `promote-evolution`, `review-knowledge`)은 수정하지 않는다. 범용이다.
10. **AgentOps 층**
   - `agent/`, `knowledge/`, `evals/`, `ops/`, `evolution/`의 `_TEMPLATE` 파일과 빈 `INDEX.md` 표는 그대로 둔다. `evals/baseline.json`·`evals/splits.json`은 비워 둔다(측정·분할 전).
   - `knowledge/domain/glossary.md` 제목의 도메인 이름을 채운다.
   - `docs/adaptation/SCENARIOS.md`에서 프로필에 해당하는 행(데이터 소스, 쓰기 작업, 케이스 수, raw data 유무 등)을 찾아 사용자에게 보여 주고, 지금 적용할 구조 수정이 있는지 확인한다. 적용했으면 `knowledge/dev/decisions/`에 ADR로 남긴다.
   - 쓰기 작업을 하는 에이전트면 SSOT의 허락 필수 변경에 운영 데이터 쓰기를 넣는다.
   - `docs/adaptation/AUTONOMY_LEVELS.md`의 현재 단계는 L0으로 둔다.
   - 평가 러너는 설치 단계에서 만들지 않는다. 리포트의 TODO에 "평가 러너 구현(`evals/INDEX.md` 러너 계약)"을 남긴다.

### 4단계 — 첫 문서 지도

- 기존 코드가 있으면: `maintain-highway`를 **WIDE 모드**로 실행할지 묻는다(오래 걸림). 승인 시 `docs/tools/maintain-highway/SKILL.md` 절차대로 진행한다.
- 빈 프로젝트면: 생략. 첫 기능이 커밋된 뒤 narrow 모드로 시작한다.

### 5단계 — 검증 (모두 통과해야 다음 단계로)

```bash
# 남은 자리표시자: 결과 없음이어야 함. Artifact Rules 파일명 패턴(<topic>, <major> 등)과 Doc Rules의 일반 표기(<MAIN_AREA>)는 정상이라 제외한다. TODO(...)는 허용.
grep -rn '<[^>]*>' docs/SSOT.md docs/*/INDEX.md docs/ARCHITECTURE.md agent/MODELS.md docs/tools/open-worktree/SKILL.md | grep -vE '<(topic|sub-topic|attachment|major|minor|patch|MAIN_AREA|SUB_AREA|date)>'
wc -l docs/SSOT.md docs/*/INDEX.md                                   # 각 60 이하
grep -rniE '일반 회원 목록|주문 기록은 관리 확인용|조직 관리자에게만' docs .claude || echo ok   # 템플릿 예시 문장 없음 (이 프로젝트 도메인과 같으면 결과를 눈으로 판단)
node --test ci/*.test.mjs observability/test/                        # CI 장치·실행 기록 도구 자체 테스트
node ci/check-harness.mjs && node ci/eval-gate.mjs                   # 하네스 무결성, 평가 게이트(측정 전 통과)
```

추가로 SSOT·ARCHITECTURE·각 INDEX의 상대 링크가 모두 실제 파일을 가리키는지 확인한다.
실패 항목이 있으면 고치고 다시 돌린다.

### 6단계 — 설치 리포트

`artifacts/reports/<오늘 날짜>-harness-bootstrap-report.md`에 남긴다: 프로젝트 프로필, 만든 파일 수, 건너뛴 파일과 처리, 남은 `TODO(...)`, 삭제·변형한 부분(ci 등), git 유무, 5단계 검증 명령과 실제 출력.

### 7단계 — 진입점 교체·정리 (마지막)

1. `AGENTS.md`가 없으면 아래 내용으로 만든다.

```markdown
---
globs:
alwaysApply: true
---

**READ** @docs/SSOT.md
```

2. `CLAUDE.md`가 설치 전 임시 진입점(`# HARNESS BOOTSTRAP`으로 시작)이면 내용을 정확히 `@docs/SSOT.md` 한 줄로 바꾼다. 없으면 그 한 줄로 만든다. 사용자가 쓴 기존 `CLAUDE.md`라면 남길 줄을 SSOT Core Principles·영역 INDEX로 옮기자고 제안하고, 승인 후 한 줄로 바꾼다. `AGENTS.md`가 임시 진입점이면 위 1의 내용으로 바꾼다.
3. `rm -r .harness-bootstrap` (설치 도구일 뿐, 프로젝트 데이터가 아니다).
4. 확인: `head -1 CLAUDE.md` → `@docs/SSOT.md`, `test ! -e .harness-bootstrap && echo ok`. 리포트 Verification에 이 결과도 덧붙인다.

### 끝 — 사용자에게 보고하고 첫 작업으로

보고: 프로필 요약, 남은 TODO, 검증 결과, 리포트 경로, 사용 가능한 슬래시 명령(`/empirical-coding`, `/maintain-highway`, `/prune-harness`, `/distill-knowledge`, `/case-from-ki`, `/log-change`, `/run-evals`, `/promote-evolution`, `/review-knowledge`).
분석 케이스가 있으면 `docs/agentops/BOOTSTRAPPING.md`(Knowledge Bootstrapping)가 첫 작업 후보라고 안내한다.
그다음 사용자가 처음 요청했던 작업이 있으면 `empirical-coding` Task Brief로 시작한다. 없으면 "첫 작업을 알려주면 Task Brief(목표·가드레일·종료조건·검증수단)로 시작하겠다"고 안내한다.
세션을 새로 열면 새 `CLAUDE.md`(`@docs/SSOT.md`)가 로드된다는 점을 알린다.
