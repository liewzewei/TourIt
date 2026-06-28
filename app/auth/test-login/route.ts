import createClient from "@/lib/supabase/server";

// E2E-only login endpoint. The app's real auth is Google OAuth, which can't be
// scripted in CI, so tests sign in a dedicated email/password user instead.
//
// It lives under /auth so the proxy middleware lets the unauthenticated POST
// through (every /auth/* path is exempt from the auth redirects). Signing in via
// the SSR server client makes @supabase/ssr write the session cookies onto the
// response, which Playwright captures into storageState.
//
// Hard-guarded so it is inert on the deployed app. (The folder must not start
// with "_" — that would make it a private, non-routable folder.)
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    return Response.json(
      { error: "E2E_TEST_EMAIL / E2E_TEST_PASSWORD are not set" },
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
