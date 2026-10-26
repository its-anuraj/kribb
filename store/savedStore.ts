import { SupabaseClient } from "@supabase/supabase-js";
import { Alert } from "react-native";
import { create } from "zustand";
import { isJwtExpiredError, refreshClerkToken } from "../lib/supabase";
import { Property } from "../Types";

export interface SavedPropertyItem {
  id: string;
  property_id: string;
  properties: Property;
}

interface SavedStoreState {
  savedIds: Record<string, boolean>;
  savedItems: SavedPropertyItem[];
  loadingIds: Record<string, boolean>;
  isFetching: boolean;
  hasInitialized: boolean;
  currentUserId: string | null;
  authError: string | null;

  setSavedData: (items: SavedPropertyItem[], userId: string) => void;
  setFetching: (fetching: boolean) => void;
  setLoadingId: (propertyId: string, loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  resetUser: (newUserId: string | null) => void;
  fetchSavedProperties: (
    authSupabase: SupabaseClient,
    userId: string,
    force?: boolean,
  ) => Promise<void>;
  toggleSaveProperty: (
    authSupabase: SupabaseClient,
    userId: string,
    propertyId: string,
    propertyObj?: Property,
    onUnsave?: () => void,
  ) => Promise<boolean>;
}

export const useSavedStore = create<SavedStoreState>((set, get) => ({
  savedIds: {},
  savedItems: [],
  loadingIds: {},
  isFetching: false,
  hasInitialized: false,
  currentUserId: null,
  authError: null,

  setSavedData: (items, userId) => {
    const ids: Record<string, boolean> = {};
    items.forEach((item) => {
      if (item.property_id) {
        ids[item.property_id] = true;
      }
    });
    set({
      savedItems: items,
      savedIds: ids,
      currentUserId: userId,
      hasInitialized: true,
      isFetching: false,
      authError: null,
    });
  },

  setFetching: (isFetching) => set({ isFetching }),

  setAuthError: (authError) => set({ authError }),

  setLoadingId: (propertyId, loading) => {
    set((state) => ({
      loadingIds: {
        ...state.loadingIds,
        [propertyId]: loading,
      },
    }));
  },

  resetUser: (newUserId) => {
    set({
      savedIds: {},
      savedItems: [],
      loadingIds: {},
      hasInitialized: false,
      isFetching: false,
      authError: null,
      currentUserId: newUserId,
    });
  },

  fetchSavedProperties: async (authSupabase, userId, force = false) => {
    if (!userId) return;

    const { currentUserId, hasInitialized, isFetching } = get();

    // Prevent duplicate concurrent fetches
    if (isFetching) return;

    // If user changed, reset store
    if (currentUserId !== userId) {
      get().resetUser(userId);
    } else if (hasInitialized && !force) {
      // Already initialized and not forced: do nothing
      return;
    }

    set({ isFetching: true });

    try {
      let { data, error } = await authSupabase
        .from("saved_properties")
        .select("id, property_id, properties(*)")
        .eq("user_clerk_id", userId)
        .order("id", { ascending: false });

      // Handle JWT expired error with 1 immediate token refresh and retry
      if (error && isJwtExpiredError(error)) {
        console.warn(
          "JWT expired while fetching saved properties. Refreshing token and retrying once...",
        );
        const refreshed = await refreshClerkToken();
        if (refreshed) {
          const retryRes = await authSupabase
            .from("saved_properties")
            .select("id, property_id, properties(*)")
            .eq("user_clerk_id", userId)
            .order("id", { ascending: false });
          data = retryRes.data;
          error = retryRes.error;
        }
      }

      if (error) {
        console.error("Error fetching saved properties:", error);
        // Do NOT clear existing savedItems on error! Preserve them!
        const errorMessage = isJwtExpiredError(error)
          ? "Session expired. Please retry or sign in again."
          : error.message || "Failed to load saved properties.";
        set({
          isFetching: false,
          hasInitialized: true,
          authError: errorMessage,
        });
        return;
      }

      // Deduplicate by property_id and filter out null properties
      const seen = new Set<string>();
      const deduplicated: SavedPropertyItem[] = [];

      for (const item of (data as unknown as SavedPropertyItem[]) || []) {
        if (
          item &&
          item.property_id &&
          item.properties &&
          !seen.has(item.property_id)
        ) {
          seen.add(item.property_id);
          deduplicated.push(item);
        }
      }

      get().setSavedData(deduplicated, userId);
    } catch (err: any) {
      console.error("fetchSavedProperties exception:", err);
      set({
        isFetching: false,
        hasInitialized: true,
        authError: err?.message || "Network error loading saved properties.",
      });
    }
  },


  toggleSaveProperty: async (
    authSupabase,
    userId,
    propertyId,
    propertyObj,
    onUnsave,
  ) => {
    if (!userId || !propertyId) return false;

    const { savedIds, savedItems, loadingIds, setLoadingId } = get();

    // Avoid duplicate concurrent taps on the same property
    if (loadingIds[propertyId]) return false;

    const isCurrentlySaved = !!savedIds[propertyId];
    const willSave = !isCurrentlySaved;

    // Optimistic state
    const previousSavedIds = { ...savedIds };
    const previousSavedItems = [...savedItems];

    setLoadingId(propertyId, true);

    if (willSave) {
      // Optimistically add
      const newSavedIds = { ...savedIds, [propertyId]: true };
      const newItem: SavedPropertyItem = {
        id: `optimistic_${Date.now()}`,
        property_id: propertyId,
        properties: propertyObj || ({} as Property),
      };
      set({
        savedIds: newSavedIds,
        savedItems: propertyObj ? [newItem, ...savedItems] : savedItems,
      });
    } else {
      // Optimistically remove
      const newSavedIds = { ...savedIds };
      delete newSavedIds[propertyId];
      const newItems = savedItems.filter(
        (item) => item.property_id !== propertyId,
      );
      set({
        savedIds: newSavedIds,
        savedItems: newItems,
      });
      onUnsave?.();
    }

    try {
      if (willSave) {
        // Check for existing record to avoid duplicate rows
        let { data: existing, error: existError } = await authSupabase
          .from("saved_properties")
          .select("id")
          .eq("user_clerk_id", userId)
          .eq("property_id", propertyId)
          .maybeSingle();

        if (existError && isJwtExpiredError(existError)) {
          console.warn("JWT expired during existing check. Refreshing token...");
          await refreshClerkToken();
          const retryCheck = await authSupabase
            .from("saved_properties")
            .select("id")
            .eq("user_clerk_id", userId)
            .eq("property_id", propertyId)
            .maybeSingle();
          existing = retryCheck.data;
          if (retryCheck.error) throw retryCheck.error;
        }

        if (!existing) {
          let { data, error } = await authSupabase
            .from("saved_properties")
            .insert({ user_clerk_id: userId, property_id: propertyId })
            .select("id, property_id, properties(*)")
            .single();

          if (error && isJwtExpiredError(error)) {
            console.warn("JWT expired during insert. Refreshing token and retrying...");
            await refreshClerkToken();
            const retryInsert = await authSupabase
              .from("saved_properties")
              .insert({ user_clerk_id: userId, property_id: propertyId })
              .select("id, property_id, properties(*)")
              .single();
            data = retryInsert.data;
            error = retryInsert.error;
          }

          if (error) throw error;

          if (data && data.properties) {
            // Replace optimistic item with actual database item
            const currentItems = get().savedItems.map((item) =>
              item.property_id === propertyId
                ? (data as unknown as SavedPropertyItem)
                : item,
            );
            // If it wasn't in savedItems, prepend it
            if (!currentItems.some((item) => item.property_id === propertyId)) {
              currentItems.unshift(data as unknown as SavedPropertyItem);
            }
            set({ savedItems: currentItems });
          }
        }
      } else {
        // Delete all matching records for this user and property
        let { error } = await authSupabase
          .from("saved_properties")
          .delete()
          .eq("user_clerk_id", userId)
          .eq("property_id", propertyId);

        if (error && isJwtExpiredError(error)) {
          console.warn("JWT expired during delete. Refreshing token and retrying...");
          await refreshClerkToken();
          const retryDelete = await authSupabase
            .from("saved_properties")
            .delete()
            .eq("user_clerk_id", userId)
            .eq("property_id", propertyId);
          error = retryDelete.error;
        }

        if (error) throw error;
      }

      setLoadingId(propertyId, false);
      return true;
    } catch (err: any) {
      console.error("Save/unsave error:", err);
      // Rollback to previous state
      set({
        savedIds: previousSavedIds,
        savedItems: previousSavedItems,
      });
      setLoadingId(propertyId, false);
      const isAuthErr = isJwtExpiredError(err);
      Alert.alert(
        isAuthErr ? "Session Expired" : "Action Failed",
        isAuthErr
          ? "Your session has expired. Please try again or re-authenticate."
          : "Could not update saved properties. Please check your connection and try again.",
      );
      return false;
    }
  },

}));
