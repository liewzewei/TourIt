import createClient from "@/lib/supabase/server";

// Dev-only login endpoint. The app's real auth is Google OAuth, which can't be
// scripted in CI (nor configured on a local stack), so E2E tests and the local
// "quick login" buttons sign in a dedicated email/password user instead.
//
// Accepts an optional JSON body { email, password } to choose which account to
// sign in as; with no body it falls back to the E2E_TEST_* env vars.
//
// It lives under /auth so the proxy middleware lets the unauthenticated POST
// through (every /auth/* path is exempt from the auth redirects). Signing in via
// the SSR server client makes @supabase/ssr write the session cookies onto the
// response, which Playwright captures into storageState.
//
// Hard-guarded so it is inert on the deployed app. (The folder must not start
// with "_" — that would make it a private, non-routable folder.)
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  // Optional { email, password } body lets the dev quick-login buttons choose
  // which seeded account to use. No body (e.g. the E2E setup) -> env fallback.
  // Either path just calls signInWithPassword, so valid credentials are required.
  let body: { email?: string; password?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No / non-JSON body: fall back to the env credentials below.
  }

  const email = body.email ?? process.env.E2E_TEST_EMAIL;
  const password = body.password ?? process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    return Response.json(
      {
        error:
          "Provide { email, password } or set E2E_TEST_EMAIL / E2E_TEST_PASSWORD",
      },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
