// 에이전트 흐름 화면: 실행 목록 → 토폴로지 / 순서도(스윔레인) → 단계 상세.
import { laneFor, nodeFor } from '/lib/topology.mjs';
import { renderTopology, setup } from '/static/topology.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = (p) => fetch(p).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${p} → ${r.status}`))));
const STATUS = { ok: ['정상', 'ok'], warn: ['경고', 'warn'], error: ['오류', 'err'], running: ['실행 중', ''] };
const time = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const hm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
const day = (iso) => new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
const ms = (a, b) => (a && b ? Math.max(0, Date.parse(b) - Date.parse(a)) : null);
const dur = (v) => (v == null ? '' : v < 1000 ? `${v}ms` : `${(v / 1000).toFixed(1)}초`);
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };
const worst = (xs) => (xs.includes('error') ? 'error' : xs.includes('warn') ? 'warn' : 'ok');

let TOPO, LANES, LANE_IDX;
const state = { status: '', detail: null, rows: [], cur: 0 };

/** 단계 한 줄의 담당 열·이름·요약. 도구 이름은 구성도 노드 이름으로 바꿔 보여 준다. */
function describe(s, trace) {
  const lane = laneFor(TOPO, s, trace);
  const node = TOPO.nodes.find((n) => n.id === nodeFor(TOPO, s, trace));
  const input = parse(s.input) || {};
  if (s.kind === 'llm') {
    const m = s.meta || {};
    return { lane, role: '워커가 생각하고 답을 씀', detail: [m.model, m.effort, dur(m.duration_ms ?? ms(s.started_at, s.ended_at)), m.cost_usd != null ? `$${Number(m.cost_usd).toFixed(2)}` : ''].filter(Boolean).join(' · ') };
  }
  if (s.kind === 'tool') {
    const short = s.name.replace(/^mcp__[^_]+__/, '');
    const first = typeof input === 'object' ? Object.values(input).find((v) => typeof v === 'string') : '';
    return { lane, role: `${short}${node && node.id !== 't.other' ? ` · ${node.name}` : ''}`, detail: s.status === 'error' ? s.error : first || '',
      verb: lane === 'write' ? 'write' : '' };
  }
  return { lane, role: s.name, detail: s.status === 'error' ? s.error : (s.output || s.input || '').replace(/\s+/g, ' ') };
}

function buildRows(detail) {
  const rows = [];
  for (const s of [...detail.spans].sort((a, b) => a.seq - b.seq)) {
    const d = describe(s, detail.trace);
    const last = rows.at(-1);
    if (last && s.kind === 'tool' && last.kind === 'tool' && last.name === s.name) {
      last.items.push(s); last.details.push(d.detail); last.status = worst(last.items.map((x) => x.status));
      continue;
    }
    rows.push({ kind: s.kind, name: s.name, items: [s], details: [d.detail], status: s.status, ...d });
  }
  return rows;
}

