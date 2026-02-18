import { Tabs, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function TabLayout() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        router.replace("/login");
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // ⛔ Prevent tabs from rendering until auth check completes
  if (checkingAuth) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1E1E4B",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 0 : 45,
          left: 16,
          right: 16,
          backgroundColor: "#fff",
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
