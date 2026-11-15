# observability/ — 실행 기록·흐름 보기·비용 (LLMOps)

> 에이전트가 한 번 실행될 때 무엇을 했는지 단계별로 남기고, 화면으로 보고, 비용이 어디서 나왔는지 설명한다.
> 기록의 원본은 저장소 안 `traces/`(git 제외)다. Langfuse는 **권장하지만 선택**이다. 키가 없으면 모든 기능이 로컬만으로 동작한다.

## 구성
| 파일 | 하는 일 |
| --- | --- |
| `lib/trace.mjs` | Trace·span 작성기(Node 참조 구현), `claude -p` stream-json 해석·기록 |
| `lib/costs.mjs` | 청구액을 토큰 종류(캐시 쓰기·출력·캐시 읽기·입력)로 나눔 |
| `lib/otlp.mjs`, `lib/langfuse.mjs` | 로컬 trace → OTLP JSON → Langfuse(선택) |
| `lib/store.mjs`, `lib/usage.mjs`, `lib/topology.mjs` | 읽기·집계·구성도 매핑. 뷰어와 테스트가 같이 쓴다 |
| `viewer/` | 의존성 없는 웹 뷰어: 에이전트 흐름(토폴로지·순서도·단계 상세·비용 내역), 스킬·도구·비용 |
| `topology.json` | 에이전트 구성도. **프로젝트에 맞게 고친다** |
| `export-langfuse.mjs` | 미전송 trace를 Langfuse로. 키가 없으면 아무것도 안 함 |
| `demo.mjs` | 예시 기록 2개(정상·실패) 생성 |

## 쓰는 법
```bash
node observability/demo.mjs /tmp/demo-traces                     # 예시 기록
TRACES_DIR=/tmp/demo-traces node observability/viewer/server.mjs  # http://127.0.0.1:8790
node observability/export-langfuse.mjs                            # (선택) Langfuse로 보내기
node --test observability/test/                                   # 테스트
```

## 원칙
- 기록은 에이전트를 멈추게 하지 않는다. 쓰기·전송 실패는 경고만 남긴다.
- 원본은 로컬. Langfuse는 사본이다. 꺼져 있으면 미전송으로 남았다가 다음 전송 때 간다.
- 실행에 지금 운영 중인 Change Record ID(`AGENT_CHANGE`)를 붙여 변경과 실행을 잇는다.
- 사용자 식별자(채팅 id 등)는 외부로 보내지 않는다. 비밀값은 루트 `.env`에서만 읽는다.
- 뷰어는 읽기 전용이고 기본으로 `127.0.0.1`에만 열린다.
- 비용 판단은 턴 수가 아니라 비용 내역으로 한다(`COSTS.md`).

## 다른 언어로 된 에이전트
`TRACE_FORMAT.md`의 JSON만 `traces/<id>.json`으로 쓰면 뷰어·집계·Langfuse 전송이 그대로 동작한다. DB에 쌓는다면 `lib/store.mjs`와 같은 모양으로 돌려주는 API만 맞춘다.

## Reference Map
| 작업 범위 | 추가 참조 |
| --- | --- |
| 기록 형식(언어 무관 계약) | [TRACE_FORMAT.md](./TRACE_FORMAT.md) |
| 화면·구성도 고치기·원격 접속 | [VIEWER.md](./VIEWER.md) |
| Langfuse 설치·연결(선택) | [LANGFUSE.md](./LANGFUSE.md) |
| 비용 읽는 법·줄이는 법 | [COSTS.md](./COSTS.md) |
| 변경과 실행 연결 | [../docs/agentops/CHANGE_LOOP.md](../docs/agentops/CHANGE_LOOP.md) |
