import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";

import { useColorScheme } from "@/hooks/useColorScheme";
import {
  NotificationProvider,
  useNotification,
} from "@/context/NotificationContext";
import { ChartDataProvider } from "@/context/ChartDataContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldShowAlert: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { expoPushToken, notification } = useNotification();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (!expoPushToken) return;

    const registerToken = async () => {
      const url = `https://yawrhzry16j0fw1-adtgsw3okapc1zpw.adb.me-dubai-1.oraclecloudapps.com/ords/aly_sandbox/credit_notify_api/register/?expo_token=${encodeURIComponent(
        expoPushToken
      )}`;
      try {
        const response = await fetch(url, { method: "POST" });
        if (response.ok) {
          console.log("✅ Token registered successfully with Oracle");
        } else if ([409, 500, 555].includes(response.status)) {
          console.log("⚠️ Token already exists (duplicate)");
        } else {
          console.log("❌ Failed to register token:", response.status);
        }
      } catch (error) {
        console.error("❌ Registration error:", error);
      }
    };

    registerToken();
  }, [expoPushToken]);

  useEffect(() => {
    if (notification) {
      const { title, body } = notification.request.content;
      Alert.alert(title ?? "Notification", body ?? "New notification received");
    }
  }, [notification]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <NotificationProvider>
      <ChartDataProvider>
        <RootLayoutContent />
      </ChartDataProvider>
    </NotificationProvider>
  );
}
