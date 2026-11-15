# Trace 형식 (언어 무관 계약)

> trace 하나 = 에이전트 실행 한 번(요청 하나, 예약 작업 하나) = `traces/<trace.id>.json` 파일 하나.
> 어떤 언어로 써도 이 모양이면 뷰어·집계·Langfuse 전송이 동작한다. 원자적으로 쓴다(임시 파일 → rename).

## 파일
```json
{
  "trace": { "id": "32자리 hex", "name": "chat", "trigger": "user|schedule|…", "change": "CHG-0007",
             "input": "…", "output": null, "error": null, "status": "running|ok|warn|error",
             "started_at": "ISO-8601 UTC", "ended_at": null, "exported": false },
  "spans": [
    { "id": "16자리 hex", "parent_id": null, "seq": 1, "kind": "trigger", "name": "사용자 메시지",
      "status": "ok", "input": "…", "output": null, "error": null, "meta": {},
      "started_at": "…", "ended_at": "…" }
  ]
}
```
- id는 OpenTelemetry 모양(trace 32 hex, span 16 hex). 같은 id로 Langfuse 링크가 열린다.
- `input`·`output`·`error`는 문자열, 4000자에서 자른다. 객체는 JSON 문자열로.
- `seq`는 trace 안에서 1부터 일어난 순서. 화면은 이 순서로 그린다.
- 끝나면 `ended_at`을 채우고 `status`를 span 중 가장 나쁜 값으로(error > warn > ok). 예외로 끝났으면 `error`.

## span 종류 (`kind`)
| kind | 언제 | meta |
| --- | --- | --- |
| `trigger` | 실행을 시작시킨 것(메시지·버튼·cron) | |
| `llm` | 모델 호출 한 번(`claude -p` 한 번 = span 하나) | `model`, `effort`, `cost_usd`, `turns`, `usage`, `resumed`, `duration_ms`, `session_id` |
| `tool` | 모델이 부른 도구 한 번. `parent_id` = 그 llm span | |
| `check` | 실행 중 점검 결과(MCP 서버 연결 실패 등) | |
| `output` | 사용자에게 보낸 것 | `delivered` 등 |
| `error` | 처리하지 못한 예외 | |

## 오류로 볼 것
- 도구 결과의 `is_error`. Claude Code는 `<tool_use_error>…</tool_use_error>`로 감싼다(태그는 벗긴다).
- 정상 응답 안의 실패: `{"error": …}`, `{"saved": false, "violations": […]}`. 규칙은 `lib/trace.mjs`의 `payloadError`에서 프로젝트에 맞게 고친다.
- 막아 둔 도구를 부른 것(`No such tool available: Write`). 권한 설정이 의도대로인지 보여 주는 신호다.
- 도구 오류가 있으면 모델 답이 정상이어도 trace는 `error`다. "답은 했지만 일은 못 한" 실행을 숨기지 않는다.

## llm span의 `usage`
Anthropic 형식 그대로 둔다. 비용 내역에 필요하다.
`input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, `cache_creation.ephemeral_{5m,1h}_input_tokens`, `output_tokens_details.thinking_tokens`.
`cost_usd`는 모델(Claude Code는 `total_cost_usd`)이 알려 준 값을 그대로 쓴다. 직접 계산하지 않는다.

## 개인정보
- 사용자 식별자는 trace에 두더라도 `toOtlp`의 `privateKeys`로 외부 전송에서 뺀다(기본 `chat_id`).
- 비밀값·토큰을 `input`에 넣지 않는다. 필요하면 기록 전에 가린다.
- `traces/`는 git 제외다. 실패 사례로 남길 표본만 요약해 `ops/issues/`로 옮긴다.
