# Langfuse (권장, 선택)

> 로컬 뷰어로 충분하면 이 문서는 건너뛴다. Langfuse를 붙이면 같은 기록을 더 자세히 보고(트리·타임라인·필터),
> 실행에 점수·주석을 달고, 기간별 비용·지연을 집계할 수 있다. 원본은 계속 로컬 `traces/`다.

## 켜는 법
루트 `.env`(git 제외)에 넣는다. 셋 중 하나라도 없으면 꺼진 상태다.
```
LANGFUSE_HOST=http://localhost:3000
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PROJECT_ID=<프로젝트 id>   # 선택. 있으면 뷰어에서 trace별 링크가 열린다
OTEL_SERVICE_NAME=<서비스 이름>       # 선택
```
- 보내기: trace가 끝날 때 `Tracer({ onEnd: (id) => exporter.export(id) })`, 그리고 몇 분마다 `exporter.flush()`.
  데몬이 없으면 `node observability/export-langfuse.mjs`를 cron으로.
- 키를 지우면 바로 꺼진다. 코드를 바꿀 필요가 없다.

## 직접 설치 (자체 호스팅, 권장)
기록에 사용자 대화가 들어가므로 클라우드보다 자체 호스팅을 권한다.
1. 공식 `docker-compose.yml`을 받아 `deploy/langfuse/`에 둔다(Langfuse 저장소의 최신 파일).
2. **모든 포트를 `127.0.0.1`에만** 열도록 고친다(`"3000:3000"` → `"127.0.0.1:3000:3000"`, DB·ClickHouse·Redis·MinIO 포함).
3. compose 파일의 `# CHANGEME` 값을 `openssl rand -hex 32` 등으로 바꿔 `deploy/langfuse/.env`(git 제외)에 둔다.
4. `LANGFUSE_INIT_*` 값으로 조직·프로젝트·사용자·API 키를 처음부터 만들어 두면 웹에서 가입할 필요가 없다.
5. `docker compose -p langfuse up -d` → `http://localhost:3000`.

## 알아 둘 것 (실제로 겪은 문제)
- **v4는 OpenTelemetry로만 받는다.** `POST /api/public/otel/v1/traces`. 예전 `/api/public/ingestion`·trace 조회 API는 거부된다(`events_only`). 조회는 `/api/public/v2/observations?traceId=…`.
- **비용은 직접 보내야 맞는다.** 입력·출력 토큰만 보내면 Langfuse가 자기 가격표로 다시 계산해 캐시 토큰을 빼먹는다. 실제로 $0.44 실행이 $0.065로 보였다. `lib/otlp.mjs`는 `cost_details.total`(청구액)과 캐시 토큰이 든 `usage_details`를 함께 보낸다.
- **같은 trace를 다시 보내면 덮어쓰지 않고 한 벌 더 생긴다.** 재전송은 피하고, 고친 내용은 새 실행부터 반영된다고 본다.
- **로그인 계정이 다르면 다른 서버다.** 자체 호스팅은 `LANGFUSE_INIT_USER_*` 계정으로 들어간다. 구글 로그인이 됐다면 Langfuse Cloud에 들어간 것이다.
- Docker가 꺼져 있으면 trace는 미전송으로 남았다가 다시 켜진 뒤 flush 때 간다.

## 오류 분석 순서
1. 로컬 뷰어 "오류만" → 첫 오류 단계(빨간 노드)와 메시지.
2. 도구 오류면 입력을 보고, 같은 입력으로 도구를 단독 재현한다.
3. 반복되는 실패면 `ops/issues/`에 Issue로, 재현 케이스는 Eval Case로(`case-from-ki`). 고치기 전에 등록한다.
4. Langfuse에서는 `tags`(trigger·status·Change Record ID)로 걸러 변경 전후를 비교한다.
