import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PropertyCard from "../../../../components/PropertyCard";
import { useSupabase } from "../../../../hooks/useSupabase";
import { useSavedStore } from "../../../../store/savedStore";

import { RefreshControl } from "react-native";

export default function SavedScreen() {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const authSupabase = useSupabase();
  const router = useRouter();

  const savedItems = useSavedStore((state) => state.savedItems);
  const isFetching = useSavedStore((state) => state.isFetching);
  const hasInitialized = useSavedStore((state) => state.hasInitialized);
  const authError = useSavedStore((state) => state.authError);

  // Refresh when the tab comes into focus and auth is ready
  useFocusEffect(
    useCallback(() => {
      if (isLoaded && isSignedIn && userId) {
        useSavedStore.getState().fetchSavedProperties(authSupabase, userId);
      }
    }, [isLoaded, isSignedIn, userId, authSupabase]),
  );

  const showLoading = !hasInitialized && isFetching;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Saved</Text>
        {!showLoading && (
          <Text className="text-sm text-gray-400 mt-1">
            {savedItems.length}{" "}
            {savedItems.length === 1 ? "property" : "properties"} saved
          </Text>
        )}
      </View>

      {showLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={savedItems}
          keyExtractor={(item) => item.property_id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && hasInitialized}
              onRefresh={() => {
                if (userId) {
                  useSavedStore
                    .getState()
                    .fetchSavedProperties(authSupabase, userId, true);
                }
              }}
              colors={["#2563EB"]}
              tintColor="#2563EB"
            />
          }
          renderItem={({ item }) => (
            <PropertyCard property={item.properties} showSave />
          )}
          ListEmptyComponent={
            authError ? (
              <View className="flex-1 items-center justify-center py-20 px-6">
                <View className="w-20 h-20 bg-amber-50 rounded-full items-center justify-center mb-4">
                  <Ionicons
                    name="alert-circle-outline"
                    size={36}
                    color="#D97706"
                  />
                </View>
                <Text className="text-gray-900 text-lg font-bold mb-1 text-center">
                  Authentication Issue
                </Text>
                <Text className="text-gray-500 text-sm text-center px-4 mb-6">
                  {authError}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (userId) {
                      useSavedStore
                        .getState()
                        .fetchSavedProperties(authSupabase, userId, true);
                    }
                  }}
                  className="bg-blue-600 px-6 py-3 rounded-2xl flex-row items-center gap-2"
                >
                  <Ionicons name="refresh" size={16} color="white" />
                  <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center py-24">
                <View className="w-20 h-20 bg-red-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="heart-outline" size={36} color="#EF4444" />
                </View>
                <Text className="text-gray-700 text-lg font-bold mb-1">
                  No saved properties
                </Text>
                <Text className="text-gray-400 text-sm text-center px-8">
                  Tap the heart icon on any property to save it here
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(roots)/(tabs)/search")}
                  className="mt-6 bg-blue-600 px-6 py-3 rounded-2xl"
                >
                  <Text className="text-white font-semibold">
                    Browse Properties
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

