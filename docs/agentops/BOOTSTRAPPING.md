# Knowledge Bootstrapping

> 프로젝트 초기에 지식 베이스를 처음 채우는 방법. 사람이 쓴 분석 문서와 당시 raw data가 함께 남아 있는 "분석 케이스"를 에이전트에게 주고, 어떻게 그렇게 분석됐는지 역분석시켜 KI로 축적한다.

## 흐름
```text
① Capture   분석 케이스(문서 + raw data) → knowledge/raw/cases/CASE-###/
              ├─ Distill 세트 (지식 추출용)        └─ Hold-out 세트 (평가 전용)
② Distill   역분석: 요청 목적 → 조회한 데이터          Eval Case 작성
            → 판단 기준을 재구성                       (입력: 요청+데이터 / 정답: 사람의 결론)
            → Decision Heuristic · Query Pattern
              · Data Caveat (모두 Draft)
③ Validate  Replay(수치 재현) + 전문가 리뷰
④ Promote   Validated KI ───── Serve ─────────────▶ ⑤ Blind 평가 → Baseline 확정
⑥ 불일치    재현 실패·평가 오답 → ISS → CHG → knowledge/dev/
```

## 단계별 할 일
1. **Capture**: 케이스마다 `knowledge/raw/cases/CASE-###/`에 문서, 데이터 스냅샷(또는 스냅샷 위치), `meta.md`를 둔다. 민감 정보는 저장소에 넣기 전에 처리한다.
2. **Split**: `evals/splits.json`에 케이스를 `distill`과 `holdout`으로 나눈다. 나눈 뒤에는 옮기지 않는다. 케이스가 적으면 `docs/adaptation/SCENARIOS.md`의 해당 행을 따른다.
3. **Distill (역분석)**: Distill 세트의 케이스마다 문서(캡처 이미지 포함)와 데이터를 대조해 세 가지를 재구성한다. (`distill-knowledge` 역분석 모드)
   - 요청의 목적이 무엇이었나
   - 어떤 데이터를 어떤 조건으로 조회했나 → Query Pattern, Data Caveat
   - 어떤 기준으로 결론을 냈나 → Decision Heuristic
   문서만으로 설명되지 않는 부분은 추측하지 말고 전문가 질문 목록으로 남긴다.
4. **Validate**: 재구성한 Query Pattern으로 조회해 문서의 수치가 재현되는지 확인한다(Replay). 재현되면 `evidence: [replay:CASE-###]`. 판단 기준은 전문가가 검토한다.
5. **Promote**: 재현되고 리뷰를 통과한 KI만 Validated로 올린다.
6. **Blind 평가**: Hold-out 케이스로 Eval Case를 만든다. 에이전트는 문서를 보지 않고 KI만으로 분석하고, 조회한 데이터와 결론을 사람의 문서와 비교한다. 이 결과가 첫 Baseline이다.
7. **불일치 처리**: 재현 실패와 평가 오답은 Issue로 등록하고 Change Loop를 탄다. 여기서 `knowledge/dev/`의 첫 KI가 생긴다.

## 왜 이렇게 하나
- **Hold-out 분리**: 지식을 뽑은 케이스로 다시 평가하면 외운 답을 맞히는 것이다. 처음 보는 케이스로 평가해야 지식이 일반화되는지 알 수 있다.
- **Replay**: raw data가 있으므로 "문서의 수치가 다시 나오는가"로 추측한 분석 절차를 걸러낼 수 있다.
- **전문가 질문 목록**: 문서에 적히지 않은 암묵지는 역분석으로 나오지 않는다. 질문과 답변을 `knowledge/raw/transcripts/`에 Capture해 다음 Distill의 원천으로 쓴다.

## raw data가 없는 리포트
재현할 수 없으므로 절차(무엇을 보고 어떤 기준으로 판단했나)만 추출해 Draft로 둔다. 전문가 리뷰나 이후 유사 케이스의 평가 결과가 근거로 붙을 때 승격한다. 평가는 수치 일치 대신 채점 기준표로 한다.

## 끝났다는 기준
- Distill 세트의 모든 케이스가 KI의 `source`로 한 번 이상 쓰였거나, 쓰이지 않은 이유가 `meta.md`에 있다.
- `evals/baseline.json`에 Suite별 점수와 측정 일자가 있다.
- `node ci/check-harness.mjs`가 통과한다.
