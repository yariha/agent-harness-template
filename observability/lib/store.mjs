// traces/*.json 읽기·목록·전송 표시. 저장소가 DB여도 이 함수들과 같은 모양만 돌려주면 뷰어가 그대로 동작한다.
import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';

const ID = /^[0-9a-f]{32}$/;

export class TraceStore {
  constructor(dir = 'traces') { this.dir = dir; }

  ids() {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((id) => ID.test(id));
  }

  get(id) {
    if (!ID.test(id)) return null;
    try { return JSON.parse(readFileSync(path.join(this.dir, `${id}.json`), 'utf8')); } catch { return null; }
  }

  /** 최근 순. status: ok|warn|error|running. 목록 행에는 단계 수와 오류·경고 수를 붙인다. */
  list({ status, limit = 50, since } = {}) {
    const rows = [];
    for (const id of this.ids()) {
      const d = this.get(id);
      if (!d?.trace) continue;
      const t = d.trace;
      if (status && t.status !== status) continue;
      if (since && t.started_at < since) continue;
      rows.push({ ...t, span_count: d.spans.length, error_count: d.spans.filter((s) => s.status === 'error').length,
        warn_count: d.spans.filter((s) => s.status === 'warn').length });
    }
    return rows.sort((a, b) => (a.started_at < b.started_at ? 1 : -1)).slice(0, limit);
  }

  /** since 이후 실행들의 span을 trace 이름(job)과 함께. 사용량·비용 집계용 */
  spansSince(since) {
    const out = [];
    for (const id of this.ids()) {
      const d = this.get(id);
      if (!d?.trace || d.trace.started_at < since) continue;
      for (const s of d.spans) out.push({ ...s, job: d.trace.name });
    }
    return out;
  }

  unexported(limit = 20) {
    return this.list({ limit: 10000 }).filter((t) => t.ended_at && !t.exported).reverse().slice(0, limit).map((t) => t.id);
  }

  markExported(id, value = true) {
    const d = this.get(id);
    if (!d) return;
    d.trace.exported = value;
    const file = path.join(this.dir, `${id}.json`);
    writeFileSync(`${file}.tmp`, JSON.stringify(d, null, 1));
    renameSync(`${file}.tmp`, file);
  }
}
