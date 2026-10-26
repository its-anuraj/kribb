import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ImageViewing from "react-native-image-viewing";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useSavedProperty } from "../../../../hooks/useSavedProperty";
import { useSupabase } from "../../../../hooks/useSupabase";
import { supabase } from "../../../../lib/supabase";
import { formatPrice } from "../../../../lib/utils";
import { useUserStore } from "../../../../store/userStore";
import { Property } from "../../../../Types";

import { useRef } from "react";

export default function PropertyDetails() {
  const { width } = Dimensions.get("window");
  const ADMIN_PHONE = "916397193704";

  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = Array.isArray(id) ? id[0] : id;
  const { userId } = useAuth();
  const router = useRouter();
  const isAdmin = useUserStore((state) => state.isAdmin);

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  const { isSaved, saveLoading, toggleSave } = useSavedProperty(
    propertyId ?? "",
    property ?? undefined,
  );
  const authSupabase = useSupabase();
  const requestIdRef = useRef(0);

  const fetchProperty = useCallback(async () => {
    if (!propertyId) {
      setProperty(null);
      setError("Property ID is missing.");
      setLoading(false);
      return;
    }

    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .maybeSingle();

      if (currentReqId !== requestIdRef.current) return;

      if (queryError) {
        setError(queryError.message || "Failed to load property details.");
        setProperty(null);
      } else if (!data) {
        // Genuine not found
        setProperty(null);
        setError(null);
      } else {
        setProperty(data);
        setError(null);
      }
    } catch (err: any) {
      if (currentReqId !== requestIdRef.current) return;
      console.error("fetchProperty error:", err);
      setError(err?.message || "Network error while loading property details.");
      setProperty(null);
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);


  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-gray-900 font-bold text-lg mt-4 mb-2 text-center">
            Unable to load property
          </Text>
          <Text className="text-gray-500 text-sm text-center mb-6">
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchProperty}
            className="bg-blue-600 px-6 py-3 rounded-2xl flex-row items-center gap-2"
          >
            <Ionicons name="refresh" size={18} color="white" />
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4 pt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="home-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-900 font-bold text-lg mt-4 mb-2 text-center">
            Property Not Found
          </Text>
          <Text className="text-gray-500 text-sm text-center mb-6">
            The property you are looking for does not exist or has been removed.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-blue-600 px-6 py-3 rounded-2xl"
          >
            <Text className="text-white font-semibold text-sm">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    property.longitude - 0.003
  }%2C${property.latitude - 0.003}%2C${property.longitude + 0.003}%2C${
    property.latitude + 0.003
  }&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`;

  const isLongDesc = (property.description?.length ?? 0) > 150;
  const displayDesc =
    expanded || !isLongDesc
      ? property.description
      : property.description?.slice(0, 150) + "...";

  const handleContact = () => {
    const message = `Hi! I'm interested in the property: ${property?.title}`;
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(
      message,
    )}`;
    Linking.openURL(url);
  };

  const handleDelete = () => {
    Alert.alert("Delete Property", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!propertyId) return;
          await authSupabase.from("properties").delete().eq("id", propertyId);
          router.replace("/(roots)/(tabs)");
        },
      },
    ]);
  };

  const handleMarkSold = () => {
    Alert.alert("Mark as Sold", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Sold",
        onPress: async () => {
          if (!propertyId) return;
          await authSupabase
            .from("properties")
            .update({ is_sold: true })
            .eq("id", propertyId);
          setProperty((prev) => (prev ? { ...prev, is_sold: true } : prev));
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <View style={{ opacity: property.is_sold ? 0.5 : 1 }}>
            <FlatList
              data={property.images ?? []}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setImageViewerVisible(true)}>
                  <Image
                    source={{ uri: item }}
                    style={{ width, height: 300 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            />
          </View>

          <View className="absolute bottom-3 right-4 bg-black/50 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-medium">
              {activeIndex + 1}/{(property.images ?? []).length || 1}
            </Text>
          </View>


          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-4 pt-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-white rounded-full items-center justify-center"
                style={{ elevation: 3 }}
              >
                <Ionicons name="arrow-back" size={20} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleSave}
                disabled={saveLoading}
                className="w-10 h-10 bg-white rounded-full items-center justify-center"
                style={{ elevation: 3 }}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons
                    name={isSaved ? "heart" : "heart-outline"}
                    size={20}
                    color={isSaved ? "#EF4444" : "#111827"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View
          className="px-5 pt-5 pb-8"
          style={{ opacity: property.is_sold ? 0.6 : 1 }}
        >
          {/* Badges */}
          <View className="flex-row gap-2 mb-3 flex-wrap">
            <View className="bg-blue-50 px-3 py-1 rounded-full">
              <Text className="text-blue-600 text-xs font-semibold capitalize">
                {property.type}
              </Text>
            </View>
            {property.is_featured && (
              <View className="bg-amber-50 px-3 py-1 rounded-full">
                <Text className="text-amber-600 text-xs font-semibold">
                  ⭐ Featured
                </Text>
              </View>
            )}
            {property.is_sold && (
              <View className="bg-red-50 px-3 py-1 rounded-full">
                <Text className="text-red-500 text-xs font-semibold">Sold</Text>
              </View>
            )}
          </View>

          <Text className="text-2xl font-bold text-gray-900 mb-1">
            {property.title}
          </Text>
          <Text className="text-blue-600 text-xl font-bold mb-4">
            {formatPrice(property.price)}
          </Text>

          <View className="flex-row justify-between bg-gray-50 rounded-2xl p-4 mb-5">
            <SpecItem
              icon="bed-outline"
              label="Beds"
              value={`${property.bedrooms}`}
            />
            <SpecItem
              icon="water-outline"
              label="Baths"
              value={`${property.bathrooms}`}
            />
            <SpecItem
              icon="expand-outline"
              label="Area"
              value={`${property.area_sqft} ft²`}
            />
            <SpecItem icon="home-outline" label="Type" value={property.type} />
          </View>
          <Text className="text-base font-bold text-gray-900 mb-2">
            Description
          </Text>
          <Text className="text-gray-500 text-sm leading-6 mb-1">
            {displayDesc}
          </Text>
          {isLongDesc && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text className="text-blue-600 text-sm font-medium mb-5">
                {expanded ? "Show less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}

          <View className="mb-5" />

          {/* Location */}
          <Text className="text-base font-bold text-gray-900 mb-2">
            Location
          </Text>
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm flex-1">
              {property.address}, {property.city}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/(roots)/property/map",
                params: {
                  latitude: property.latitude,
                  longitude: property.longitude,
                  title: property.title,
                  address: `${property.address}, ${property.city}`,
                },
              })
            }
            activeOpacity={0.9}
            className="rounded-2xl overflow-hidden mb-6"
            style={{ height: 200 }}
          >
            <WebView
              source={{ uri: mapUrl }}
              style={{ flex: 1 }}
              scrollEnabled={false}
              pointerEvents="none"
            />
            <View className="absolute bottom-3 right-3 bg-white/90 px-3 py-1 rounded-full flex-row items-center gap-1">
              <Ionicons name="expand-outline" size={12} color="#374151" />
              <Text className="text-gray-600 text-xs font-medium">
                Tap to expand
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleContact}
            className="flex-row items-center justify-center gap-2 bg-blue-600 py-4 rounded-2xl mb-4"
          >
            <Ionicons name="logo-whatsapp" size={20} color="white" />
            <Text className="text-white font-bold text-base">
              Contact Agent
            </Text>
          </TouchableOpacity>

          {isAdmin && (
            <View className="flex-row gap-3">
              {!property.is_sold && (
                <TouchableOpacity
                  onPress={handleMarkSold}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-amber-50 py-4 rounded-2xl border border-amber-200"
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#D97706"
                  />
                  <Text className="text-amber-600 font-semibold">
                    Mark Sold
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleDelete}
                className="flex-1 flex-row items-center justify-center gap-2 bg-red-50 py-4 rounded-2xl border border-red-100"
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text className="text-red-500 font-semibold">Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <ImageViewing
        images={(property.images ?? []).map((uri) => ({ uri }))}
        imageIndex={activeIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />
    </View>
  );
}

function SpecItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="items-center gap-1">
      <Ionicons name={icon} size={20} color="#2563EB" />
      <Text className="text-gray-900 font-bold text-sm">{value}</Text>
      <Text className="text-gray-400 text-xs">{label}</Text>
    </View>
  );
}