function renderGraph() {
  const { trace, spans } = state.detail;
  const rows = state.rows;
  const wi = LANE_IDX.worker ?? 1;
  const firstW = rows.findIndex((r) => r.lane === 'worker');
  const lastTool = rows.reduce((acc, r, i) => (['tool', 'check', 'output'].includes(r.kind) ? i : acc), firstW);
  const g = $('#graph');
  g.style.setProperty('--lanes', LANES.length);
  let html = LANES.map((l, i) => `<div class="lane-head" style="grid-column:${i + 1};grid-row:1"><b>${esc(l.name)}</b><span>${esc(l.desc)}</span></div>`).join('');
  html += LANES.map((_, i) => `<div class="lane-bg ${i % 2 ? 'alt' : ''}" style="grid-column:${i + 1};grid-row:2 / span ${Math.max(rows.length, 1)}"></div>`).join('');
  if (firstW >= 0 && lastTool > firstW) html += `<div class="spine" style="grid-column:${wi + 1};grid-row:${firstW + 2} / ${lastTool + 3}"></div>`;
  rows.forEach((r, i) => {
    const li = LANE_IDX[r.lane] ?? wi;
    let from = null;
    if (['tool', 'check', 'output'].includes(r.kind)) from = wi;
    else if (r.kind === 'llm' && i > 0) from = LANE_IDX[rows[i - 1].lane] ?? wi;
    if (from != null && from !== li) {
      const a = Math.min(from, li), b = Math.max(from, li);
      html += `<div class="link ${li > from ? 'right' : 'left'} ${r.status === 'ok' ? '' : r.status}" style="grid-column:${a + 1} / ${b + 2};grid-row:${i + 2};--span:${b - a + 1}"></div>`;
    }
    const count = r.items.length > 1 ? ` <span class="count">×${r.items.length}</span>` : '';
    const detail = r.items.length > 1 ? r.details.filter(Boolean).slice(0, 2).join(' · ') + (r.items.length > 2 ? ' …' : '') : r.details[0];
    html += `<button type="button" class="step ${r.status === 'ok' ? '' : r.status} ${r.verb === 'write' ? 'write' : ''}" data-i="${i}"
      data-lane="${esc(LANES[li]?.name || '')}" style="grid-column:${li + 1};grid-row:${i + 2}" aria-pressed="${i === state.cur}"
      aria-label="${i + 1}번째. ${esc(r.role)}. ${STATUS[r.status]?.[0] || ''}">
      <span class="num">${i + 1}</span><span class="role">${esc(r.role)}${count}</span><span class="detail">${esc(detail || ' ')}</span></button>`;
  });
  g.classList.remove('dense');
  g.style.gridTemplateRows = `auto repeat(${rows.length}, minmax(44px, auto))`;
  g.innerHTML = html;
  if (document.documentElement.scrollHeight > window.innerHeight + 4) { g.classList.add('dense'); g.style.gridTemplateRows = `auto repeat(${rows.length}, minmax(34px, auto))`; }
  g.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => select(+b.dataset.i)));

  const phases = [];
  for (const r of rows) {
    const label = LANES[LANE_IDX[r.lane] ?? wi]?.name || r.lane;
    const p = phases.at(-1);
    if (p && p.label === label) { p.count += r.items.length; p.status = worst([p.status, r.status]); }
    else phases.push({ label, count: r.items.length, status: r.status, first: rows.indexOf(r) });
  }
  $('#phases').innerHTML = phases.map((p) => `<button type="button" class="phase ${p.status === 'ok' ? '' : p.status}" data-i="${p.first}">${esc(p.label)}${p.count > 1 ? ` <b>${p.count}</b>` : ''}${p.status === 'error' ? ' · 오류' : ''}</button>`).join('<span class="arrow" aria-hidden="true">→</span>');
  $('#phases').querySelectorAll('.phase').forEach((b) => b.addEventListener('click', () => select(+b.dataset.i)));

  const errs = spans.filter((s) => s.status === 'error').length;
  $('#graph-h').textContent = `${trace.name} · ${trace.trigger}`;
  $('#graph-sub').textContent = `${day(trace.started_at)} ${time(trace.started_at)} · 단계 ${spans.length}개${errs ? ` · 오류 ${errs}` : ''} · ${dur(ms(trace.started_at, trace.ended_at))}`;
  const fe = rows.findIndex((r) => r.status === 'error');
  if (fe >= 0) {
    const e = rows[fe].items.find((x) => x.status === 'error');
    $('#cause').hidden = false;
    $('#cause').innerHTML = `<b>${fe + 1}번째 단계 · ${esc(rows[fe].role)}에서 오류</b> · ${esc((e.error || '').slice(0, 160))} <button type="button" id="jump">그 단계 보기</button>`;
    $('#jump').addEventListener('click', () => { setView('seq'); select(fe); });
  } else if (trace.status === 'error') {
    $('#cause').hidden = false; $('#cause').textContent = `실행 전체가 실패했어요: ${trace.error || ''}`;
  } else $('#cause').hidden = true;
}

function renderInspector() {
  const r = state.rows[state.cur];
  const tr = state.detail.trace;
  if (!r) { $('#inspector').innerHTML = '<p class="muted">이 실행에는 기록된 단계가 없어요.</p>'; return; }
  const [label, cls] = STATUS[r.status] || [r.status, ''];
  const block = (t, b, x = '') => (b ? `<div class="block ${x}"><span>${t}</span><pre>${esc(b)}</pre></div>` : '');
  const lane = LANES[LANE_IDX[r.lane]] || { name: r.lane };
  let body;
  if (r.items.length > 1) {
    body = `<ol class="calls">${r.items.map((s, k) => `<li class="${s.status === 'error' ? 'err' : ''}"><b>${k + 1}.</b> ${esc(r.details[k] || s.input || '')}${s.status === 'error' ? `<div class="e">${esc(s.error)}</div>` : ''}</li>`).join('')}</ol>${block('마지막 결과', r.items.at(-1).output)}`;
  } else {
    const s = r.items[0], m = s.meta || {};
    const kv = [['누가', lane.name], ['시각', time(s.started_at)], ['걸린 시간', dur(m.duration_ms ?? ms(s.started_at, s.ended_at)) || '–']];
    if (s.kind === 'llm') {
      kv.push(['모델', `${m.model || '?'} · ${m.effort || '?'}`]);
      if (m.usage) kv.push(['토큰', `입력 ${m.usage.input_tokens ?? '?'} · 출력 ${m.usage.output_tokens ?? '?'} · 캐시 읽기 ${m.usage.cache_read_input_tokens ?? 0} · 캐시 쓰기 ${m.usage.cache_creation_input_tokens ?? 0}`]);
      if (m.cost_usd != null) kv.push(['비용', `$${Number(m.cost_usd).toFixed(3)}`]);
      if (m.turns != null) kv.push(['턴', m.turns]);
    }
    if (s.kind === 'tool') kv.push(['도구', s.name]);
    body = `<dl class="kv">${kv.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${block('오류', s.error, 'err')}${block('입력', s.input)}${block('결과', s.output)}`;
  }
  const lf = /^https?:\/\//.test(tr.langfuse_url || '') ? esc(tr.langfuse_url) : '';
  $('#inspector').innerHTML = `
    <span class="muted small">${state.cur + 1} / ${state.rows.length}번째 단계 · ${esc(lane.name)}</span>
    <h3>${esc(r.role)}${r.items.length > 1 ? ` ×${r.items.length}` : ''}</h3>
    <span class="badge ${cls}" style="align-self:flex-start">${label}</span>${body}
    ${lf ? `<a href="${lf}" target="_blank" rel="noopener">Langfuse에서 이 실행 열기 ↗</a>` : '<span class="muted small">Langfuse 미연결 · 로컬 기록만 보여요</span>'}`;
}

