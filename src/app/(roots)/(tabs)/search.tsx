import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FilterModal from "../../../../components/FilterModal";
import PropertyCard from "../../../../components/PropertyCard";
import { supabase } from "../../../../lib/supabase";
import { formatPrice } from "../../../../lib/utils";
import { useFilterStore } from "../../../../store/filterStore";
import { Property } from "../../../../Types";

export default function searchScreen() {

  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const requestIdRef = useRef(0);

  const { openFilters } = useLocalSearchParams<{
    openFilters?: string;
  }>();

  useEffect(() => {
    if (openFilters === "true") {
      setShowFilters(true);
    }
  }, [openFilters]);

  const {
    search,
    type,
    bedrooms,
    minPrice,
    maxPrice,
    setSearch,
    setType,
    setBedrooms,
    setMinPrice,
    setMaxPrice,
  } = useFilterStore();

  const activeFilterCount = [
    type !== null,
    bedrooms !== null,
    minPrice !== null,
    maxPrice !== null,
  ].filter(Boolean).length;

  const fetchResults = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from("properties").select("*");

      const trimmedSearch = search ? search.trim() : "";
      if (trimmedSearch) {
        query = query.or(
          `title.ilike.%${trimmedSearch}%,city.ilike.%${trimmedSearch}%`,
        );
      }

      if (type) {
        query = query.eq("type", type);
      }

      if (bedrooms) {
        query = query.eq("bedrooms", bedrooms);
      }

      if (minPrice) {
        query = query.gte("price", minPrice);
      }

      if (maxPrice) {
        query = query.lte("price", maxPrice);
      }

      const { data, error: qErr } = await query.order("created_at", {
        ascending: false,
      });

      if (currentReqId !== requestIdRef.current) return;

      if (qErr) {
        console.error("Search query error:", qErr);
        setError(qErr.message || "Failed to search properties.");
      } else {
        setResults(data ?? []);
        setError(null);
      }
    } catch (err: any) {
      if (currentReqId !== requestIdRef.current) return;
      console.error("Search exception:", err);
      setError(err?.message || "Network error while searching properties.");
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [search, type, bedrooms, minPrice, maxPrice]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);


  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Find Property
        </Text>

        <View className="flex-row items-center gap-3">
          <View
            className="flex-1 flex-row items-center bg-white rounded-2xl px-4 gap-3"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />

            <TextInput
              className="flex-1 py-3 text-gray-800"
              placeholder="Search by title or city..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />

            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            className={`w-12 h-12 rounded-2xl items-center justify-center ${
              activeFilterCount > 0 ? "bg-blue-600" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={activeFilterCount > 0 ? "#fff" : "#374151"}
            />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-[9px] font-bold">
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* {Filter chips} */}
        {activeFilterCount > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {type && (
              <View className="flex-row items-center bg-blue-50 border border-blue-200 rounded-full px-3 py-1 gap-1">
                <Text className="text-blue-700 text-xs font-semibold capitalize">
                  {type}
                </Text>
                <TouchableOpacity onPress={() => setType(null)}>
                  <Ionicons name="close" size={12} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            )}

            {bedrooms !== null && (
              <View className="flex-row items-center bg-blue-50 border border-blue-200 rounded-full px-3 py-1 gap-1">
                <Ionicons name="bed-outline" size={11} color="#1D4ED8" />
                <Text className="text-blue-700 text-xs font-semibold capitalize">
                  {bedrooms === 4
                    ? "4+ beds"
                    : `${bedrooms} bed${bedrooms > 1 ? "s" : ""}`}
                </Text>
                <TouchableOpacity onPress={() => setBedrooms(null)}>
                  <Ionicons name="close" size={12} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            )}

            {(minPrice !== null || maxPrice !== null) && (
              <View className="flex-row items-center bg-blue-50 border border-blue-200 rounded-full px-3 py-1 gap-1">
                <Text className="text-blue-700 text-xs font-semibold">
                  {minPrice && maxPrice
                    ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
                    : minPrice
                      ? `From ${formatPrice(minPrice)}`
                      : `Up to ${formatPrice(maxPrice!)}`}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMinPrice(null);
                    setMaxPrice(null);
                  }}
                >
                  <Ionicons name="close" size={12} color="#1D4ED8" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
      {/* {Results} */}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PropertyCard property={item} />}
        ListHeaderComponent={
          <Text className="text-sm text-gray-400 mb-4">
            {loading ? "Searching..." : `${results.length} properties found`}
          </Text>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#2563EB" className="py-20" />
          ) : error ? (
            <View className="items-center py-20 px-6">
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text className="text-gray-900 font-bold text-base mt-4 mb-2 text-center">
                Search Failed
              </Text>
              <Text className="text-gray-500 text-sm text-center mb-6">
                {error}
              </Text>
              <TouchableOpacity
                onPress={fetchResults}
                className="bg-blue-600 px-6 py-2.5 rounded-xl flex-row items-center gap-2"
              >
                <Ionicons name="refresh" size={16} color="white" />
                <Text className="text-white font-semibold text-sm">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-20">
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 text-base">
                No properties found
              </Text>
              <Text className="text-gray-300 text-sm mt-1">
                Try a different search or adjust filters
              </Text>
            </View>
          )
        }

      />

      {/* {Filter Modal} */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </SafeAreaView>
  );
}
