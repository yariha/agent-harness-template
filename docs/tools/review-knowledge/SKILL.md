---
name: review-knowledge
description: Knowledge Base의 Re-validation, 충돌 해소, Deprecated 처리에 사용한다. 스키마 변경·모델 교체 후나 정기 점검에 실행한다. "/review-knowledge", "지식 점검" 요청에 사용한다.
---

# Review Knowledge

## 목적
Knowledge Base가 낡거나 서로 어긋나지 않게 유지한다. 방법론은 `docs/agentops/KNOWLEDGE_LIFECYCLE.md`의 Maintain 단계.

## 범위 정하기
| 계기 | 대상 |
| --- | --- |
| 스키마·데이터 구조 변경 | 변경된 테이블·컬렉션을 가리키는 `knowledge/data/` KI |
| 기반 모델·검색 인덱스 교체 | 전체 Validated KI (우선순위: 이전 모델의 약점을 보정하던 것) |
| Eval Case 실패 | 그 케이스를 `evidence`로 가진 KI |
| 정기 점검 | `last_verified`가 오래된 순 |
| 충돌 보고 | 같은 `tags`·상황에 상반된 내용의 KI |

범위가 넓으면 대상 목록을 먼저 사용자에게 보여 주고 진행한다.

## 절차
1. **무결성.** `node ci/check-harness.mjs`를 실행해 형식 오류부터 고친다.
2. **Re-validation.** 대상 KI마다 `evidence`를 다시 확인한다.
   - Eval Case 근거 → 해당 케이스를 실행한다.
   - Replay 근거 → 같은 조회를 다시 해 수치가 나오는지 본다.
   - 통과하면 `last_verified`만 갱신한다.
3. **실패한 KI.** 내용을 고쳐 쓰지 않는다. 기존 KI를 `deprecated`로 바꾸고 `superseded_by`에 대체 KI ID 또는 사유를 적는다. 대체 내용이 있으면 새 KI를 Draft로 만든다.
4. **충돌 해소.** 상반된 KI는 둘 다 다루는 Eval Case로 평가한다 (없으면 `case-from-ki`). 진 쪽을 `deprecated` 처리한다. 조건에 따라 둘 다 맞으면 각 KI의 Situation을 좁히고 Exception Case를 만든다.
5. **INDEX 갱신.** 영역 `INDEX.md`의 Validated·Deprecated 표를 KI 상태와 맞춘다. 60줄을 넘으면 하위 영역 분할을 제안한다.
6. **쓰이지 않는 KI.** 어떤 Eval Case·Change Record에도 연결되지 않고 오래된 Draft는 목록으로 보고한다. 삭제는 사용자가 정한다.

## 가드레일
- `knowledge/raw/`는 수정하지 않는다.
- Deprecated KI를 삭제하지 않는다.
- Validated KI의 내용 변경이 에이전트 동작을 바꾸면 Change Record 대상이다 (`log-change`).

## 보고
검증한 KI 수, 갱신·Deprecated·신규 Draft 목록, 해소한 충돌, 사용자 결정이 필요한 항목.
