import { createBrowserClient } from "@supabase/ssr";

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }

  // Phone / tunnel previews hit this origin, not 127.0.0.1. Keep using the
  // configured URL on the server and on localhost; only rewrite in the
  // browser when a reverse proxy is serving Next and local Supabase together.
  if (typeof window !== "undefined") {
    const configuredHost = new URL(value).hostname;
    const pageHost = window.location.hostname;
    const isLoopback = (host: string) =>
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    if (isLoopback(configuredHost) && !isLoopback(pageHost)) {
      return window.location.origin;
    }
  }

  return value;
}

export function supabaseAnonKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required",
    );
  }
  return value;
}

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
