import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseFrontmatter, checkKnowledge, checkChanges, checkIssues, checkEvalCases, checkChangedFiles, checkAll,
} from './check-harness.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function repo(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'harness-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  }
  return root;
}
const ki = (fields) => `---\n${Object.entries({ id: 'Q-0001', type: 'query-pattern', status: 'draft', ...fields })
  .map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n본문\n`;

test('parseFrontmatter는 배열·null·주석을 읽는다', () => {
  const fm = parseFrontmatter('---\nid: Q-0001\nstatus: draft   # 주석\ntags: [a, b]\nevidence: []\nlast_verified: null\n---\n');
  assert.deepEqual(fm, { id: 'Q-0001', status: 'draft', tags: ['a', 'b'], evidence: [], last_verified: null });
});

test('draft KI는 근거 없이 통과한다', () => {
  assert.deepEqual(checkKnowledge(repo({ 'knowledge/data/query-patterns/Q-0001-x.md': ki({}) })), []);
});

test('validated KI는 evidence와 last_verified가 있어야 한다', () => {
  const errors = checkKnowledge(repo({ 'knowledge/data/query-patterns/Q-0001-x.md': ki({ status: 'validated', evidence: '[]' }) }));
  assert.equal(errors.length, 2);
  assert.match(errors[0], /evidence 없음/);
  const ok = ki({ status: 'validated', evidence: '[replay:CASE-001]', last_verified: '2026-01-15' });
  assert.deepEqual(checkKnowledge(repo({ 'knowledge/data/query-patterns/Q-0001-x.md': ok })), []);
});

test('deprecated KI는 superseded_by가 있어야 한다', () => {
  const errors = checkKnowledge(repo({ 'knowledge/dev/lessons/L-0001-x.md': ki({ id: 'L-0001', status: 'deprecated' }) }));
  assert.match(errors[0], /superseded_by/);
});

test('Hold-out 케이스를 source로 쓰면 실패한다', () => {
  const root = repo({ 'knowledge/domain/heuristics/D-0001-x.md': ki({ id: 'D-0001', source: '[raw/cases/CASE-009]' }) });
  assert.match(checkKnowledge(root, ['CASE-009'])[0], /Hold-out 케이스 CASE-009/);
  assert.deepEqual(checkKnowledge(root, ['CASE-00']), []);
});

test('KI id 중복과 잘못된 status를 잡는다', () => {
  const errors = checkKnowledge(repo({
    'knowledge/data/caveats/DC-0001-a.md': ki({ id: 'DC-0001' }),
    'knowledge/data/caveats/DC-0001-b.md': ki({ id: 'DC-0001', status: 'done' }),
  }));
  assert.equal(errors.length, 2);
});

test('_TEMPLATE과 INDEX는 검사하지 않는다', () => {
  assert.deepEqual(checkKnowledge(repo({
    'knowledge/dev/lessons/_TEMPLATE.md': 'frontmatter 없음',
    'knowledge/dev/INDEX.md': '# index',
  })), []);
});

test('닫힌 Change Record는 전후 평가와 날짜가 있어야 한다', () => {
  const chg = (f) => `---\n${Object.entries({ id: 'CHG-0001', status: 'proposed', trigger: '[ISS-0001]', targets: '[agent/prompts/a.md]', ...f })
    .map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n`;
  assert.deepEqual(checkChanges(repo({ 'ops/changes/CHG-0001.md': chg({}) })), []);
  assert.equal(checkChanges(repo({ 'ops/changes/CHG-0001.md': chg({ status: 'adopted' }) })).length, 2);
  assert.deepEqual(checkChanges(repo({ 'ops/changes/CHG-0001.md': chg({
    status: 'rejected', date: '2026-01-15', eval_before: 'evals/results/a.json', eval_after: 'evals/results/b.json',
  }) })), []);
  assert.match(checkChanges(repo({ 'ops/changes/CHG-0001.md': chg({ trigger: '[]' }) }))[0], /trigger 없음/);
});

test('fixed 이슈는 Eval Case와 Change Record를 가리켜야 한다', () => {
  const iss = (f) => `---\nid: ISS-0001\nstatus: ${f.status}\neval_case: ${f.eval_case ?? '[]'}\nchange: ${f.change ?? '[]'}\n---\n`;
  assert.deepEqual(checkIssues(repo({ 'ops/issues/ISS-0001.md': iss({ status: 'open' }) })), []);
  assert.equal(checkIssues(repo({ 'ops/issues/ISS-0001.md': iss({ status: 'fixed' }) })).length, 2);
  assert.deepEqual(checkIssues(repo({ 'ops/issues/ISS-0001.md': iss({ status: 'fixed', eval_case: '[R-0001]', change: '[CHG-0001]' }) })), []);
});

test('Eval Case는 id·input·expected가 있어야 한다', () => {
  const errors = checkEvalCases(repo({
    'evals/retrieval/R-0001.json': JSON.stringify({ id: 'R-0001', input: { request: 'q' }, expected: { result: 'x' } }),
    'evals/retrieval/R-0002.json': JSON.stringify({ id: 'R-0002' }),
    'evals/analysis/A-0001.json': '{ 깨진 json',
  }));
  assert.equal(errors.length, 3);
});

test('agent/ 변경에는 Change Record가 따라야 한다', () => {
  assert.equal(checkChangedFiles(['agent/prompts/plan.md']).length, 1);
  assert.deepEqual(checkChangedFiles(['agent/prompts/plan.md', 'ops/changes/CHG-0002.md']), []);
  assert.deepEqual(checkChangedFiles(['docs/SSOT.md', 'agent/INDEX.md']), []);
});

test('이 저장소 자체가 검사를 통과한다', () => {
  assert.deepEqual(checkAll(repoRoot), []);
  assert.match(execFileSync(process.execPath, [path.join(repoRoot, 'ci/check-harness.mjs')]).toString(), /harness ok/);
});
