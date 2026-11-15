// 로컬 trace JSON → OTLP/HTTP JSON (Langfuse v4가 받는 유일한 형식: POST /api/public/otel/v1/traces).
// 다른 OpenTelemetry 백엔드에도 그대로 보낼 수 있다(langfuse.* 속성은 무시된다).
export const OTLP_PATH = '/api/public/otel/v1/traces';
const OBS_TYPE = { llm: 'generation', tool: 'tool' };
const LEVEL = { error: 'ERROR', warn: 'WARNING' };

const ns = (iso) => (iso ? String(BigInt(Date.parse(iso)) * 1000000n) : '0');

function attrs(pairs) {
  const out = [];
  for (const [key, v] of pairs) {
    if (v == null || v === '') continue;
    out.push({ key, value: { stringValue: typeof v === 'object' ? JSON.stringify(v) : String(v) } });
  }
  return out;
}

const statusOf = (s, err) => (s === 'error' ? { code: 2, message: err || 'error' } : { code: 1 });

/** privateKeys: 외부로 보내지 않을 trace 필드(예: 채팅방 id). 기본으로 trace.chat_id는 보내지 않는다. */
export function toOtlp({ trace: tr, spans }, { serviceName = 'agent', privateKeys = ['chat_id'] } = {}) {
  for (const k of privateKeys) if (k in tr) tr = { ...tr, [k]: undefined };
  const rootId = tr.id.slice(0, 16);
  const out = [{
    traceId: tr.id, spanId: rootId, name: tr.name, kind: 1,
    startTimeUnixNano: ns(tr.started_at), endTimeUnixNano: ns(tr.ended_at || tr.started_at),
    attributes: attrs([
      ['langfuse.trace.name', tr.name], ['langfuse.trace.input', tr.input], ['langfuse.trace.output', tr.output],
      ['langfuse.trace.tags', JSON.stringify([tr.trigger, tr.status, tr.change].filter(Boolean))], ['langfuse.trace.metadata.trigger', tr.trigger],
      ['langfuse.trace.metadata.change', tr.change], ['langfuse.release', tr.change],
      ['langfuse.observation.type', 'span'], ['langfuse.observation.level', LEVEL[tr.status]],
      ['langfuse.observation.status_message', tr.error],
    ]),
    status: statusOf(tr.status, tr.error),
  }];
  for (const s of spans) {
    const meta = s.meta || {};
    const usage = meta.usage || {};
    const pairs = [
      ['langfuse.observation.type', OBS_TYPE[s.kind] || 'span'], ['langfuse.observation.input', s.input],
      ['langfuse.observation.output', s.output], ['langfuse.observation.level', LEVEL[s.status]],
      ['langfuse.observation.status_message', s.error], ['langfuse.observation.metadata.kind', s.kind],
      ['langfuse.observation.metadata.step', s.seq],
    ];
    if (s.kind === 'llm') {
      pairs.push(['gen_ai.request.model', meta.model], ['langfuse.observation.model.name', meta.model],
        ['gen_ai.usage.input_tokens', usage.input_tokens], ['gen_ai.usage.output_tokens', usage.output_tokens],
        ['langfuse.observation.metadata.effort', meta.effort]);
      // 명시하지 않으면 Langfuse가 입력·출력 토큰만으로 다시 계산해 캐시 토큰(대개 비용의 대부분)이 빠진다.
      const details = Object.fromEntries(Object.entries({
        input: usage.input_tokens, output: usage.output_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens, cache_creation_input_tokens: usage.cache_creation_input_tokens,
      }).filter(([, v]) => Number.isInteger(v)));
      if (Object.keys(details).length) pairs.push(['langfuse.observation.usage_details', JSON.stringify(details)]);
      if (typeof meta.cost_usd === 'number') pairs.push(['langfuse.observation.cost_details', JSON.stringify({ total: meta.cost_usd })]);
    }
    out.push({
      traceId: tr.id, spanId: s.id, parentSpanId: s.parent_id || rootId, name: s.name, kind: 1,
      startTimeUnixNano: ns(s.started_at), endTimeUnixNano: ns(s.ended_at || s.started_at),
      attributes: attrs(pairs), status: statusOf(s.status, s.error),
    });
  }
  return { resourceSpans: [{ resource: { attributes: attrs([['service.name', serviceName]]) }, scopeSpans: [{ scope: { name: 'harness.trace' }, spans: out }] }] };
}
