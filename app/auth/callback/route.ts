import { NextResponse } from "next/server";
import createClient from "@/lib/supabase/server";

function getFirstHeaderValue(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

function extractHostname(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end !== -1) {
      return trimmed.slice(1, end);
    }
    return trimmed.slice(1);
  }
  return trimmed.split(":")[0];
}

function isLocalHost(host: string): boolean {
  const hostname = extractHostname(host);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  );
}

function getEnvProtocol(envOrigin?: string): string | undefined {
  if (!envOrigin) {
    return undefined;
  }
  try {
    return new URL(envOrigin).protocol.replace(":", "");
  } catch {
    return undefined;
  }
}

function getOrigin(request: Request): string {
  const host =
    getFirstHeaderValue(request.headers.get("x-forwarded-host")) ??
    getFirstHeaderValue(request.headers.get("host"));
  const proto = getFirstHeaderValue(request.headers.get("x-forwarded-proto"));
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const rawEnvOrigin =
    explicitSiteUrl ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const envOrigin = rawEnvOrigin
    ? rawEnvOrigin.includes("://")
      ? rawEnvOrigin
      : `https://${rawEnvOrigin}`
    : undefined;
  const envProtocol = getEnvProtocol(envOrigin);
  const resolvedProto =
    proto ?? envProtocol ?? (host && isLocalHost(host) ? "http" : "https");

  if (explicitSiteUrl && envOrigin) {
    return envOrigin.replace(/\/$/, "");
  }

  if (host && !isLocalHost(host)) {
    return `${resolvedProto}://${host}`;
  }

  if (envOrigin) {
    return envOrigin.replace(/\/$/, "");
  }

  if (host) {
    return `${resolvedProto}://${host}`;
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
