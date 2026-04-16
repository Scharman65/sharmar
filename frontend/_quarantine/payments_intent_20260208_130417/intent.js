function endJson(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body).toString(),
    ...(extraHeaders || {}),
  };
  res.writeHead(status, headers);
  res.end(body);
}

function endText(res, status, text, contentType, extraHeaders) {
  const body = String(text ?? "");
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body).toString(),
    ...(extraHeaders || {}),
  };
  res.writeHead(status, headers);
  res.end(body);
}

export default async function handler(req, res) {
  try {
    res.setHeader("X-Sharmar-Handler", "pages_api_payments_intent_node_v1");

    const method = String(req.method || "").toUpperCase();

    if (method === "OPTIONS") {
      res.writeHead(204, { "Cache-Control": "no-store" });
      res.end("");
      return;
    }

    if (method !== "POST") {
      res.setHeader("Allow", "POST, OPTIONS");
      endJson(res, 405, {
        error: "method_not_allowed",
        seenMethod: req.method || null,
        normalizedMethod: method,
        contentType: req.headers["content-type"] || null,
      });
      return;
    }

    const public_token = req.body && req.body.public_token;
    if (typeof public_token !== "string" || public_token.length < 8) {
      endJson(res, 400, { error: "invalid_public_token" });
      return;
    }

    const STRAPI_BASE =
      process.env.STRAPI_URL ||
      process.env.NEXT_PUBLIC_STRAPI_URL ||
      "http://localhost:1337";

    const upstream = await fetch(`${STRAPI_BASE}/api/payments/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ public_token }),
    });

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";

    endText(res, upstream.status, text, ct);
    return;
  } catch (e) {
    const detail = e && (e.stack || e.message) ? String(e.stack || e.message) : String(e);
    endJson(res, 502, { error: "payments_intent_proxy_failed", detail });
    return;
  }
}
