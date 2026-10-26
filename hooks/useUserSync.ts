import { useUser } from "@clerk/expo";
import { useEffect } from "react";
import { isJwtExpiredError, refreshClerkToken } from "../lib/supabase";
import { useUserStore } from "../store/userStore";
import { useSupabase } from "./useSupabase";

export const useUserSync = () => {
  const { user } = useUser();
  const setIsAdmin = useUserStore((state) => state.setIsAdmin);
  const authSupabase = useSupabase();

  useEffect(() => {
    if (!user) return;
    syncUser();
  }, [user]);

  const syncUser = async () => {
    try {
      let { data, error } = await authSupabase
        .from("users")
        .select("clerk_id,is_admin")
        .eq("clerk_id", user!.id)
        .single();

      if (error && isJwtExpiredError(error)) {
        console.warn("JWT expired in syncUser. Refreshing token and retrying...");
        await refreshClerkToken();
        const retry = await authSupabase
          .from("users")
          .select("clerk_id,is_admin")
          .eq("clerk_id", user!.id)
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (data) {
        setIsAdmin(data.is_admin ?? false);
        return;
      }

      let { data: newUser, error: insertError } = await authSupabase
        .from("users")
        .insert({
          clerk_id: user!.id,
          email: user!.emailAddresses[0]?.emailAddress ?? "",
          first_name: user!.firstName ?? "",
          last_name: user!.lastName ?? "",
          avatar_url: user!.imageUrl ?? "",
        })
        .select("is_admin")
        .single();

      if (insertError && isJwtExpiredError(insertError)) {
        await refreshClerkToken();
        const retryInsert = await authSupabase
          .from("users")
          .insert({
            clerk_id: user!.id,
            email: user!.emailAddresses[0]?.emailAddress ?? "",
            first_name: user!.firstName ?? "",
            last_name: user!.lastName ?? "",
            avatar_url: user!.imageUrl ?? "",
          })
          .select("is_admin")
          .single();
        newUser = retryInsert.data;
      }

      setIsAdmin(newUser?.is_admin ?? false);
    } catch (err) {
      console.error("syncUser exception:", err);
    }
  };
};