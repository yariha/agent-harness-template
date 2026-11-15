// 실행 기록(Trace) 작성기 — Node 참조 구현. 다른 언어는 TRACE_FORMAT.md 형식만 지키면 된다.
// trace 하나 = traces/<id>.json 하나. 기록은 에이전트를 절대 멈추게 하지 않는다(쓰기 실패는 경고만).
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

export const MAX_TEXT = 4000;
export const KINDS = ['trigger', 'llm', 'tool', 'check', 'output', 'error'];
const now = () => new Date().toISOString();
const hex = (n) => randomBytes(n).toString('hex');

export function clip(v) {
  if (v == null) return null;
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length <= MAX_TEXT ? s : `${s.slice(0, MAX_TEXT)}… (+${s.length - MAX_TEXT})`;
}

/** span 상태 중 가장 나쁜 것: error > warn > ok */
export function worst(statuses) {
  return statuses.includes('error') ? 'error' : statuses.includes('warn') ? 'warn' : 'ok';
}

export class Trace {
  constructor(dir, name, trigger, input = null, { change = null } = {}) {
    this.dir = dir;
    this.data = {
      trace: { id: hex(16), name, trigger, change, input: clip(input), output: null, error: null, status: 'running',
        started_at: now(), ended_at: null, exported: false },
      spans: [],
    };
    this.flush();
  }

  get id() { return this.data.trace.id; }

  /** span을 추가하고 id를 돌려준다. meta: llm이면 {model, effort, usage, cost_usd, turns, resumed, duration_ms} */
  span(kind, name, { parent = null, status = 'ok', input, output, error, meta = {}, started_at, ended_at } = {}) {
    if (!KINDS.includes(kind)) throw new Error(`unknown span kind: ${kind}`);
    const start = started_at || now();
    const s = { id: hex(8), parent_id: parent, seq: this.data.spans.length + 1, kind, name, status,
      input: clip(input), output: clip(output), error: clip(error), meta, started_at: start, ended_at: ended_at || start };
    this.data.spans.push(s);
    this.flush();
    return s.id;
  }

  end({ status, output, error } = {}) {
    const t = this.data.trace;
    t.ended_at = now();
    t.output = clip(output ?? null);
    t.error = clip(error ?? null);
    t.status = status || worst(this.data.spans.map((s) => s.status));
    this.flush();
  }

  flush() {
    try {
      mkdirSync(this.dir, { recursive: true });
      const file = path.join(this.dir, `${this.id}.json`);
      writeFileSync(`${file}.tmp`, JSON.stringify(this.data, null, 1));
      renameSync(`${file}.tmp`, file); // 뷰어가 반쯤 쓴 파일을 읽지 않게
    } catch (e) {
      console.warn(`[trace] write failed: ${e.message}`);
    }
  }
}

export class Tracer {
  /** onEnd(traceId): 예) Langfuse 전송 예약. 실패해도 무시된다.
   *  change: 지금 운영 중인 agent/ 버전의 Change Record ID(예: CHG-0007). 실행을 변경과 이어 준다. */
  constructor(dir = 'traces', { onEnd, change = process.env.AGENT_CHANGE || null } = {}) {
    this.dir = dir;
    this.onEnd = onEnd;
    this.change = change;
  }

  /** fn(trace)를 실행하고 끝나면 trace를 닫는다. 예외는 error span으로 남기고 다시 던진다. */
  async run(name, trigger, input, fn) {
    const t = new Trace(this.dir, name, trigger, input, { change: this.change });
    try {
      const out = await fn(t);
      t.end();
      return out;
    } catch (e) {
      t.span('error', e?.name || 'Error', { status: 'error', error: String(e?.message ?? e) });
      t.end({ status: 'error', error: `${e?.name || 'Error'}: ${e?.message ?? e}` });
      throw e;
    } finally {
      try { await this.onEnd?.(t.id); } catch (e) { console.warn(`[trace] onEnd failed: ${e.message}`); }
    }
  }
}

// ---- Claude Code `claude -p --output-format stream-json --verbose` → 도구 단계 -------------------------------------
const TAG = /<\/?tool_use_error>/g;

