// 끝난 trace를 Langfuse로 보낸다(선택). 실패하면 trace는 미전송으로 남고 다음 flush가 다시 시도한다.
import { OTLP_PATH, toOtlp } from './otlp.mjs';

export class LangfuseExporter {
  constructor(lf, store, { serviceName = 'agent', fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    this.lf = lf;
    this.store = store;
    this.serviceName = serviceName;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async export(id) {
    const d = this.store.get(id);
    if (!d?.trace?.ended_at) return false;
    const auth = Buffer.from(`${this.lf.publicKey}:${this.lf.secretKey}`).toString('base64');
    try {
      const r = await this.fetch(this.lf.host + OTLP_PATH, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Basic ${auth}` },
        body: JSON.stringify(toOtlp(d, { serviceName: this.serviceName })), signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!r.ok) {
        console.warn(`[langfuse] export ${id} failed: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
        return false;
      }
    } catch (e) {
      console.warn(`[langfuse] unreachable (${e.name}); will retry`);
      return false;
    }
    this.store.markExported(id);
    return true;
  }

  async flush(limit = 20) {
    let sent = 0;
    for (const id of this.store.unexported(limit)) {
      if (!(await this.export(id))) break; // 꺼져 있거나 거부 중이면 나머지는 다음에
      sent += 1;
    }
    return sent;
  }
}
