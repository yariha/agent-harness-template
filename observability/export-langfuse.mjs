// 사용: node observability/export-langfuse.mjs [--limit N]
// 끝났지만 아직 보내지 않은 trace를 Langfuse로 보낸다. 키가 없으면 아무것도 하지 않고 성공으로 끝난다(선택 기능).
// 데몬이 있다면 trace가 끝날 때(Tracer onEnd)와 몇 분마다 LangfuseExporter.flush()를 부르는 편이 낫다.
import { loadConfig } from './lib/config.mjs';
import { LangfuseExporter } from './lib/langfuse.mjs';
import { TraceStore } from './lib/store.mjs';

const i = process.argv.indexOf('--limit');
const limit = i > 0 ? Number(process.argv[i + 1]) : 200;
const cfg = loadConfig();
if (!cfg.langfuse) {
  console.log('Langfuse 미설정(LANGFUSE_HOST/PUBLIC_KEY/SECRET_KEY 없음): 기록은 traces/에만 남는다.');
  process.exit(0);
}
const store = new TraceStore(cfg.tracesDir);
const sent = await new LangfuseExporter(cfg.langfuse, store, { serviceName: cfg.serviceName }).flush(limit);
const left = store.unexported(100000).length;
console.log(`sent ${sent}, unexported ${left}`);
process.exit(left && !sent ? 1 : 0);
