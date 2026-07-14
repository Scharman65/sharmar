import http from "node:http";

export async function startMockDodoServer(options = {}) {
  const state = {
    mode: "success",
    expectedAuthorization: options.expectedAuthorization || "Bearer test_dodo_key",
    delayMs: 0,
    calls: 0,
    payloads: [],
    headers: [],
  };

  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/__state") {
      return sendJson(res, 200, {
        calls: state.calls,
        payloads: state.payloads,
        headers: state.headers,
        mode: state.mode,
      });
    }

    if (req.method === "POST" && req.url === "/__mode") {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}");
      state.mode = String(body.mode || "success");
      state.delayMs = Number(body.delayMs || 0);
      return sendJson(res, 200, { ok: true, mode: state.mode, delayMs: state.delayMs });
    }

    if (req.method !== "POST" || req.url !== "/checkouts") {
      return sendJson(res, 404, { error: "not_found" });
    }

    state.calls += 1;
    state.headers.push(req.headers);

    if (req.headers.authorization !== state.expectedAuthorization) {
      return sendJson(res, 401, { error: "bad_authorization" });
    }

    const contentType = String(req.headers["content-type"] || "");
    if (!contentType.toLowerCase().includes("application/json")) {
      return sendJson(res, 415, { error: "bad_content_type" });
    }

    const raw = await readBody(req);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return sendJson(res, 400, { error: "invalid_json" });
    }

    state.payloads.push(payload);

    if (state.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, state.delayMs));
    }

    if (state.mode === "400") return sendJson(res, 400, { error: "bad_request" });
    if (state.mode === "401") return sendJson(res, 401, { error: "unauthorized" });
    if (state.mode === "500") return sendJson(res, 500, { error: "server_error" });
    if (state.mode === "malformed") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{");
      return;
    }
    if (state.mode === "missing_checkout_url") {
      return sendJson(res, 200, { payment_id: `pay_mock_${state.calls}`, session_id: `sess_mock_${state.calls}` });
    }

    const id = `pay_mock_${state.calls}`;
    return sendJson(res, 200, {
      payment_id: id,
      session_id: `sess_mock_${state.calls}`,
      checkout_url: `http://127.0.0.1:${server.address().port}/fake-checkout/${id}`,
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    state,
    async setMode(mode, delayMs = 0) {
      state.mode = mode;
      state.delayMs = delayMs;
    },
    async stop() {
      await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    },
  };
}

export function installOutboundNetworkGate(log = []) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const host = url.hostname.toLowerCase();
    log.push(url.toString());
    const blocked = [
      "dodopayments.com",
      "test.dodopayments.com",
      "live.dodopayments.com",
      "stripe.com",
      "api.stripe.com",
      "sharmar.me",
      "api.sharmar.me",
    ];
    if (
      blocked.some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
      !(host === "127.0.0.1" || host === "localhost" || host.startsWith("172.") || host.startsWith("10."))
    ) {
      throw new Error(`OUTBOUND_NETWORK_BLOCKED ${url.toString()}`);
    }
    return originalFetch(input, init);
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
