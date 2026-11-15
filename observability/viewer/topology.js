// 토폴로지 보기: 에이전트 전체를 고정된 지도로 그리고, 고른 실행이 쓴 부분에 불을 켠다.
// 지도는 observability/topology.json. 마우스 휠은 페이지 스크롤에 양보하고, 확대·축소는 버튼으로만 한다.
import { overlay } from '/lib/topology.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NW = 200, NH = 104;
const X = (c) => 40 + c * 250, Y = (r) => 56 + r * 160;
const ICON = {
  trigger: '<path d="M4 4h16v12H8l-4 4z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  gate: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  bot: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01"/>',
  brain: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  config: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plug: '<path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/>',
  read: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  write: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  send: '<path d="M3 11l18-8-8 18-2-8z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
};
const STATUS = { ok: ['완료', 'ok'], error: ['실패', 'err'], warn: ['경고', 'warn'] };
const PART_COLOR = { cache_write: '#C2410C', output: '#1F5FAD', cache_read: '#8A8A84', input: '#D4D4CE' };

let TOPO = null, BY_ID = {}, cfg = { langfuse: false };
let view = { k: 1, x: 0, y: 0 }, current = null, selected = null, ov = null;
const pos = (n) => ({ x: X(n.c), y: Y(n.r) });
const size = () => ({ W: X(Math.max(...TOPO.nodes.map((n) => n.c)) + 1) + 20, H: Y(Math.max(...TOPO.nodes.map((n) => n.r)) + 1) + 20 });

export function setup(topology, config) {
  TOPO = topology; cfg = config;
  BY_ID = Object.fromEntries(TOPO.nodes.map((n) => [n.id, n]));
  const host = document.getElementById('topo-canvas');
  let drag = null;
  host.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.topo-node')) return;
    drag = { x: e.clientX - view.x, y: e.clientY - view.y };
    host.setPointerCapture(e.pointerId);
    host.classList.add('grabbing');
  });
  host.addEventListener('pointermove', (e) => { if (drag) { view.x = e.clientX - drag.x; view.y = e.clientY - drag.y; applyView(); } });
  host.addEventListener('pointerup', () => { drag = null; host.classList.remove('grabbing'); });
  document.getElementById('topo-in').addEventListener('click', () => zoom(1.2));
  document.getElementById('topo-out').addEventListener('click', () => zoom(1 / 1.2));
  document.getElementById('topo-fit').addEventListener('click', fit);
  window.addEventListener('resize', () => current && fit());
}

function edgePath(a, b, mode, ax = 0.5, bx = 0.5) {
  const pa = pos(a), pb = pos(b);
  const sx = pa.x + NW * ax, tx = pb.x + NW * bx;
  if (mode === 'R') { const y = pa.y + NH / 2; return [`M ${pa.x + NW} ${y} L ${pb.x - 6} ${y}`, (pa.x + NW + pb.x) / 2, y - 10]; }
  if (mode === 'D') {
    const gy = pb.y - 42;
    if (Math.abs(sx - tx) < 1) return [`M ${sx} ${pa.y + NH} L ${tx} ${pb.y - 6}`, tx + 22, (pa.y + NH + pb.y) / 2];
    return [`M ${sx} ${pa.y + NH} L ${sx} ${gy} L ${tx} ${gy} L ${tx} ${pb.y - 6}`, tx, gy + 14];
  }
  if (mode === 'L') { const y = pb.y + NH / 2; return [`M ${sx} ${pa.y + NH} L ${sx} ${y} L ${pb.x - 6} ${y}`, (sx + pb.x) / 2, y - 10]; }
  if (mode === 'T') { const gy = Math.min(pa.y, pb.y) - 26; return [`M ${sx} ${pa.y} L ${sx} ${gy} L ${tx} ${gy} L ${tx} ${pb.y - 6}`, (sx + tx) / 2, gy - 9]; }
  if (mode === 'U') { const gy = pa.y + NH + 14; return [`M ${sx} ${pa.y + NH} L ${sx} ${gy} L ${tx} ${gy} L ${tx} ${pb.y + NH + 6}`, (sx + tx) / 2, gy - 9]; }
  return [`M ${pa.x + NW} ${pa.y} L ${pb.x} ${pb.y}`, 0, 0];
}

