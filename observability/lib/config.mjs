// 설정은 환경변수 또는 루트 .env에서만 읽는다(비밀값을 코드·문서에 두지 않는다).
// Langfuse 키가 없으면 langfuse = null: 기록은 traces/에만 남고 모든 화면이 그대로 동작한다.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export function readDotenv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export function loadConfig(root = process.cwd(), env = process.env) {
  const e = { ...readDotenv(path.join(root, '.env')), ...env };
  const host = (e.LANGFUSE_HOST || '').replace(/\/+$/, '');
  const langfuse = host && e.LANGFUSE_PUBLIC_KEY && e.LANGFUSE_SECRET_KEY
    ? { host, publicKey: e.LANGFUSE_PUBLIC_KEY, secretKey: e.LANGFUSE_SECRET_KEY, projectId: e.LANGFUSE_PROJECT_ID || '' }
    : null;
  return {
    root,
    tracesDir: path.resolve(root, e.TRACES_DIR || 'traces'),
    serviceName: e.OTEL_SERVICE_NAME || path.basename(root),
    viewerHost: e.TRACE_VIEWER_HOST || '127.0.0.1',
    viewerPort: Number(e.TRACE_VIEWER_PORT || 8790),
    langfuse,
  };
}

/** 프로젝트 id를 알면 trace 상세로, 모르면 Langfuse 홈으로. */
export function langfuseUrl(lf, traceId) {
  if (!lf) return null;
  return lf.projectId ? `${lf.host}/project/${lf.projectId}/traces/${traceId}` : lf.host;
}
