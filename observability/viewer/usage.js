// 스킬·도구·비용 화면. 데이터: /api/usage?days=N (observability/lib/usage.mjs)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PART_COLOR = { cache_write: '#C2410C', output: '#1F5FAD', cache_read: '#8A8A84', input: '#D4D4CE' };
const usd = (v) => `$${v >= 0.1 ? v.toFixed(2) : v.toFixed(3)}`;
const ago = (iso) => { if (!iso) return '–'; const d = (Date.now() - Date.parse(iso)) / 864e5; return d < 1 ? '오늘' : `${Math.floor(d)}일 전`; };

function costBlock(d) {
  const all = d.cost_by_job, total = all.reduce((t, j) => t + j.usd, 0);
  document.getElementById('cost-total').textContent = total ? `최근 ${d.days}일 합계 ${usd(total)}` : '';
  if (!total) return '<p class="muted">이 기간에 비용이 기록된 모델 호출이 없어요. llm span의 meta.cost_usd·usage를 남기면 여기에 나와요.</p>';
  const parts = {};
  for (const j of all) for (const p of j.parts) { const q = (parts[p.key] ||= { ...p, usd: 0, tokens: 0 }); q.usd += p.usd; q.tokens += p.tokens; }
  const ps = Object.values(parts).sort((a, b) => b.usd - a.usd);
  const pct = (v) => Math.round((v / total) * 100);
  return `
    <h3 class="small muted" style="margin:0">무엇에 쓰였나</h3>
    <div class="stack" role="img" aria-label="${esc(ps.map((p) => `${p.label} ${pct(p.usd)}%`).join(', '))}">${ps.map((p) => `<span style="width:${(p.usd / total) * 100}%;background:${PART_COLOR[p.key]}"></span>`).join('')}</div>
    <table class="cap-table"><tbody>${ps.map((p) => `<tr><td><span class="sw" style="background:${PART_COLOR[p.key]}"></span> <b>${esc(p.label)}</b><div class="muted small">${esc(p.hint)}</div></td>
      <td class="num">${p.tokens.toLocaleString()} 토큰</td><td class="num"><b>${usd(p.usd)}</b> · ${pct(p.usd)}%</td></tr>`).join('')}</tbody></table>
    <h3 class="small muted" style="margin:8px 0 0">어떤 작업에 쓰였나</h3>
    <table class="cap-table"><tbody>${all.map((j) => `<tr><td>${esc(j.job)}</td><td class="num">${j.runs}회</td><td class="num">회당 ${usd(j.usd / j.runs)}</td><td class="num"><b>${usd(j.usd)}</b></td></tr>`).join('')}</tbody></table>
    <p class="muted small" style="margin:0">모델이 알려 준 실제 청구액을 토큰 종류별 가격 비율로 나눈 값이에요. 실행 하나의 내역은 에이전트 흐름에서 비용 칸을 눌러 봐요.</p>`;
}

function skillsBlock(d) {
  document.getElementById('skills-sub').textContent = `${d.skills.length}개 보유`;
  if (!d.skills.length) return '<div class="empty"><b>아직 스킬이 없어요</b><span class="muted small">agent/skills/&lt;이름&gt;/SKILL.md 또는 .claude/skills/에 두면 여기에 나와요. 사용 횟수는 실행 기록의 "Skill" 도구 호출로 셉니다.</span></div>';
  return `<table class="cap-table"><thead><tr><th>스킬</th><th>하는 일</th><th>위치</th><th class="num">사용</th></tr></thead><tbody>
    ${d.skills.map((s) => `<tr class="${s.uses ? '' : 'unused'}"><td class="cap-name">${esc(s.name)}</td><td>${esc(s.description)}</td><td class="muted small">${esc(s.source)}</td><td class="num">${s.uses}회</td></tr>`).join('')}</tbody></table>`;
}

function toolsBlock(d) {
  document.getElementById('tools-sub').textContent = `${d.tools.length}개 사용 (최근 ${d.days}일)`;
  if (!d.tools.length) return '<tbody><tr><td class="muted">이 기간에 도구 호출 기록이 없어요.</td></tr></tbody>';
  const max = Math.max(1, ...d.tools.map((t) => t.uses));
  return `<thead><tr><th>도구</th><th class="num">사용</th><th class="num">오류</th><th class="num">마지막</th></tr></thead><tbody>
    ${d.tools.map((t) => `<tr><td class="cap-name">${esc(t.name)}</td><td class="num"><span class="usebar" style="width:${(t.uses / max) * 60}px"></span>${t.uses}</td>
      <td class="num ${t.errors ? 'err-n' : ''}">${t.errors || '–'}</td><td class="num">${ago(t.last_used)}</td></tr>`).join('')}</tbody>`;
}

async function load(days) {
  document.querySelectorAll('[data-days]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.days === String(days))));
  const d = await (await fetch(`/api/usage?days=${days}`)).json();
  document.getElementById('cost').innerHTML = costBlock(d);
  document.getElementById('skills').innerHTML = skillsBlock(d);
  document.getElementById('tools').innerHTML = toolsBlock(d);
}
document.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => load(b.dataset.days)));
load(30);