function render() {
  const host = document.getElementById('topo-canvas');
  const { W, H } = size();
  let html = `<div class="topo-world" id="topo-world" style="width:${W}px;height:${H}px">`;
  for (const g of TOPO.groups || []) {
    const r1 = g.r1 ?? g.r0;
    html += `<div class="topo-group" style="left:${X(g.c0) - 16}px;top:${Y(g.r0) - 28}px;width:${X(g.c1) - X(g.c0) + NW + 32}px;height:${Y(r1) - Y(g.r0) + NH + 44}px"><span>${esc(g.label)}</span></div>`;
  }
  html += `<svg class="topo-edges" width="${W}px" height="${H}px" aria-hidden="true"><defs>
    <marker id="ta-on" orient="auto" markerWidth="8" markerHeight="8" refX="6" refY="4"><path d="M0 0 L8 4 L0 8Z" fill="#3F3F3B"/></marker>
    <marker id="ta-off" orient="auto" markerWidth="8" markerHeight="8" refX="6" refY="4"><path d="M0 0 L8 4 L0 8Z" fill="#C9C9C2"/></marker>
    <marker id="ta-err" orient="auto" markerWidth="8" markerHeight="8" refX="6" refY="4"><path d="M0 0 L8 4 L0 8Z" fill="#D8473A"/></marker></defs>`;
  const labels = [];
  for (const [a, b, label, mode, ax, bx, onIf] of TOPO.edges) {
    if (!BY_ID[a] || !BY_ID[b]) continue;
    const used = (id) => ov && ov.st[id];
    const on = Boolean(ov && (onIf ? used(onIf) : used(a) && used(b)));
    const err = on && ov.st[b]?.status === 'error';
    const [d, lx, ly] = edgePath(BY_ID[a], BY_ID[b], mode, ax, bx);
    html += `<path d="${d}" class="${err ? 'err' : on ? 'on' : 'off'}" marker-end="url(#${err ? 'ta-err' : on ? 'ta-on' : 'ta-off'})"/>`;
    if (label) labels.push(`<span class="topo-elabel ${on ? 'on' : ''}" style="left:${lx}px;top:${ly - 8}px">${esc(label)}</span>`);
  }
  html += `</svg>${labels.join('')}`;
  for (const n of TOPO.nodes) {
    const p = pos(n), o = ov?.st[n.id], dis = ov?.disabled.has(n.id);
    const [label, cls] = o ? STATUS[o.status] : dis ? ['꺼짐', 'off'] : ['미사용', 'idle'];
    const k = o ? o.calls.length : 0;
    const secs = (v) => (v < 1000 ? `${v}ms` : `${(v / 1000).toFixed(1)}s`);
    const metric = !o ? '—' : o.calls.some((s) => s.kind === 'llm')
      ? `${o.calls.reduce((t, s) => t + (s.meta?.usage?.output_tokens || 0), 0)} tok · ${secs(o.ms)}`
      : k > 1 ? `×${k} · ${secs(o.ms)}` : k === 1 ? secs(o.ms) : (o.note || '✓');
    const sub = o?.status === 'error' ? (o.calls.find((s) => s.status === 'error')?.error || '실패') : o?.note || n.role;
    html += `<button type="button" class="topo-node ${cls} ${selected === n.id ? 'sel' : ''}" data-id="${esc(n.id)}" style="left:${p.x}px;top:${p.y}px"
      aria-label="${esc(n.name)}: ${label}. ${esc(n.role)}">
      <span class="tn-head"><span class="tn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n.icon] || ICON.plug}</svg></span>
        <span class="tn-status ${cls}"><i></i>${label}</span></span>
      <span class="tn-name">${esc(n.name)}</span>
      <span class="tn-sub">${esc(o ? sub : n.role)}</span>
      <span class="tn-foot"><span class="tn-ns">${esc(n.ns || n.id)}</span><span class="tn-metric">${esc(metric)}</span></span>
    </button>`;
  }
  host.innerHTML = `${html}</div>`;
  host.querySelectorAll('.topo-node').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); select(b.dataset.id); }));
  applyView();
  renderStrip();
}

