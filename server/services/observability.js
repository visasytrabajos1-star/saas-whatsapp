const WINDOW_SIZE = 200;

const reqWindow = [];
const aiWindow = [];
const waWindow = [];

const providerState = {
    openai: { failures: 0, lastErrorAt: null, lastSuccessAt: null },
    gemini: { failures: 0, lastErrorAt: null, lastSuccessAt: null },
    deepseek: { failures: 0, lastErrorAt: null, lastSuccessAt: null }
};

const pushBounded = (arr, item) => {
    arr.push(item);
    if (arr.length > WINDOW_SIZE) arr.shift();
};

const avg = (list) => {
    if (!list.length) return 0;
    return Math.round(list.reduce((acc, n) => acc + n, 0) / list.length);
};

const percentile = (list, p) => {
    if (!list.length) return 0;
    const sorted = [...list].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[idx];
};

const createRequestMetricsMiddleware = () => (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
        const endedAt = process.hrtime.bigint();
        const latencyMs = Number(endedAt - startedAt) / 1e6;
        pushBounded(reqWindow, {
            path: req.path,
            status: res.statusCode,
            latencyMs,
            ts: Date.now()
        });
    });
    next();
};

const recordAiCall = ({ provider, latencyMs, ok }) => {
    const p = String(provider || 'unknown').toLowerCase();
    pushBounded(aiWindow, { provider: p, latencyMs, ok: !!ok, ts: Date.now() });
    if (!providerState[p]) return;
    if (ok) {
        providerState[p].lastSuccessAt = new Date().toISOString();
        providerState[p].failures = 0;
        return;
    }
    providerState[p].failures += 1;
    providerState[p].lastErrorAt = new Date().toISOString();
};

const recordWhatsappMessage = ({ latencyMs, ok }) => {
    pushBounded(waWindow, { latencyMs, ok: !!ok, ts: Date.now() });
};

const getHealthSnapshot = () => {
    const requestLatencies = reqWindow.map((x) => x.latencyMs);
    const request5xx = reqWindow.filter((x) => x.status >= 500).length;

    const aiLatencies = aiWindow.filter((x) => x.ok).map((x) => x.latencyMs);
    const aiFailures = aiWindow.filter((x) => !x.ok).length;

    const waLatencies = waWindow.filter((x) => x.ok).map((x) => x.latencyMs);
    const waFailures = waWindow.filter((x) => !x.ok).length;

    return {
        window: {
            requests: reqWindow.length,
            ai_calls: aiWindow.length,
            whatsapp_messages: waWindow.length
        },
        http: {
            error_5xx_count: request5xx,
            latency_avg_ms: avg(requestLatencies),
            latency_p95_ms: percentile(requestLatencies, 95)
        },
        ai: {
            failures: aiFailures,
            latency_avg_ms: avg(aiLatencies),
            latency_p95_ms: percentile(aiLatencies, 95),
            providers: providerState
        },
        whatsapp: {
            failures: waFailures,
            latency_avg_ms: avg(waLatencies),
            latency_p95_ms: percentile(waLatencies, 95)
        },
        generated_at: new Date().toISOString()
    };
};

module.exports = {
    createRequestMetricsMiddleware,
    recordAiCall,
    recordWhatsappMessage,
    getHealthSnapshot
};
