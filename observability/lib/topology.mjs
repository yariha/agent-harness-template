// span → 구성도 노드. 서버(테스트)와 브라우저가 같은 규칙을 쓰도록 순수 함수로 둔다.
// match: {kind, name, trigger} 각 값은 정규식. 위에서부터 처음 맞는 노드. via: 나열한 노드 중 하나라도 쓰였으면 "거침".
export function nodeFor(topo, span, trace) {
  for (const n of topo.nodes) {
    const m = n.match;
    if (!m) continue;
    if (m.kind && !new RegExp(m.kind.startsWith('^') ? m.kind : `^${m.kind}$`).test(span.kind)) continue;
    if (m.name && !new RegExp(m.name).test(span.name)) continue;
    if (m.trigger && !new RegExp(m.trigger).test(trace.trigger || '')) continue;
    return n.id;
  }
  return null;
}

/** 실행 하나를 구성도에 겹친다. st[nodeId] = {status, calls, ms, note}. langfuse: 설정 여부 */
export function overlay(topo, detail, { langfuse = false } = {}) {
  const { trace, spans } = detail;
  const st = {};
  const hit = (id, s, note) => {
    const o = (st[id] ||= { status: 'ok', calls: [], ms: 0, note: '' });
    if (s) {
      o.calls.push(s);
      if (s.status === 'error') o.status = 'error';
      else if (s.status === 'warn' && o.status !== 'error') o.status = 'warn';
      const d = s.meta?.duration_ms ?? (Date.parse(s.ended_at) - Date.parse(s.started_at));
      o.ms += Math.max(0, d || 0);
    }
    if (note) o.note = note;
    return o;
  };
  for (const s of spans) { const id = nodeFor(topo, s, trace); if (id) hit(id, s); }
  // via 노드: 앞뒤가 쓰였으면 경로상 거친 것으로 본다. 연쇄될 수 있어 바뀌지 않을 때까지 반복
  for (let changed = true; changed;) {
    changed = false;
    for (const n of topo.nodes) if (n.via && !st[n.id] && n.via.some((v) => st[v])) { hit(n.id, null, ''); changed = true; }
  }
  const llm = spans.find((s) => s.kind === 'llm');
  if (llm && st.config) st.config.note = [llm.meta?.model, llm.meta?.effort].filter(Boolean).join(' · ');
  const disabled = new Set();
  for (const n of topo.nodes) {
    if (n.special !== 'langfuse') continue;
    if (langfuse) hit(n.id, null, trace.exported ? '전송됨' : '전송 대기'); else disabled.add(n.id);
  }
  return { st, disabled };
}

export function laneFor(topo, span, trace) {
  const id = nodeFor(topo, span, trace);
  return topo.nodes.find((n) => n.id === id)?.lane || 'worker';
}
