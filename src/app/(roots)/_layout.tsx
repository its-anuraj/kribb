import { useAuth } from "@clerk/expo";
import { Redirect, Slot } from "expo-router";
import { useEffect } from "react";
import { useSupabase } from "../../../hooks/useSupabase";
import { useUserSync } from "../../../hooks/useUserSync";
import { useSavedStore } from "../../../store/savedStore";

export default function RootLayout() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const authSupabase = useSupabase();
  const fetchSavedProperties = useSavedStore(
    (state) => state.fetchSavedProperties,
  );
  const resetUser = useSavedStore((state) => state.resetUser);

  useUserSync();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId) {
      useSavedStore.getState().fetchSavedProperties(authSupabase, userId);
    } else if (!isSignedIn) {
      useSavedStore.getState().resetUser(null);
    }
  }, [isLoaded, isSignedIn, userId, authSupabase]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  return <Slot />;
}

