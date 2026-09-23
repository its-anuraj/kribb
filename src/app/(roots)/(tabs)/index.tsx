import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Property } from "../../../../Types";
import FeaturedCard from "../../../../components/FeaturedCard";
import PropertyCard from "../../../../components/PropertyCard";
import { supabase } from "../../../../lib/supabase";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();

  const [featured, setFeatured] = useState<Property[]>([]);
  const [recommended, setRecommended] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = async () => {
    setLoading(true);

    const { data: featuredData } = await supabase
      .from("properties")
      .select("*")
      .eq("is_featured", true)
      .order("created_at", { ascending: false });

    const { data: recommendedData } = await supabase
      .from("properties")
      .select("*")
      .eq("is_featured", false)
      .order("created_at", { ascending: false });

    setFeatured(featuredData ?? []);
    setRecommended(recommendedData ?? []);

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, []),
  );

  return (
    <SafeAreaView className="flex-1  bg-grey-100">
      <FlatList
        data={recommended}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View className="flex-row items-senter justify-between px-5 pt-4 pb-5">
              <Image
                source={require("../../../../assets/images/kribb.png")}
                style={{ width: 90, height: 36 }}
                resizeMode="contain"
              />

              <View className="items-end">
                <Text>Good Morning 👋</Text>
                <Text className="text-gray-900 text-base font-bold">
                  {user?.firstName ?? "user"}
                </Text>
              </View>
            </View>

            {/*Search Bar */}
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

            {/* {Featured Section} */}
            <View className="mb-6 ">
              <Text className="text-gray-900 text-lg font-bold px-5 mb-4  ">
                Featured
              </Text>

              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#2563EB"
                  className="py-10"
                />
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

            {/* {Recommended Header} */}
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
          !loading ? (
            <View className="items-center py-10">
              <Text className="text-gray-400">No Properties Found</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
