// functions/_middleware.js — password gate for the whole site.
//
// Every request (except /login + its API) must carry a signed cookie.
// The cookie value is "<expiry>.<HMAC-SHA256(expiry, PHOTOS_PASSWORD)>"
// so it can't be forged or extended without the password.

const COOKIE = "photos_auth";
const SESSION_DAYS = 30;

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSessionCookie(password) {
  const expiry = Date.now() + SESSION_DAYS * 86400_000;
  return `${expiry}.${await hmac(password, String(expiry))}`;
}

async function validSession(cookieHeader, password) {
  const m = /(?:^|;\s*)photos_auth=([0-9]+)\.([0-9a-f]{64})/.exec(cookieHeader || "");
  if (!m) return false;
  const [, expiry, sig] = m;
  if (Number(expiry) < Date.now()) return false;
  // timingSafeEqual isn't in workers; HMAC recompute + compare is fine here
  return (await hmac(password, expiry)) === sig;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!env.PHOTOS_PASSWORD) {
    return new Response("PHOTOS_PASSWORD secret is not set on this Pages project.", { status: 503 });
  }

  if (url.pathname === "/login" || url.pathname === "/api/login") return next();

  if (await validSession(request.headers.get("Cookie"), env.PHOTOS_PASSWORD)) return next();

  return new Response(null, {
    status: 302,
    headers: { Location: "/login?next=" + encodeURIComponent(url.pathname) },
  });
}

export { COOKIE };
