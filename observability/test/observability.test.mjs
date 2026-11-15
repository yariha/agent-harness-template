import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { breakdown, runCost } from '../lib/costs.mjs';
import { loadConfig, langfuseUrl } from '../lib/config.mjs';
import { LangfuseExporter } from '../lib/langfuse.mjs';
import { toOtlp } from '../lib/otlp.mjs';
import { TraceStore } from '../lib/store.mjs';
import { nodeFor, overlay } from '../lib/topology.mjs';
import { Tracer, parseClaudeStream, recordClaudeRun } from '../lib/trace.mjs';
import { usageReport } from '../lib/usage.mjs';
import { createViewer } from '../viewer/server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOPO = JSON.parse(readFileSync(path.join(HERE, '..', 'topology.json'), 'utf8'));
const tmp = () => mkdtempSync(path.join(tmpdir(), 'obs-'));
const USAGE = { input_tokens: 12, output_tokens: 3253, cache_read_input_tokens: 72347, cache_creation_input_tokens: 21865,
  cache_creation: { ephemeral_1h_input_tokens: 21865, ephemeral_5m_input_tokens: 0 } };

async function sampleTrace(dir) {
  const tracer = new Tracer(dir);
  let id;
  await tracer.run('chat', 'user', 'hi', async (t) => {
    id = t.id;
    t.span('trigger', '사용자 메시지', { input: 'hi' });
    const llm = t.span('llm', 'claude -p', { meta: { model: 'm', effort: 'low', cost_usd: 0.4373, usage: USAGE, turns: 13, resumed: true } });
    t.span('tool', 'mcp__app__get_profile', { parent: llm });
    t.span('tool', 'WebSearch', { parent: llm, input: { query: 'q' } });
    t.span('tool', 'Write', { parent: llm, status: 'error', error: 'No such tool available: Write' });
  });
  return id;
}

test('비용 분할의 합은 청구액과 같고, 1시간 캐시 쓰기가 가장 크다', () => {
  const parts = breakdown(USAGE, 0.4373);
  assert.ok(Math.abs(parts.reduce((t, p) => t + p.usd, 0) - 0.4373) < 1e-9);
  assert.deepEqual(parts.map((p) => p.key), ['cache_write', 'output', 'cache_read', 'input']);
  assert.deepEqual(breakdown({}, 0.1), []);
  assert.deepEqual(breakdown(USAGE, null), []);
  const c = runCost([{ meta: { cost_usd: 0.4373, usage: USAGE, turns: 13, resumed: true } }]);
  assert.equal(c.turns, 13); assert.equal(c.resumed, true); assert.equal(c.parts[0].key, 'cache_write');
});

test('trace 파일: 끝나면 가장 나쁜 span 상태가 trace 상태가 된다', async () => {
  const dir = tmp();
  const id = await sampleTrace(dir);
  const d = new TraceStore(dir).get(id);
  assert.equal(d.trace.status, 'error');
  assert.equal(d.spans.length, 5);
  assert.equal(d.spans[3].parent_id, d.spans[1].id);
  assert.ok(d.trace.ended_at);
});

test('예외는 error span으로 남고 다시 던져진다. onEnd 실패는 무시한다', async () => {
  const dir = tmp();
  const tracer = new Tracer(dir, { onEnd: () => { throw new Error('lf down'); } });
  await assert.rejects(tracer.run('job', 'schedule', null, () => { throw new TypeError('boom'); }), /boom/);
  const [t] = new TraceStore(dir).list();
  assert.equal(t.status, 'error');
  assert.match(t.error, /TypeError: boom/);
});

