
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TokenGetter = (options?: {
  skipCache?: boolean;
  template?: string;
}) => Promise<string | null>;

let clerkSupabaseClient: SupabaseClient | null = null;
let currentGetToken: TokenGetter | null = null;

/**
 * Safely decodes a JWT payload without full signature verification
 * to inspect token claims such as `exp`.
 */
export function decodeJwtPayload(
  token: string,
): { exp?: number; [key: string]: any } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binaryStr = atob(base64);
    const jsonStr = decodeURIComponent(
      binaryStr
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonStr);
  } catch {
    try {
      const parts = token.split(".");
      return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }
}


/**
 * Checks if a JWT token has expired or is within bufferSeconds of expiring.
 * Default buffer is 15 seconds to safely compensate for clock skew and network latency.
 */
export function isJwtExpired(token: string, bufferSeconds = 15): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds >= payload.exp - bufferSeconds;
}

/**
 * Checks whether an error returned by Supabase / PostgREST indicates an expired JWT.
 */
export function isJwtExpiredError(error: any): boolean {
  if (!error) return false;
  if (error.code === "PGRST303") return true;
  if (
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("jwt expired")
  ) {
    return true;
  }
  return false;
}

/**
 * Explicitly forces Clerk to refresh the session token bypassing cache.
 */
export async function refreshClerkToken(): Promise<string | null> {
  if (currentGetToken) {
    try {
      return await currentGetToken({ skipCache: true });
    } catch (err) {
      console.error("Error refreshing Clerk token for Supabase:", err);
      return null;
    }
  }
  return null;
}

export function getClerkSupabaseClient(getToken: TokenGetter): SupabaseClient {
  currentGetToken = getToken;
  if (!clerkSupabaseClient) {
    clerkSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      async accessToken() {
        if (!currentGetToken) return null;
        try {
          // 1. Get the current token
          let token = await currentGetToken();
          // 2. If token is expired or about to expire within 15s, proactively refresh
          if (token && isJwtExpired(token, 15)) {
            token = await currentGetToken({ skipCache: true });
          }
          return token;
        } catch (e) {
          console.error("Failed to get Clerk token for Supabase:", e);
          return null;
        }
      },
    });
  }
  return clerkSupabaseClient;
}

export function createClerkSupabseClient(
  getToken: TokenGetter,
): SupabaseClient {
  return getClerkSupabaseClient(getToken);
}



