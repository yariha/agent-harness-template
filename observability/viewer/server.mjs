// 실행 기록 뷰어. 의존성 없음. 사용: node observability/viewer/server.mjs  →  http://127.0.0.1:8790
// 읽기 전용(GET만). 기본으로 이 컴퓨터(127.0.0.1)에만 열린다. 휴대폰 등에서 보려면 VIEWER.md의 원격 접속 절.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, langfuseUrl } from '../lib/config.mjs';
import { runCost } from '../lib/costs.mjs';
import { TraceStore } from '../lib/store.mjs';
import { usageReport } from '../lib/usage.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OBS = path.dirname(HERE);
// 열어 주는 파일은 이 목록뿐(경로 조작 방지)
const FILES = {
  '/': ['index.html', 'text/html'], '/usage': ['usage.html', 'text/html'],
  '/static/viewer.css': ['viewer.css', 'text/css'], '/static/flow.js': ['flow.js', 'text/javascript'],
  '/static/topology.js': ['topology.js', 'text/javascript'], '/static/usage.js': ['usage.js', 'text/javascript'],
  '/lib/topology.mjs': ['../lib/topology.mjs', 'text/javascript'],
};

export function createViewer(cfg = loadConfig(), { topologyFile = path.join(OBS, 'topology.json') } = {}) {
  const store = new TraceStore(cfg.tracesDir);
  const skillDirs = [path.join(cfg.root, 'agent', 'skills'), path.join(cfg.root, '.claude', 'skills')];
  const withLink = (t) => ({ ...t, langfuse_url: langfuseUrl(cfg.langfuse, t.id), chat_id: undefined });

  const api = {
    '/api/config': () => ({ langfuse: Boolean(cfg.langfuse), langfuse_host: cfg.langfuse?.host || null }),
    '/api/topology': () => JSON.parse(readFileSync(topologyFile, 'utf8')),
    '/api/traces': (q) => store.list({ status: q.get('status') || undefined, limit: Math.min(Number(q.get('limit')) || 50, 200) }).map(withLink),
    '/api/usage': (q) => usageReport(store, { days: Math.min(Math.max(Number(q.get('days')) || 30, 1), 365), skillDirs }),
  };

  return createServer((req, res) => {
    const send = (code, body, type = 'application/json') => {
      res.writeHead(code, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(type === 'application/json' ? JSON.stringify(body) : body);
    };
    try {
      if (req.method !== 'GET') return send(405, { error: 'read-only' });
      const url = new URL(req.url, 'http://x');
      if (FILES[url.pathname]) {
        const [file, type] = FILES[url.pathname];
        return send(200, readFileSync(path.join(HERE, file)), type);
      }
      if (api[url.pathname]) return send(200, api[url.pathname](url.searchParams));
      const m = url.pathname.match(/^\/api\/traces\/([0-9a-f]{32})$/);
      if (m) {
        const d = store.get(m[1]);
        if (!d) return send(404, { error: 'trace not found' });
        const first = d.spans.find((s) => s.status === 'error');
        return send(200, { trace: withLink(d.trace), spans: d.spans, first_error_seq: first ? first.seq : null,
          cost: runCost(d.spans.filter((s) => s.kind === 'llm')) });
      }
      return send(404, { error: 'not found' });
    } catch (e) {
      return send(500, { error: e.message });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cfg = loadConfig();
  createViewer(cfg).listen(cfg.viewerPort, cfg.viewerHost, () => {
    console.log(`trace viewer: http://${cfg.viewerHost}:${cfg.viewerPort}  (traces: ${cfg.tracesDir}, Langfuse: ${cfg.langfuse ? cfg.langfuse.host : '꺼짐'})`);
  });
}
