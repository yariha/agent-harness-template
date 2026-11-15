// 기간별 사용 현황: 보유 스킬, 도구별 사용·오류 횟수, 작업별 비용. "스킬·도구" 화면의 데이터.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { runCost } from './costs.mjs';

/** skillDirs 아래 <name>/SKILL.md의 frontmatter name·description */
export function listSkills(skillDirs) {
  const out = [];
  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      const f = path.join(dir, name, 'SKILL.md');
      if (!existsSync(f)) continue;
      const fm = readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      const kv = Object.fromEntries([...(fm?.[1] || '').matchAll(/^(\w+):\s*(.+)$/gm)].map((m) => [m[1], m[2].trim()]));
      out.push({ name: kv.name || name, description: kv.description || '', source: path.basename(path.dirname(dir)) + '/' + path.basename(dir) });
    }
  }
  return out;
}

export function usageReport(store, { days = 30, skillDirs = [], now = Date.now() } = {}) {
  const since = new Date(now - days * 864e5).toISOString();
  const spans = store.spansSince(since);
  const tools = {};
  for (const s of spans) {
    if (s.kind !== 'tool') continue;
    const t = (tools[s.name] ||= { name: s.name, uses: 0, errors: 0, last_used: null });
    t.uses += 1;
    t.errors += s.status === 'error' ? 1 : 0;
    if (!t.last_used || s.started_at > t.last_used) t.last_used = s.started_at;
  }
  // Claude Code는 스킬을 "Skill" 도구로 부른다. 입력에 스킬 이름이 들어 있다.
  const skillCalls = spans.filter((s) => s.kind === 'tool' && s.name === 'Skill');
  const skills = listSkills(skillDirs).map((k) => ({ ...k, uses: skillCalls.filter((s) => (s.input || '').includes(k.name)).length }));
  const byJob = {};
  for (const s of spans) if (s.kind === 'llm') (byJob[s.job] ||= []).push(s);
  const cost_by_job = Object.entries(byJob).map(([job, ls]) => {
    const c = runCost(ls);
    return { job, runs: ls.length, usd: c.total, parts: c.parts };
  }).sort((a, b) => b.usd - a.usd);
  return { days, skills, tools: Object.values(tools).sort((a, b) => b.uses - a.uses), cost_by_job };
}
