// functions/api/login.js — POST { password } → set signed session cookie.

import { makeSessionCookie, COOKIE } from "../_middleware.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  let password = "";
  try {
    const form = await request.formData();
    password = String(form.get("password") || "");
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  if (password !== env.PHOTOS_PASSWORD) {
    // small constant-ish delay to slow brute force
    await new Promise(r => setTimeout(r, 400));
    return Response.json({ ok: false }, { status: 401 });
  }

  const value = await makeSessionCookie(env.PHOTOS_PASSWORD);
  return Response.json({ ok: true }, {
    headers: {
      "Set-Cookie": `${COOKIE}=${value}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
