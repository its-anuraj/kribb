import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Property } from "../Types";
import { useSavedProperty } from "../hooks/useSavedProperty";
import { formatPrice } from "../lib/utils";

export default function FeaturedCard({ property }: { property: Property }) {
  const router = useRouter();
  const { isSaved, saveLoading, toggleSave } = useSavedProperty(
    property?.id ?? "",
    property,
  );

  if (!property || !property.id) {
    return null;
  }

  const imageUri =
    property.images && property.images.length > 0
      ? property.images[0]
      : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6";

  return (
    <TouchableOpacity
      className="w-72 mr-2 rounded-3xl overflow-hidden bg-white"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        opacity: property.is_sold ? 0.5 : 1,
      }}
      onPress={() =>
        router.push({
          pathname: "/property/[id]",
          params: { id: String(property.id) },
        })
      }
    >
      <Image
        source={{ uri: imageUri }}
        className="w-full h-44"
        resizeMode="cover"
      />


      <View className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full">
        <Text className="text-xs font-semibold text-blue-600 capitalize">
          {property.type}
        </Text>
      </View>

      {/* {sold badge} */}
      {property.is_sold && (
        <View className="absolute top-3 right-3 bg-red-500 px-3 py-1 rounded-full">
          <Text className="text-xs font-semibold text-white">sold</Text>
        </View>
      )}

      {/* Heart Save Button */}
      <TouchableOpacity
        onPress={toggleSave}
        disabled={saveLoading}
        activeOpacity={0.8}
        className={`absolute top-3 ${property.is_sold ? "right-16" : "right-3"} w-8 h-8 bg-white/90 rounded-full items-center justify-center`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <Ionicons
          name={isSaved ? "heart" : "heart-outline"}
          size={18}
          color={isSaved ? "#ef4444" : "#374151"}
        />
      </TouchableOpacity>

      <View className="p-4">
        <Text
          className="text-base font-bold text-gray-800 mb-1"
          numberOfLines={1}
        >
          {property.title}
        </Text>

        <View className="flex-row items-center gap-1 mb-3">
          <Ionicons name="location-outline" size={13} color="#6B7280" />
          <Text className="text-xs text-gray-500" numberOfLines={1}>
            {property.address},{property.city}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-blue-600 font-bold text-base">
            {formatPrice(property.price)}
          </Text>

          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="bed-outline" size={13} color="#6B7280" />
              <Text className="text-xs text-gray-500">{property.bedrooms}</Text>
            </View>

            <View className="flex-row items-center gap-1">
              <Ionicons name="water-outline" size={13} color="#6B7280" />
              <Text className="text-xs text-gray-500">
                {property.bathrooms}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
