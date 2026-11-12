import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compare } from './eval-gate.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = { tolerance: 0.01, suites: { retrieval: { score: 0.84, n: 40 }, regression: { score: 1, n: 12 } } };

test('모든 Suite가 Baseline 이상이면 통과한다', () => {
  const r = compare(baseline, { suites: { retrieval: { score: 0.9 }, regression: { score: 1 } } });
  assert.equal(r.ok, true);
});

test('tolerance 안의 하락은 통과, 벗어나면 실패한다', () => {
  assert.equal(compare(baseline, { suites: { retrieval: { score: 0.835 }, regression: { score: 1 } } }).ok, true);
  const r = compare(baseline, { suites: { retrieval: { score: 0.9 }, regression: { score: 0.9, failed: ['G-0003'] } } });
  assert.equal(r.ok, false);
  assert.deepEqual(r.rows.find((x) => x.suite === 'regression').failed, ['G-0003']);
});

test('결과에 Suite가 빠지면 실패한다', () => {
  assert.equal(compare(baseline, { suites: { retrieval: { score: 0.9 } } }).ok, false);
});

// 프로젝트가 Baseline을 채운 뒤에는 이 테스트를 건너뛴다.
const measured = Object.keys(JSON.parse(readFileSync(path.join(repoRoot, 'evals/baseline.json'), 'utf8')).suites ?? {}).length > 0;

test('Baseline이 비어 있으면 CLI는 측정 전으로 통과시킨다', { skip: measured }, () => {
  const out = execFileSync(process.execPath, [path.join(repoRoot, 'ci/eval-gate.mjs')]).toString();
  assert.match(out, /측정 전/);
});
