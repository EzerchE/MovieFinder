const TRAKT_TOKEN_URL = "https://auth.trakt.tv/oauth/token";

function splitList(value = "") {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function corsHeaders(origin, allowedOrigins) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "null",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = splitList(env.ALLOWED_ORIGINS);
    const allowedRedirectUris = splitList(env.TRAKT_REDIRECT_URIS);
    const cors = corsHeaders(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
      if (!allowedOrigins.includes(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "seyir-trakt-oauth" }, 200, cors);
    }
    if (request.method !== "POST" || !["/oauth/token", "/oauth/refresh"].includes(url.pathname)) {
      return json({ error: "not_found" }, 404, cors);
    }
    if (!allowedOrigins.includes(origin)) return json({ error: "origin_not_allowed" }, 403, cors);
    if (!env.TRAKT_CLIENT_ID || !env.TRAKT_CLIENT_SECRET) return json({ error: "worker_not_configured" }, 503, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400, cors);
    }
    if (!allowedRedirectUris.includes(body.redirect_uri)) return json({ error: "redirect_uri_not_allowed" }, 400, cors);

    const tokenBody = url.pathname === "/oauth/token"
      ? { code: body.code, grant_type: "authorization_code" }
      : { refresh_token: body.refresh_token, grant_type: "refresh_token" };
    if ((!tokenBody.code && url.pathname === "/oauth/token") || (!tokenBody.refresh_token && url.pathname === "/oauth/refresh")) {
      return json({ error: "missing_oauth_value" }, 400, cors);
    }

    const traktResponse = await fetch(TRAKT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...tokenBody,
        client_id: env.TRAKT_CLIENT_ID,
        client_secret: env.TRAKT_CLIENT_SECRET,
        redirect_uri: body.redirect_uri
      })
    });
    const payload = await traktResponse.json().catch(() => ({ error: "invalid_trakt_response" }));
    return json(payload, traktResponse.status, cors);
  }
};
