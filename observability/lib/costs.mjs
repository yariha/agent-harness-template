// 실행 하나의 비용이 어디서 나왔나.
// 모델이 알려 준 청구액(cost_usd) 하나를 토큰 종류별 상대 가격으로 나눈다. 합은 항상 청구액과 같고,
// 모델별 가격표를 여기서 관리하지 않아도 된다. 비율은 Anthropic 기준(입력 = 1). 다른 공급자는 WEIGHT를 고친다.
export const WEIGHT = { input: 1, output: 5, cache_read: 0.1, cache_write_5m: 1.25, cache_write_1h: 2 };

export const LABEL = {
  cache_write: ['캐시에 새로 저장', '처음 보는 지시문·대화 기록을 캐시에 올린 비용. 1시간 캐시는 일반 입력의 2배'],
  output: ['답변·생각 작성', '모델이 쓴 답변, 도구 호출, 생각(thinking) 토큰. 일반 입력의 5배'],
  cache_read: ['캐시에서 다시 읽기', '도구를 한 번 부를 때마다 앞의 대화 전체를 캐시에서 다시 읽음. 일반 입력의 0.1배'],
  input: ['일반 입력', '캐시를 거치지 않은 새 입력'],
};

const int = (v) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0);

/** usage: Anthropic 형식 {input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, cache_creation:{ephemeral_1h_input_tokens, ephemeral_5m_input_tokens}} */
export function breakdown(usage, total) {
  if (!usage || typeof total !== 'number' || !(total > 0)) return [];
  const cc = usage.cache_creation || {};
  const wAll = int(usage.cache_creation_input_tokens);
  let w1h = int(cc.ephemeral_1h_input_tokens), w5m = int(cc.ephemeral_5m_input_tokens);
  if (w1h + w5m !== wAll) { w1h = 0; w5m = wAll; } // 나눔 정보가 없으면 5분 캐시로 본다
  const tokens = { input: int(usage.input_tokens), output: int(usage.output_tokens), cache_read: int(usage.cache_read_input_tokens), cache_write: wAll };
  const units = {
    input: tokens.input * WEIGHT.input, output: tokens.output * WEIGHT.output, cache_read: tokens.cache_read * WEIGHT.cache_read,
    cache_write: w1h * WEIGHT.cache_write_1h + w5m * WEIGHT.cache_write_5m,
  };
  const sum = Object.values(units).reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return [];
  return Object.keys(units).filter((k) => tokens[k])
    .map((k) => ({ key: k, label: LABEL[k][0], hint: LABEL[k][1], tokens: tokens[k], usd: (total * units[k]) / sum, share: units[k] / sum }))
    .sort((a, b) => b.usd - a.usd);
}

/** 한 실행의 llm span들을 합친다. 화면의 "왜 이만큼" 설명에 쓰는 turns·resumed·thinking도 함께. */
export function runCost(llmSpans) {
  let total = 0, turns = 0, resumed = false, thinking = 0;
  const parts = {};
  for (const s of llmSpans) {
    const m = s.meta || {};
    if (typeof m.cost_usd !== 'number') continue;
    total += m.cost_usd;
    turns += int(m.turns);
    resumed = resumed || Boolean(m.resumed);
    thinking += int(m.usage?.output_tokens_details?.thinking_tokens);
    for (const p of breakdown(m.usage || {}, m.cost_usd)) {
      const q = (parts[p.key] ||= { ...p, usd: 0, tokens: 0 });
      q.usd += p.usd; q.tokens += p.tokens;
    }
  }
  const out = Object.values(parts).sort((a, b) => b.usd - a.usd);
  for (const p of out) p.share = total ? p.usd / total : 0;
  return { total, parts: out, turns, resumed, thinking_tokens: thinking };
}