test('claude stream-json: 도구 오류와 payload 오류를 잡는다', () => {
  const raw = [
    { type: 'system', subtype: 'init', session_id: 'S', model: 'm', mcp_servers: [{ name: 'app', status: 'failed' }] },
    { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'a', name: 'Write', input: {} }, { type: 'tool_use', id: 'b', name: 'mcp__app__save', input: {} }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a', is_error: true, content: '<tool_use_error>No such tool</tool_use_error>' },
      { type: 'tool_result', tool_use_id: 'b', content: [{ type: 'text', text: '{"saved": false, "violations": ["3~4개"]}' }] }] } },
    { type: 'result', result: 'ok', session_id: 'S', is_error: false, total_cost_usd: 0.1, num_turns: 3, usage: { output_tokens: 5 } },
  ].map((e) => JSON.stringify(e)).join('\n');
  const p = parseClaudeStream(raw);
  assert.equal(p.is_error, false); assert.equal(p.turns, 3);
  assert.equal(p.tools[0].error, 'No such tool');
  assert.match(p.tools[1].error, /규칙 위반: 3~4개/);
  assert.equal(parseClaudeStream('garbage').error, 'no result event');
  const dir = tmp();
  const tracer = new Tracer(dir);
  return tracer.run('chat', 'user', null, (t) => {
    recordClaudeRun(t, p, { prompt: 'x', effort: 'low' });
    const kinds = t.data.spans.map((s) => s.kind);
    assert.deepEqual(kinds, ['llm', 'check', 'tool', 'tool']);
    assert.ok(t.data.spans.slice(2).every((s) => s.started_at >= t.data.spans[0].started_at));
  });
});

test('OTLP: 비용·캐시 토큰을 명시하고 채팅 id는 보내지 않는다', async () => {
  const dir = tmp();
  const id = await sampleTrace(dir);
  const d = new TraceStore(dir).get(id);
  d.trace.chat_id = 12345;
  d.trace.change = 'CHG-0007';
  const body = toOtlp(d, { serviceName: 'svc' });
  const spans = body.resourceSpans[0].scopeSpans[0].spans;
  const attrs = (s) => Object.fromEntries(s.attributes.map((a) => [a.key, a.value.stringValue]));
  const llm = attrs(spans[2]);
  assert.equal(llm['langfuse.observation.type'], 'generation');
  assert.deepEqual(JSON.parse(llm['langfuse.observation.cost_details']), { total: 0.4373 });
  assert.equal(JSON.parse(llm['langfuse.observation.usage_details']).cache_read_input_tokens, 72347);
  assert.equal(spans[5].status.code, 2);
  assert.ok(!JSON.stringify(body).includes('12345'));
  assert.equal(spans[3].parentSpanId, spans[2].spanId);
  assert.deepEqual(JSON.parse(attrs(spans[0])['langfuse.trace.tags']), ['user', 'error', 'CHG-0007']);
});

test('Langfuse 전송: 성공하면 전송됨, 실패하면 다음에 재시도', async () => {
  const dir = tmp();
  const id = await sampleTrace(dir);
  const store = new TraceStore(dir);
  const lf = { host: 'http://lf', publicKey: 'pk', secretKey: 'sk', projectId: 'p' };
  const calls = [];
  const down = new LangfuseExporter(lf, store, { fetchImpl: async () => ({ ok: false, status: 503, text: async () => 'down' }) });
  assert.equal(await down.flush(), 0);
  assert.deepEqual(store.unexported(), [id]);
  const up = new LangfuseExporter(lf, store, { fetchImpl: async (url, init) => { calls.push([url, init]); return { ok: true }; } });
  assert.equal(await up.flush(), 1);
  assert.equal(calls[0][0], 'http://lf/api/public/otel/v1/traces');
  assert.match(calls[0][1].headers.authorization, /^Basic /);
  assert.deepEqual(store.unexported(), []);
});

