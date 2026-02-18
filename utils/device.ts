// src/utils/auth/device.ts

import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_KEY = "device_id";

export async function getDeviceId(): Promise<string> {
  const saved = await SecureStore.getItemAsync(DEVICE_KEY);
  if (saved) return saved;

  let id = "unknown";

  if (Platform.OS === "android") {
    id = (await Application.getAndroidId()) ?? "android-unknown";
  } else if (Platform.OS === "ios") {
    id = (await Application.getIosIdForVendorAsync()) ?? "ios-unknown";
  }

  await SecureStore.setItemAsync(DEVICE_KEY, id, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return id;
}
