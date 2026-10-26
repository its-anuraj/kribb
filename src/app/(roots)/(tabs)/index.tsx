import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Property } from "../../../../Types";
import FeaturedCard from "../../../../components/FeaturedCard";
import PropertyCard from "../../../../components/PropertyCard";
import { useSupabase } from "../../../../hooks/useSupabase";
import { supabase } from "../../../../lib/supabase";
import { getTimeGreeting } from "../../../../lib/utils";
import { useSavedStore } from "../../../../store/savedStore";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { userId, isSignedIn, isLoaded } = useAuth();
  const authSupabase = useSupabase();


  const [featured, setFeatured] = useState<Property[]>([]);
  const [recommended, setRecommended] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>(() => getTimeGreeting());

  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const fetchProperties = useCallback(async (isRefresh = false) => {
    const currentReqId = ++requestIdRef.current;

    if (isRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const [featuredRes, recommendedRes] = await Promise.all([
        supabase
          .from("properties")
          .select("*")
          .eq("is_featured", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("properties")
          .select("*")
          .eq("is_featured", false)
          .order("created_at", { ascending: false }),
      ]);

      // Ignore stale responses
      if (currentReqId !== requestIdRef.current) {
        return;
      }

      if (featuredRes.error || recommendedRes.error) {
        const queryError = featuredRes.error || recommendedRes.error;
        console.error("fetchProperties query error:", queryError);
        setError(queryError?.message || "Failed to load properties.");
      } else {
        const newFeatured = featuredRes.data ?? [];
        const newRecommended = recommendedRes.data ?? [];

        setFeatured(newFeatured);
        setRecommended(newRecommended);
        hasLoadedRef.current = true;
        setHasInitialLoaded(true);
        setError(null);
      }
    } catch (err: any) {
      if (currentReqId !== requestIdRef.current) return;
      console.error("fetchProperties exception:", err);
      setError(err?.message || "Network error loading properties.");
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setGreeting(getTimeGreeting());
      if (!hasLoadedRef.current) {
        fetchProperties();
      }
      if (isLoaded && isSignedIn && userId) {
        useSavedStore.getState().fetchSavedProperties(authSupabase, userId);
      }
    }, [isLoaded, isSignedIn, userId, authSupabase, fetchProperties]),
  );


  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setGreeting(getTimeGreeting());
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-gray-100">
      <FlatList
        data={recommended}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProperties(true)}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-5">
              <Image
                source={require("../../../../assets/images/kribb.png")}
                style={{ width: 90, height: 36 }}
                resizeMode="contain"
              />

              <View className="items-end">
                <Text>{greeting}</Text>
                <Text className="text-gray-900 text-base font-bold">
                  {user?.firstName ?? "user"}
                </Text>
              </View>
            </View>

            {/* Search Bar */}
            <TouchableOpacity
              onPress={() => router.push("/(roots)/(tabs)/search")}
              className="mx-5 mb-6 flex-row items-center bg-white rounded-2xl px-4 py-3 gap-3"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <Text className="text-gray-400 text-sm flex-1">
                Search Properties,cities
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push("/(roots)/(tabs)/search?openFilters=true")
                }
                className="w-8 h-8 bg-blue-600 rounded-xl items-center justify-center"
              >
                <Ionicons name="options-outline" size={15} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Featured Section */}
            <View className="mb-6">
              <Text className="text-gray-900 text-lg font-bold px-5 mb-4">
                Featured
              </Text>

              {loading && !hasInitialLoaded ? (
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                  className="py-10"
                />
              ) : featured.length === 0 ? (
                <View className="px-5 py-2">
                  <Text className="text-gray-400 text-sm">
                    No featured properties available
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={featured}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <FeaturedCard property={item} />}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                />
              )}
            </View>

            {/* Recommended Header */}
            <Text className="text-gray-900 text-lg font-bold px-5 mb-4">
              Recommended
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-5">
            <PropertyCard property={item} />
          </View>
        )}
        ListEmptyComponent={
          loading && !hasInitialLoaded ? (
            <ActivityIndicator size="large" color="#2563EB" className="py-10" />
          ) : error && !hasInitialLoaded ? (
            <View className="items-center py-10 px-5">
              <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
              <Text className="text-gray-900 font-semibold text-base mt-2 mb-1">
                Unable to load properties
              </Text>
              <Text className="text-gray-500 text-xs text-center mb-4">
                {error}
              </Text>
              <TouchableOpacity
                onPress={() => fetchProperties()}
                className="bg-blue-600 px-5 py-2.5 rounded-xl flex-row items-center gap-2"
              >
                <Ionicons name="refresh" size={16} color="white" />
                <Text className="text-white font-semibold text-xs">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !loading ? (
            <View className="items-center py-10">
              <Text className="text-gray-400">No Properties Found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