test('Langfuse 키가 없으면 꺼진 상태(null)로 동작한다', () => {
  const root = tmp();
  assert.equal(loadConfig(root, {}).langfuse, null);
  writeFileSync(path.join(root, '.env'), 'LANGFUSE_HOST=http://localhost:3000/\nLANGFUSE_PUBLIC_KEY=pk\nLANGFUSE_SECRET_KEY="sk"\nLANGFUSE_PROJECT_ID=p\n');
  const lf = loadConfig(root, {}).langfuse;
  assert.equal(lf.host, 'http://localhost:3000'); assert.equal(lf.secretKey, 'sk');
  assert.equal(langfuseUrl(lf, 'abc'), 'http://localhost:3000/project/p/traces/abc');
});

test('구성도: span이 노드에 붙고 via 노드는 경로상 거침, Langfuse는 설정에 따라 꺼짐', async () => {
  const dir = tmp();
  const id = await sampleTrace(dir);
  const d = new TraceStore(dir).get(id);
  assert.equal(nodeFor(TOPO, { kind: 'tool', name: 'mcp__app__get_profile' }, d.trace), 't.read');
  assert.equal(nodeFor(TOPO, { kind: 'tool', name: 'Write' }, d.trace), 'builtin');
  assert.equal(nodeFor(TOPO, { kind: 'trigger', name: 'x' }, { trigger: 'schedule' }), 'trig.schedule');
  const ov = overlay(TOPO, d, { langfuse: false });
  assert.equal(ov.st.builtin.status, 'error');
  assert.ok(ov.st.app && ov.st.mcp && ov.st.store && ov.st.config);
  assert.equal(ov.st.config.note, 'm · low');
  assert.ok(ov.disabled.has('lf'));
  const ids = new Set(TOPO.nodes.map((n) => n.id));
  for (const [a, b] of TOPO.edges) assert.ok(ids.has(a) && ids.has(b), `edge ${a}->${b}`);
});

test('사용 현황: 도구별 사용·오류, 작업별 비용, 스킬 목록', async () => {
  const root = tmp();
  const dir = path.join(root, 'traces');
  await sampleTrace(dir);
  const skills = path.join(root, 'agent', 'skills', 'plan');
  (await import('node:fs')).mkdirSync(skills, { recursive: true });
  writeFileSync(path.join(skills, 'SKILL.md'), '---\nname: plan\ndescription: 계획을 짠다\n---\n');
  const u = usageReport(new TraceStore(dir), { days: 30, skillDirs: [path.join(root, 'agent', 'skills')] });
  assert.deepEqual(u.skills.map((s) => [s.name, s.uses]), [['plan', 0]]);
  assert.equal(u.tools.find((t) => t.name === 'Write').errors, 1);
  assert.equal(u.cost_by_job[0].job, 'chat');
  assert.ok(Math.abs(u.cost_by_job[0].usd - 0.4373) < 1e-9);
});

test('뷰어 서버: 목록·상세(비용 포함)·구성도·정적 파일, 쓰기와 경로 조작은 거부', async () => {
  const root = tmp();
  const id = await sampleTrace(path.join(root, 'traces'));
  const srv = createViewer(loadConfig(root, {}));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const list = await (await fetch(`${base}/api/traces`)).json();
    assert.equal(list[0].id, id); assert.equal(list[0].error_count, 1); assert.equal(list[0].langfuse_url, null);
    const d = await (await fetch(`${base}/api/traces/${id}`)).json();
    assert.equal(d.first_error_seq, 5); assert.equal(d.cost.parts[0].key, 'cache_write');
    assert.equal((await (await fetch(`${base}/api/config`)).json()).langfuse, false);
    assert.ok((await (await fetch(`${base}/api/topology`)).json()).nodes.length > 5);
    for (const p of ['/', '/usage', '/static/flow.js', '/lib/topology.mjs']) assert.equal((await fetch(base + p)).status, 200, p);
    assert.equal((await fetch(`${base}/static/../../.env`)).status, 404);
    assert.equal((await fetch(`${base}/api/traces/nothex`)).status, 404);
    assert.equal((await fetch(`${base}/api/traces`, { method: 'POST' })).status, 405);
  } finally { srv.close(); }
});
