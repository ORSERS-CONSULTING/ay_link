import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { LayoutDashboard } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1E1E4B",
        tabBarInactiveTintColor: "#9CA3AF", // gray-400
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 0 : 45,
          left: 16,
          right: 16,
          backgroundColor: "#fff",
          borderBottomLeftRadius: 0, // Rounded bottom
          borderBottomRightRadius: 0,
          borderTopLeftRadius: 0, // Flat top
          borderTopRightRadius: 0,
          height: 70,
          elevation: 1,
          borderTopColor: "#E5E7EB",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
