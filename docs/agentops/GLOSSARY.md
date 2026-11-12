# Glossary

> 이 템플릿에서 쓰는 용어. 비유의 틀: 에이전트는 신입, 분석 문서는 선배의 풀이 노트, Knowledge Base는 공식 업무 노트, 평가는 모의고사.

| 용어 | 뜻 | 비유 |
| --- | --- | --- |
| Knowledge Item (KI) | 지식 한 가지를 담은 짧은 문서 파일 하나 | 업무 노트의 한 항목 |
| Draft / Validated / Deprecated | KI의 상태. 초안 / 근거가 확인됨 / 더 이상 쓰지 않음 | 메모 / 공식 노트 등재 / 줄 그어 지운 항목 |
| Capture | 원본 자료를 손대지 않고 보관 | 자료 모으기 |
| Distill | 원본에서 핵심 지식만 뽑아 KI로 정리 | 긴 풀이에서 요령만 추리기 |
| Reverse Analysis (역분석) | 결과물(분석 문서)을 보고 거꾸로 과정을 추적 | 완성된 요리를 보고 레시피 알아내기 |
| Decision Heuristic | "이 상황이면 이 데이터를 보고 이 기준으로 판단한다"는 규칙 | 숙련자의 감각을 글로 적은 것 |
| Data Catalog | 어떤 데이터가 어디에 어떤 뜻으로 있는지 정리한 지도 | 자료실 안내도 |
| Query Pattern | 어떤 목적일 때 데이터를 어떻게 조회하는지 정리한 방법 | 자료실에서 원하는 서류 찾는 법 |
| Data Caveat | 데이터를 볼 때 조심할 점 (단위, 중복, 시점 차이 등) | "이 표는 환불이 빠져 있음" 같은 주의 메모 |
| Validate | 뽑은 지식이 맞는지 확인 | 검산 |
| Replay (재현 검증) | 정리한 방법으로 다시 해 봤을 때 원래 문서의 수치가 나오는지 확인 | 같은 재료로 다시 만들어 같은 맛이 나는지 보기 |
| Promote | 검증을 통과한 KI를 정식 등록 | 공식 노트에 올리기 |
| Serve | 상황에 맞는 KI만 골라 에이전트에게 제공 | 필요한 페이지만 펼쳐 주기 |
| Re-validation | 낡았을 수 있는 KI를 다시 검증 | 오래된 노트 다시 확인 |
| Distill 세트 / Hold-out 세트 | 지식 추출에 쓰는 케이스 / 평가용으로만 남겨 둔 케이스 | 연습 문제 / 답을 안 본 실전 문제 |
| Eval Case | 평가 문제 한 건. 입력과 기대 결과로 구성 | 시험 문제 + 모범 답안 |
| Eval Suite | Eval Case 묶음 (Retrieval·Analysis·Regression) | 시험지 |
| Blind 평가 | 정답 문서를 보여 주지 않고 평가 | 오픈북이 아닌 시험 |
| Baseline | 변경 전후를 비교할 기준 점수 | 첫 모의고사 점수 |
| Regression | 전에 되던 것이 변경 후 안 되게 되는 현상 | 새 단원을 공부했더니 앞 단원을 틀리는 것 |
| Eval Gate | 평가 점수가 기준에 못 미치면 변경을 막는 관문 | 합격선 |
| Issue (ISS) | 발견된 실패 사례 한 건 | 틀린 문제 |
| Change Record (CHG) | 변경 한 건의 기록: 계기, 가설, 바꾼 것, 전후 점수, 결정 | "왜 무엇을 고쳤고 점수가 어떻게 됐나" 한 장 |
| Change Registry | Change Record 전체와 요약표 | 변경 대장 |
| Lessons Learned | 변경 과정에서 배운 점을 정리한 KI | 오답 노트의 교훈 |
| Failure Mode | 반복해서 나타나는 실패 유형 | 자주 하는 실수 유형 |
| ADR | 구조·방식을 왜 그렇게 정했는지 남긴 결정 기록 | 회의 결정 사항 |
| Rejected Experiment | 시도했지만 효과가 없어 기각한 변경 | "해 봤는데 안 됐음" 메모 |
| Self-Improvement Proposal | 에이전트가 실행 중 배운 것을 반영하자고 올린 제안 | 신입의 업무 개선 제안서 |
| Trace | 에이전트 실행 한 번의 기록 | 풀이 과정 |
| Traceability | Issue → Eval Case → Change Record → KI를 서로 따라갈 수 있는 성질 | 영수증처럼 근거를 거슬러 올라갈 수 있음 |
