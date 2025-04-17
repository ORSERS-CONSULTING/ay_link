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

import { useColorScheme } from "@/hooks/useColorScheme";
import { usePushNotifications } from "../usePushNotifications"; // ✅ import your hook
import { Alert } from "react-native";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const { expoPushToken, notification } = usePushNotifications();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (!expoPushToken?.data) return;

    console.log("expoPushToken FULL:", expoPushToken);
    console.log("Expo Push Token:", expoPushToken.data);

    const registerToken = async () => {
      const url = `https://yawrhzry16j0fw1-adtgsw3okapc1zpw.adb.me-dubai-1.oraclecloudapps.com/ords/aly_sandbox/credit_notify_api/register/?expo_token=${encodeURIComponent(
        expoPushToken.data
      )}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          console.log("✅ Token registered successfully with Oracle");
        } else {
          console.log("❌ Failed to register token:", response.status);
        }
      } catch (error) {
        console.error("❌ Error while registering token:", error);
      }
    };

    registerToken();
  }, [expoPushToken]);

  useEffect(() => {
    if (notification) {
      const { title, body } = notification.request.content;
      Alert.alert(
        title ?? "Notification",
        body ?? "You received a notification!"
      );
    }
  }, [notification]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}