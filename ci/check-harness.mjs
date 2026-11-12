// 하네스 불변 원칙을 기계로 확인한다. 사용: node ci/check-harness.mjs [--changed-base <git ref>]
// 구조를 바꾸면 KI_AREAS / EVAL_SUITES 상수를 맞춘다 (docs/adaptation/INDEX.md).
import { readFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KI_AREAS = ['knowledge/domain', 'knowledge/data', 'knowledge/learned', 'knowledge/dev'];
export const EVAL_SUITES = ['evals/retrieval', 'evals/analysis', 'evals/regression'];
const KI_STATUS = ['draft', 'validated', 'deprecated'];
const CHG_STATUS = ['proposed', 'adopted', 'rejected', 'rolled-back'];
const ISS_STATUS = ['open', 'fixed', 'wontfix'];
const KI_MAX_LINES = 100;
const SKIP = new Set(['INDEX.md', 'glossary.md', 'REGISTRY.md']);

/** `key: value` 한 줄짜리 frontmatter만 읽는다. 값은 문자열, null, 또는 [a, b] 배열. */
export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, '').trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      const inner = v.slice(1, -1).trim();
      out[kv[1]] = inner ? inner.split(',').map((s) => s.trim()).filter(Boolean) : [];
    } else if (v === 'null' || v === '') out[kv[1]] = null;
    else out[kv[1]] = v;
  }
  return out;
}

function walk(dir, ext, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, ext, out);
    else if (name.endsWith(ext) && !name.startsWith('_') && !SKIP.has(name)) out.push(abs);
  }
  return out;
}

const empty = (v) => v == null || (Array.isArray(v) && v.length === 0);

export function checkKnowledge(root, holdout = []) {
  const errors = [];
  const seen = new Map();
  for (const area of KI_AREAS) {
    for (const file of walk(path.join(root, area), '.md')) {
      const rel = path.relative(root, file);
      const text = readFileSync(file, 'utf8');
      const fm = parseFrontmatter(text);
      if (!fm) { errors.push(`${rel}: frontmatter 없음`); continue; }
      for (const k of ['id', 'type', 'status']) if (empty(fm[k])) errors.push(`${rel}: ${k} 없음`);
      if (fm.status && !KI_STATUS.includes(fm.status)) errors.push(`${rel}: status '${fm.status}'는 ${KI_STATUS.join('|')} 중 하나여야 함`);
      if (fm.status === 'validated') {
        if (empty(fm.evidence)) errors.push(`${rel}: validated인데 evidence 없음 (근거 없는 KI는 draft)`);
        if (empty(fm.last_verified)) errors.push(`${rel}: validated인데 last_verified 없음`);
      }
      if (fm.status === 'deprecated' && empty(fm.superseded_by)) errors.push(`${rel}: deprecated인데 superseded_by(대체 KI 또는 사유) 없음`);
      if (fm.id) {
        if (seen.has(fm.id)) errors.push(`${rel}: id ${fm.id} 중복 (${seen.get(fm.id)})`);
        else seen.set(fm.id, rel);
      }
      for (const src of fm.source ?? []) {
        const hit = holdout.find((c) => new RegExp(`(^|/)${c}($|/)`).test(src));
        if (hit) errors.push(`${rel}: Hold-out 케이스 ${hit}를 source로 사용 (추출 금지)`);
      }
      const lines = text.split('\n').length;
      if (lines > KI_MAX_LINES) errors.push(`${rel}: ${lines}줄 (KI는 ${KI_MAX_LINES}줄 이내)`);
    }
  }
  return errors;
}

export function checkChanges(root) {
  const errors = [];
  for (const file of walk(path.join(root, 'ops/changes'), '.md')) {
    const rel = path.relative(root, file);
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fm) { errors.push(`${rel}: frontmatter 없음`); continue; }
    if (empty(fm.id)) errors.push(`${rel}: id 없음`);
    if (!CHG_STATUS.includes(fm.status)) errors.push(`${rel}: status '${fm.status}'는 ${CHG_STATUS.join('|')} 중 하나여야 함`);
    if (empty(fm.trigger)) errors.push(`${rel}: trigger 없음 (왜 바꿨는지 추적 불가)`);
    if (empty(fm.targets)) errors.push(`${rel}: targets 없음`);
    if (fm.status && fm.status !== 'proposed') {
      if (empty(fm.eval_before) || empty(fm.eval_after)) errors.push(`${rel}: ${fm.status}인데 eval_before/eval_after 없음`);
      if (empty(fm.date)) errors.push(`${rel}: ${fm.status}인데 date 없음`);
    }
  }
  return errors;
}

export function checkIssues(root) {
  const errors = [];
  for (const file of walk(path.join(root, 'ops/issues'), '.md')) {
    const rel = path.relative(root, file);
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    if (!fm) { errors.push(`${rel}: frontmatter 없음`); continue; }
    if (empty(fm.id)) errors.push(`${rel}: id 없음`);
    if (!ISS_STATUS.includes(fm.status)) errors.push(`${rel}: status '${fm.status}'는 ${ISS_STATUS.join('|')} 중 하나여야 함`);
    if (fm.status === 'fixed') {
      if (empty(fm.eval_case)) errors.push(`${rel}: fixed인데 eval_case 없음 (이슈는 Eval Case로 등록)`);
      if (empty(fm.change)) errors.push(`${rel}: fixed인데 change 없음`);
    }
  }
  return errors;
}

export function checkEvalCases(root) {
  const errors = [];
  const seen = new Map();
  for (const suite of EVAL_SUITES) {
    for (const file of walk(path.join(root, suite), '.json')) {
      const rel = path.relative(root, file);
      let c;
      try { c = JSON.parse(readFileSync(file, 'utf8')); } catch { errors.push(`${rel}: JSON 파싱 실패`); continue; }
      for (const k of ['id', 'input', 'expected']) if (empty(c[k])) errors.push(`${rel}: ${k} 없음`);
      if (c.id) {
        if (seen.has(c.id)) errors.push(`${rel}: id ${c.id} 중복 (${seen.get(c.id)})`);
        else seen.set(c.id, rel);
      }
    }
  }
  return errors;
}

/** agent/가 바뀌었는데 Change Record가 함께 바뀌지 않았으면 오류. */
export function checkChangedFiles(files) {
  const touchedAgent = files.filter((f) => f.startsWith('agent/') && !f.endsWith('.gitkeep') && f !== 'agent/INDEX.md');
  const hasRecord = files.some((f) => /^ops\/changes\/CHG-.+\.md$/.test(f));
  return touchedAgent.length && !hasRecord
    ? [`agent/ 변경(${touchedAgent.length}개 파일)에 Change Record가 없음: ops/changes/CHG-####.md를 추가한다`]
    : [];
}

export function readHoldout(root) {
  const p = path.join(root, 'evals/splits.json');
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, 'utf8')).holdout ?? [];
}

export function checkAll(root, changedFiles = null) {
  return [
    ...checkKnowledge(root, readHoldout(root)),
    ...checkChanges(root),
    ...checkIssues(root),
    ...checkEvalCases(root),
    ...(changedFiles ? checkChangedFiles(changedFiles) : []),
  ];
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const i = process.argv.indexOf('--changed-base');
  let changed = null;
  if (i !== -1) {
    const base = process.argv[i + 1];
    if (!base) { console.error('usage: node ci/check-harness.mjs [--changed-base <git ref>]'); process.exit(2); }
    changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root }).toString().split('\n').filter(Boolean);
  }
  const errors = checkAll(root, changed);
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`\n${errors.length}건 실패`);
    process.exit(1);
  }
  console.log('harness ok');
}