function select(i) {
  if (!state.rows.length) return;
  state.cur = Math.max(0, Math.min(state.rows.length - 1, i));
  document.querySelectorAll('.step').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === state.cur)));
  document.querySelector(`.step[data-i="${state.cur}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  renderInspector();
}

function setView(v) {
  document.body.dataset.view = v;
  $('#tab-topo').setAttribute('aria-selected', String(v === 'topo'));
  $('#tab-seq').setAttribute('aria-selected', String(v === 'seq'));
  showView();
}

function showView() {
  if (!state.detail) return;
  renderGraph();
  if (document.body.dataset.view === 'seq') renderInspector(); else renderTopology(state.detail);
}

async function openTrace(id) {
  state.detail = await api(`/api/traces/${encodeURIComponent(id)}`);
  state.rows = buildRows(state.detail);
  const fe = state.rows.findIndex((r) => r.status === 'error');
  state.cur = fe >= 0 ? fe : 0;
  history.replaceState(null, '', `/?trace=${encodeURIComponent(id)}`);
  document.querySelectorAll('.run').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  showView();
}

async function loadRuns(preferId) {
  const traces = await api(`/api/traces${state.status ? `?status=${state.status}` : ''}`);
  $('#runs').innerHTML = traces.length ? traces.map((t) => {
    const s = t.status === 'error' ? `<span class="s err">오류 ${t.error_count || ''}</span>`
      : t.status === 'warn' ? `<span class="s warn">경고 ${t.warn_count}</span>` : `<span class="s">${t.status === 'running' ? '실행 중' : '정상'} · 단계 ${t.span_count}</span>`;
    return `<li><button type="button" class="run" data-id="${esc(t.id)}" aria-current="false" title="${esc(t.input || '')}">
      <span class="t">${day(t.started_at)} ${hm(t.started_at)} · ${esc(t.name)}</span>${s}</button></li>`;
  }).join('') : '<li class="empty-state muted">아직 기록된 실행이 없어요. 에이전트가 traces/에 기록을 남기면 여기에 보여요.</li>';
  $('#runs').querySelectorAll('.run').forEach((b) => b.addEventListener('click', () => openTrace(b.dataset.id).catch(showError)));
  const want = preferId && traces.find((t) => t.id === preferId) ? preferId : (traces.find((t) => t.status === 'error') || traces[0] || {}).id;
  if (want) await openTrace(want);
}

function showError(e) { $('#cause').hidden = false; $('#cause').textContent = `불러오지 못했어요: ${e.message}`; }

async function main() {
  const [topo, cfg] = await Promise.all([api('/api/topology'), api('/api/config')]);
  TOPO = topo; LANES = topo.lanes; LANE_IDX = Object.fromEntries(LANES.map((l, i) => [l.key, i]));
  setup(topo, cfg);
  document.querySelectorAll('.chip[data-status]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-status]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    state.status = b.dataset.status;
    loadRuns().catch(showError);
  }));
  $('#tab-topo').addEventListener('click', () => setView('topo'));
  $('#tab-seq').addEventListener('click', () => setView('seq'));
  $('#prev').addEventListener('click', () => select(state.cur - 1));
  $('#next').addEventListener('click', () => select(state.cur + 1));
  $('#graph').addEventListener('keydown', (e) => {
    const d = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
    if (!d) return;
    e.preventDefault(); select(state.cur + d); document.querySelector(`.step[data-i="${state.cur}"]`)?.focus();
  });
  await loadRuns(new URLSearchParams(location.search).get('trace'));
}
main().catch(showError);
