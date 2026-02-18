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
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SelectedRequestProvider } from "@/context/SelectedRequestContext"; // ✅ import it
import { ClientRequestProvider } from "@/context/ClientRequestContext";
import Constants from "expo-constants";

const token = Constants.expoConfig?.extra?.API_SECRET;
Notifications.setNotificationHandler({
  handleNotification:
    async (): Promise<Notifications.NotificationBehavior> => ({
      shouldPlaySound: true,
      shouldShowAlert: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
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

    const BASE_URL = "https://aylink.yalayis.ai/api";
    const registerToken = async () => {
      try {
        const response = await fetch(`${BASE_URL}/registerToken`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // If your backend requires auth:
            // Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            expo_token: expoPushToken,
          }),
        });

        if (response.ok) {
          console.log("✅ Token registered via backend");
        } else {
          console.log("❌ Backend failed:", response.status);
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
        <Stack.Screen
          name="request-detail-screen"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar style="dark" backgroundColor="#F5F5F5" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <ClientRequestProvider>
          <ChartDataProvider>
            <SelectedRequestProvider>
              <RootLayoutContent />
            </SelectedRequestProvider>
          </ChartDataProvider>
        </ClientRequestProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
