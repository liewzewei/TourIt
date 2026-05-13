import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";

function normalizeHeaderValue(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

function getHostname(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end !== -1) {
      return trimmed.slice(1, end);
    }
  }
  return trimmed.split(":")[0];
}

function isLocalHost(host: string): boolean {
  const hostname = getHostname(host);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  );
}

function removeTrailingSlash(origin: string): string {
  return origin.replace(/\/$/, "");
}

function getOrigin(request: Request): string {
  const host =
    normalizeHeaderValue(request.headers.get("x-forwarded-host")) ??
    normalizeHeaderValue(request.headers.get("host"));
  const proto = normalizeHeaderValue(request.headers.get("x-forwarded-proto"));
  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (host && !isLocalHost(host)) {
    return `${proto ?? "https"}://${host}`;
  }

  if (envOrigin) {
    return removeTrailingSlash(envOrigin);
  }

  if (host) {
    return `${proto ?? "http"}://${host}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getOrigin(request);

  // Extract auth code and optional redirect path
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();

    // Exchange the auth code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the intended path or fallback to homepage
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to error page if code is missing or exchange fails
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
