import { useAuth } from "@clerk/expo";
import { useCallback, useEffect } from "react";
import { Property } from "../Types";
import { useSavedStore } from "../store/savedStore";
import { useSupabase } from "./useSupabase";

export function useSavedProperty(
  propertyId: string,
  propertyObj?: Property,
  onUnsave?: () => void,
) {
  const { userId } = useAuth();
  const authSupabase = useSupabase();

  const isSaved = useSavedStore((state) =>
    propertyId ? !!state.savedIds[propertyId] : false,
  );
  const saveLoading = useSavedStore((state) =>
    propertyId ? !!state.loadingIds[propertyId] : false,
  );
  const toggleSaveProperty = useSavedStore((state) => state.toggleSaveProperty);

  const toggleSave = useCallback(async () => {
    if (!userId || !propertyId) return;
    await toggleSaveProperty(
      authSupabase,
      userId,
      propertyId,
      propertyObj,
      onUnsave,
    );
  }, [
    userId,
    authSupabase,
    propertyId,
    propertyObj,
    onUnsave,
    toggleSaveProperty,
  ]);

  return { isSaved, saveLoading, toggleSave };
}

