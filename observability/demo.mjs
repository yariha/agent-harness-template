// 뷰어를 처음 볼 때 쓰는 예시 기록. 사용: node observability/demo.mjs [dir]  (기본 traces/)
// 정상 실행 1개(조회·웹·저장)와 저장 규칙 위반으로 실패한 실행 1개를 만든다. 실제 기록과 섞이지 않게 다른 폴더를 권한다.
import { Tracer } from './lib/trace.mjs';

const dir = process.argv[2] || 'traces';
const tracer = new Tracer(dir);
const usage = { input_tokens: 12, output_tokens: 2100, cache_read_input_tokens: 61000, cache_creation_input_tokens: 9000,
  cache_creation: { ephemeral_1h_input_tokens: 9000, ephemeral_5m_input_tokens: 0 } };

await tracer.run('chat', 'user', '이번 주 보고서 요약해줘', async (t) => {
  t.span('trigger', '사용자 메시지', { input: '이번 주 보고서 요약해줘' });
  const llm = t.span('llm', 'claude -p', { output: '요약했어요.', meta: { model: 'claude-opus-5-5', effort: 'low', cost_usd: 0.21, turns: 6, usage, duration_ms: 18000 } });
  t.span('tool', 'mcp__app__get_report', { parent: llm, input: { week: '2026-W46' }, output: '{"rows": 42}' });
  t.span('tool', 'WebSearch', { parent: llm, input: { query: '업계 주간 동향' }, output: '10 results' });
  t.span('tool', 'mcp__app__save_summary', { parent: llm, input: { text: '…' }, output: '{"id": 7}' });
  t.span('output', '답장', { output: '요약했어요.' });
});

await tracer.run('weekly-job', 'schedule', 'cron: mon 09:00', async (t) => {
  t.span('trigger', '예약 실행', { input: 'mon 09:00' });
  const llm = t.span('llm', 'claude -p', { output: '저장하지 못했어요.', meta: { model: 'claude-opus-5-5', effort: 'low', cost_usd: 0.34, turns: 9, resumed: true, usage, duration_ms: 31000 } });
  t.span('tool', 'mcp__app__list_items', { parent: llm, input: { since: '2026-11-01' }, output: '[...]' });
  t.span('tool', 'mcp__app__save_items', { parent: llm, status: 'error', input: { items: [] }, error: '규칙 위반: 3~4개여야 함' });
  t.span('tool', 'Write', { parent: llm, status: 'error', input: { file_path: 'x' }, error: 'No such tool available: Write' });
}).catch(() => {});

console.log(`demo traces written to ${dir}/`);