function resultText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (p && typeof p === 'object' ? p.text || '' : '')).join('\n');
  return JSON.stringify(content);
}

/** 도구가 정상 응답 안에 {"error": ...}로 실패를 알리는 경우도 오류로 본다. 프로젝트 규칙에 맞게 고친다. */
export function payloadError(text) {
  let d;
  try { d = JSON.parse(text); } catch { return null; }
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    if (d.error) return String(d.error);
    if (d.saved === false && Array.isArray(d.violations) && d.violations.length) return `규칙 위반: ${d.violations.join('; ')}`;
  }
  return null;
}

export function parseClaudeStream(raw) {
  const r = { text: '', session_id: null, is_error: true, error: null, model: null, cost_usd: null, duration_ms: null,
    turns: null, usage: {}, mcp: {}, tools: [] };
  const byId = new Map();
  let sawResult = false;
  for (const line of String(raw).split('\n')) {
    let e;
    try { e = JSON.parse(line.trim()); } catch { continue; }
    if (!e || typeof e !== 'object') continue;
    if (e.type === 'system' && e.subtype === 'init') {
      r.session_id = e.session_id || r.session_id;
      r.model = e.model || null;
      for (const m of e.mcp_servers || []) if (m && m.name) r.mcp[m.name] = m.status;
    } else if (e.type === 'assistant' || e.type === 'user') {
      for (const p of e.message?.content || []) {
        if (!p || typeof p !== 'object') continue;
        if (p.type === 'tool_use') {
          const step = { id: p.id || '', name: p.name || '?', input: p.input, output: null, status: 'ok', error: null };
          byId.set(step.id, step);
          r.tools.push(step);
        } else if (p.type === 'tool_result') {
          const step = byId.get(p.tool_use_id || '');
          if (!step) continue;
          const text = resultText(p.content);
          step.output = text;
          const perr = payloadError(text);
          if (p.is_error || perr) { step.status = 'error'; step.error = perr || text.replace(TAG, '').trim(); }
        }
      }
    } else if (e.type === 'result') {
      sawResult = true;
      r.text = String(e.result ?? '');
      r.session_id = e.session_id || r.session_id;
      r.is_error = Boolean(e.is_error);
      r.cost_usd = e.total_cost_usd ?? null;
      r.duration_ms = e.duration_ms ?? null;
      r.turns = e.num_turns ?? null;
      r.usage = e.usage || {};
      if (r.is_error) r.error = r.text;
    }
  }
  if (!sawResult) { r.is_error = true; r.error = r.error || 'no result event'; }
  return r;
}

/** parseClaudeStream 결과를 trace에 llm span + 도구 span들로 남긴다. 도구 시각은 llm 구간에 순서대로 펼친다. */
export function recordClaudeRun(trace, parsed, { prompt, model, effort, resumed = false, started_at, ended_at = now() } = {}) {
  const start = started_at || ended_at;
  const llm = trace.span('llm', 'claude -p', {
    status: parsed.is_error ? 'error' : 'ok', input: prompt, output: parsed.text, error: parsed.is_error ? parsed.error : null,
    meta: { model: model || parsed.model, effort, resumed, cost_usd: parsed.cost_usd, duration_ms: parsed.duration_ms,
      turns: parsed.turns, usage: parsed.usage, session_id: parsed.session_id },
    started_at: start, ended_at,
  });
  for (const [name, status] of Object.entries(parsed.mcp)) {
    if (status !== 'connected') trace.span('check', `MCP 서버 ${name}`, { parent: llm, status: 'error', output: status, error: `MCP 서버 ${name} 상태: ${status}` });
  }
  const a = Date.parse(start), b = Math.max(Date.parse(ended_at), a + 1), n = Math.max(parsed.tools.length, 1);
  parsed.tools.forEach((s, i) => {
    const at = new Date(a + ((b - a) * (i + 0.1)) / n).toISOString();
    const to = new Date(a + ((b - a) * (i + 0.9)) / n).toISOString();
    trace.span('tool', s.name, { parent: llm, status: s.status, input: s.input, output: s.output, error: s.error, started_at: at, ended_at: to });
  });
  return llm;
}
