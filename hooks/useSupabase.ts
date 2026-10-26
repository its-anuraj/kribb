import { useAuth } from "@clerk/expo";
import { useMemo } from "react";
import { getClerkSupabaseClient, TokenGetter } from "../lib/supabase";

export function useSupabase() {
  const { getToken } = useAuth();

  const tokenGetter: TokenGetter = (options) => getToken(options);

  // Always keep current token getter attached, while keeping the client reference 100% stable
  const client = useMemo(() => getClerkSupabaseClient(tokenGetter), []);
  getClerkSupabaseClient(tokenGetter);

  return client;
}
