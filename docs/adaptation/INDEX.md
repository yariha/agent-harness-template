# Sub-SSOT — Adaptation

> 에이전트 개발 시나리오가 달라질 때 이 템플릿의 구조를 어디까지, 어떻게 바꾸는지 정한 문서다.
> 폴더 이름과 개수는 바꿔도 된다. 불변 원칙이 깨지면 "나아졌는지 모르는" 상태로 돌아간다.

## 불변 원칙 (바꾸지 않는다)
1. `agent/` 변경에는 Change Record와 전후 평가가 따른다.
2. 이슈는 고치기 전에 Eval Case로 등록한다.
3. 근거 없는 KI는 Draft다.
4. `knowledge/raw/`는 수정하지 않는다.
5. Hold-out 케이스에서 지식을 추출하지 않는다.
6. 자가 개선 제안도 같은 Eval Gate를 지난다.

## 조정 가능 (바꿔도 된다)
- Knowledge Base 영역의 수와 이름, 하위 분할
- KI 유형의 추가·삭제
- Eval Suite의 종류와 지표
- 사람 승인이 필요한 지점과 자동화 수준
- 저장 방식 (파일 → 검색 인덱스, 외부 LLMOps 도구)
- `agent/`의 내부 구성 (단일 → 멀티 에이전트)

## 수정 판단 순서
앞 단계에서 해결되면 멈춘다.
1. **반복되는가**: 같은 불편이 2회 이상 관찰됐는가. 한 번이면 구조를 바꾸지 않는다.
2. **기존 자리로 되는가**: 기존 폴더·KI 유형·태그로 담을 수 있는가.
3. **유형 추가로 되는가**: KI 유형이나 Eval Suite 하나를 추가하면 되는가.
4. **영역 추가**: 그래도 안 되면 새 영역·폴더를 만들고 INDEX와 SSOT Source Map에 연결한다.
5. **기록**: 구조 변경을 `knowledge/dev/decisions/`에 ADR로 남긴다.

## 구조를 바꾼 뒤 할 일
- ADR 작성: 무엇이 불편했고, 어떤 대안이 있었고, 왜 이렇게 정했나.
- `docs/SSOT.md` Source Map과 관련 INDEX 갱신 (`maintain-highway`).
- `ci/check-harness.mjs`의 `KI_AREAS`·`EVAL_SUITES` 상수가 새 폴더를 포함하는지 확인.
- 불변 원칙 여섯 가지가 여전히 지켜지는지 `node ci/check-harness.mjs`로 점검.

## 피해야 할 수정
- **급해서 게이트를 건너뛴다**: 급한 수정도 Change Record는 사후에라도 남긴다.
- **Eval Case를 고쳐서 통과시킨다**: Baseline의 의미가 사라진다. Eval Case 수정도 Change Record 대상이다.
- **영역을 미리 만든다**: 빈 구조는 지도만 복잡하게 한다.
- **KI를 합쳐 긴 문서로 되돌린다**: 개별 검증·폐기·추적이 불가능해진다. 길어지면 나눈다.

## Reference Map
| 작업 범위 | 추가 참조 |
| --- | --- |
| 시나리오별 수정 방법 | [SCENARIOS.md](./SCENARIOS.md) |
| 자가진화 자동화 수준 | [AUTONOMY_LEVELS.md](./AUTONOMY_LEVELS.md) |
| 방법론 원문 | [../agentops/INDEX.md](../agentops/INDEX.md) |