function applyView() { const w = document.getElementById('topo-world'); if (w) w.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`; }
function fit() {
  const host = document.getElementById('topo-canvas');
  const { W, H } = size();
  const k = Math.min(host.clientWidth / W, host.clientHeight / H, 1.2);
  view = { k, x: (host.clientWidth - W * k) / 2, y: (host.clientHeight - H * k) / 2 };
  applyView();
}
function zoom(f) {
  const host = document.getElementById('topo-canvas');
  const cx = host.clientWidth / 2, cy = host.clientHeight / 2;
  const k = Math.max(0.3, Math.min(2.5, view.k * f));
  view.x = cx - (cx - view.x) * (k / view.k); view.y = cy - (cy - view.y) * (k / view.k); view.k = k;
  applyView();
}

const usd = (v) => `$${v >= 0.1 ? v.toFixed(2) : v.toFixed(3)}`;
function renderStrip() {
  const el = document.getElementById('topo-strip');
  const vals = TOPO.nodes.map((n) => (ov.st[n.id] ? ov.st[n.id].status : ov.disabled.has(n.id) ? 'off' : 'idle'));
  const c = (k) => vals.filter((v) => v === k).length;
  const cost = current.cost?.total || 0;
  const t = current.trace;
  const total = t.ended_at ? (Date.parse(t.ended_at) - Date.parse(t.started_at)) / 1000 : null;
  el.innerHTML = [
    ['완료', c('ok'), 'ok'], ['실패', c('error'), c('error') ? 'err' : ''], ['미사용', c('idle'), ''],
    ['걸린 시간', total == null ? '–' : `${total.toFixed(1)}초`, ''], ['비용', cost ? usd(cost) : '–', ''],
    ['Langfuse', cfg.langfuse ? (t.exported ? '전송됨' : '대기') : '꺼짐', ''],
  ].map(([k, v, cls]) => (k === '비용' && cost
    ? `<button type="button" class="ts-cell ts-btn" id="cost-btn" title="비용 내역 보기"><span>${k} · 내역 보기</span><b>${v}</b></button>`
    : `<div class="ts-cell ${cls}"><span>${k}</span><b>${v}</b></div>`)).join('');
  document.getElementById('cost-btn')?.addEventListener('click', showCost);
}

export function showCost() {
  const c = current?.cost;
  if (!c || !c.total) return;
  selected = null;
  document.querySelectorAll('.topo-node').forEach((b) => b.classList.remove('sel'));
  const why = [];
  if (c.parts[0]?.key === 'cache_write') why.push('가장 큰 몫은 캐시에 새로 올린 내용이에요. 지시문과 이전 대화가 길수록, 1시간 캐시를 쓸수록 커져요.');
  if (c.resumed) why.push('이 실행은 앞 대화를 이어받았어요(resume). 캐시가 만료된 뒤라면 대화 기록 전체를 다시 캐시에 써요.');
  if (c.turns > 6) why.push(`모델이 ${c.turns}번 오갔어요. 도구를 부를 때마다 앞 내용 전체를 다시 읽어서 읽기 비용이 쌓여요.`);
  if (c.thinking_tokens) why.push(`생각(thinking)에 ${c.thinking_tokens.toLocaleString()} 토큰을 썼어요. 출력 가격으로 계산돼요.`);
  document.getElementById('inspector').innerHTML = `
    <span class="muted small">이 실행의 비용</span>
    <h3>${usd(c.total)}</h3>
    <div class="cost-stack" role="img" aria-label="${esc(c.parts.map((p) => `${p.label} ${Math.round(p.share * 100)}%`).join(', '))}">
      ${c.parts.map((p) => `<span style="width:${p.share * 100}%;background:${PART_COLOR[p.key]}"></span>`).join('')}</div>
    <ol class="cost-parts">${c.parts.map((p) => `<li><span class="sw" style="background:${PART_COLOR[p.key]}"></span>
      <div><b>${esc(p.label)}</b> <span class="muted small">${p.tokens.toLocaleString()} 토큰</span><div class="muted small">${esc(p.hint)}</div></div>
      <b class="amt">${usd(p.usd)}<span class="muted small"> ${Math.round(p.share * 100)}%</span></b></li>`).join('')}</ol>
    ${why.length ? `<dl class="kv"><dt>왜 이만큼</dt><dd>${why.map(esc).join('<br>')}</dd></dl>` : ''}
    <p class="muted small">모델이 알려 준 실제 청구액을 토큰 종류별 가격 비율로 나눈 값이에요. 기간별 합계는 <a href="/usage">스킬·도구·비용</a>에서 봐요.</p>`;
}

function select(id) {
  selected = id;
  document.querySelectorAll('.topo-node').forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
  const n = BY_ID[id], o = ov?.st[id];
  const block = (t, b) => (b ? `<div class="block"><span>${t}</span><pre>${esc(b)}</pre></div>` : '');
  const [label, cls] = o ? STATUS[o.status] : ov?.disabled.has(id) ? ['꺼짐', ''] : ['미사용', ''];
  const calls = o?.calls || [];
  const lf = current?.trace.langfuse_url;
  document.getElementById('inspector').innerHTML = `
    <span class="muted small">${esc(n.ns || n.id)}</span>
    <h3>${esc(n.name)}</h3>
    <span class="badge ${cls}" style="align-self:flex-start">${label}</span>
    <dl class="kv"><dt>하는 일</dt><dd>${esc(n.role)}</dd>${o?.note ? `<dt>이번 실행</dt><dd>${esc(o.note)}</dd>` : ''}
      <dt>호출</dt><dd>${calls.length ? `${calls.length}회` : o ? '기록 없음 (경로상 거침)' : '0회'}</dd></dl>
    ${calls.length ? `<ol class="calls">${calls.map((s, k) => `<li class="${s.status === 'error' ? 'err' : ''}"><b>${k + 1}.</b> ${esc((s.input || s.name || '').slice(0, 160))}
      ${s.status === 'error' ? `<div class="e">${esc(s.error)}</div>` : ''}</li>`).join('')}</ol>`
    : o ? '<p class="muted small">이번 실행이 이 부분을 지나갔어요. 여기는 따로 호출 기록이 남지 않는 단계라, 앞뒤 단계를 보고 거쳤다고 표시했어요.</p>'
      : '<p class="muted small">이번 실행에서는 이 부분을 쓰지 않았어요 (미사용).</p>'}
    ${calls.length === 1 ? block('결과', calls[0].output) : ''}
    ${lf && /^https?:\/\//.test(lf) ? `<a href="${esc(lf)}" target="_blank" rel="noopener">Langfuse에서 이 실행 전체 보기 ↗</a>` : ''}`;
}

export function renderTopology(detail) {
  current = detail;
  ov = overlay(TOPO, detail, { langfuse: cfg.langfuse });
  const firstErr = TOPO.nodes.find((n) => ov.st[n.id]?.status === 'error');
  selected = firstErr ? firstErr.id : (TOPO.nodes.find((n) => ov.st[n.id]?.calls.some((s) => s.kind === 'llm'))?.id || TOPO.nodes[0].id);
  render();
  fit();
  select(selected);
}
