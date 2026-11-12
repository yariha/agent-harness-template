// 평가 결과를 Baseline과 비교한다. 사용: node ci/eval-gate.mjs [결과 파일 (기본 evals/results/latest.json)]
// 형식은 evals/INDEX.md의 러너 계약을 따른다.
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Baseline에 있는 Suite마다 결과 점수가 (baseline - tolerance) 이상인지 본다. */
export function compare(baseline, result) {
  const tol = baseline.tolerance ?? 0;
  const rows = [];
  for (const [suite, base] of Object.entries(baseline.suites ?? {})) {
    const got = result.suites?.[suite];
    if (!got) { rows.push({ suite, ok: false, base: base.score, got: null, reason: '결과에 Suite 없음' }); continue; }
    const ok = got.score >= base.score - tol;
    rows.push({ suite, ok, base: base.score, got: got.score, reason: ok ? '' : 'Baseline보다 낮음', failed: got.failed ?? [] });
  }
  return { ok: rows.every((r) => r.ok), rows };
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const baseline = JSON.parse(readFileSync(path.join(root, 'evals/baseline.json'), 'utf8'));
  if (!Object.keys(baseline.suites ?? {}).length) {
    console.log('baseline 없음: 측정 전이라 게이트를 통과시킨다 (첫 평가 후 evals/baseline.json을 채운다)');
    process.exit(0);
  }
  const resultPath = path.resolve(root, process.argv[2] ?? 'evals/results/latest.json');
  if (!existsSync(resultPath)) { console.error(`✗ 평가 결과 없음: ${path.relative(root, resultPath)}`); process.exit(1); }
  const { ok, rows } = compare(baseline, JSON.parse(readFileSync(resultPath, 'utf8')));
  for (const r of rows) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.suite}: ${r.base} → ${r.got ?? '-'} ${r.reason}${r.failed?.length ? ` (실패: ${r.failed.join(', ')})` : ''}`);
  }
  process.exit(ok ? 0 : 1);
}
