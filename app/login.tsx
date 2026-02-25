import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUser } from "@/utils/api";
import { hasValidSession } from "@/utils/safeFetch";

// No longer importing MaterialCommunityIcons if you're using Image component for biometric icon
// import { MaterialCommunityIcons } from "@expo/vector-icons";

// Assuming you have a logout function somewhere in your app that clears user session data
// For demonstration, let's conceptualize it:
// const logoutUser = async () => {
//   await AsyncStorage.removeItem("userToken"); // Clear authentication token
//   await AsyncStorage.removeItem("email"); // Clear stored email for current user
//   await AsyncStorage.removeItem("isUserOptedInForBiometrics"); // If this is user-specific preference
//   // IMPORTANT: DO NOT removeItem("isDeviceCapableAndInitializedForBiometrics") here!
//   // ... navigate to login screen
// };

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [blocked, setBlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricsOption, setShowBiometricsOption] = useState(false); // New state to control visibility
  // --- NEW: Check biometric availability on component mount ---
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      // Check if device generally supports biometrics and if it's enrolled
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Check if the device has ever successfully completed a password login
      const deviceInitialized = await AsyncStorage.getItem(
        "isDeviceCapableAndInitializedForBiometrics",
      );

      // If hardware is there, enrolled, AND the device has been initialized once
      if (hasHardware && isEnrolled && deviceInitialized === "true") {
        setShowBiometricsOption(true); // Show the biometric button
      } else {
        setShowBiometricsOption(false);
      }
    };

    checkBiometricAvailability();
  }, []); // Run once on component mount

  // --- NEW: Auto-authenticate on app start (if biometric is setup and enabled) ---
  useEffect(() => {
    const autoAuthenticateBiometrics = async () => {
      const isDeviceInitialized = await AsyncStorage.getItem(
        "isDeviceCapableAndInitializedForBiometrics",
      );
      const userOptedIn = await AsyncStorage.getItem(
        "isUserOptedInForBiometrics",
      ); // Assuming you set this somewhere, e.g., in settings
      const storedEmail = await AsyncStorage.getItem("email"); // To know which user might be logging in

      if (
        isDeviceInitialized === "true" &&
        userOptedIn === "true" &&
        storedEmail
      ) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && enrolled) {
          // You might want to pre-fill the email field here if auto-login fails
          setEmail(storedEmail);

          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate with Biometrics",
            fallbackLabel: "Use passcode",
          });

          if (result.success) {
            const hasSession = await hasValidSession();

            if (hasSession) {
              router.replace("/(tabs)/home");
            } else {
              Alert.alert(
                "Session Expired",
                "Please login with email and password again.",
              );
            }
          } else {
            // If auto-authentication fails, allow manual login
            Alert.alert(
              "Authentication Failed",
              "Biometric auto-login unsuccessful. Please use email and password.",
            );
          }
        }
      }
    };

    autoAuthenticateBiometrics();
  }, []); // Run once on component mount

  const handleBiometricLogin = async () => {
    // Renamed from handleFaceIDLogin for clarity
    // Check if the device has ever successfully completed a password login
    const isDeviceInitialized = await AsyncStorage.getItem(
      "isDeviceCapableAndInitializedForBiometrics",
    );
    if (isDeviceInitialized !== "true") {
      Alert.alert(
        "Biometric Setup Required",
        "Please log in with email and password first to enable biometric login for this device.",
      );
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Biometrics Not Available",
        "Your device doesn't support biometrics or it hasn't been set up.",
      );
      return;
    }

    // You might also want to check if the *current user* has opted into biometrics
    // (e.g., from AsyncStorage or a backend flag)
    const isUserOptedIn = await AsyncStorage.getItem(
      "isUserOptedInForBiometrics",
    );
    if (isUserOptedIn !== "true") {
      Alert.alert(
        "Biometrics Not Enabled",
        "Biometric login is not enabled for your account. Please enable it in settings after logging in with email and password.",
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Login with Biometrics",
      fallbackLabel: "Use passcode",
    });
    if (result.success) {
      const hasSession = await hasValidSession();

      if (hasSession) {
        router.replace("/(tabs)/home");
      } else {
        Alert.alert("Session Expired", "Please login manually.");
      }
    } else {
      Alert.alert(
        "Authentication Failed",
        "Biometric verification unsuccessful.",
      );
    }
  };

  const handleLogin = async () => {
    if (blocked) {
      Alert.alert("Blocked", "Too many failed attempts. Try again later.");
      return;
    }

    if (!email || !password) {
      Alert.alert("Required", "Both email and password are required.");
      return;
    }

    try {
      const response = await loginUser(email, password);

      // Tokens already saved in loginUser
      // If not, keep this:
      // await saveTokens(response.access_token, response.refresh_token);

      if (response.access_token) {
        await AsyncStorage.setItem(
          "isDeviceCapableAndInitializedForBiometrics",
          "true",
        );

        await AsyncStorage.setItem("email", email);
        await AsyncStorage.setItem("isUserOptedInForBiometrics", "true");

        setShowBiometricsOption(true);

        router.replace("/(tabs)/home");
      } else {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);

        if (remaining <= 0) {
          setBlocked(true);
          Alert.alert(
            "Login Blocked",
            "You have exceeded the maximum number of login attempts.",
          );
        } else {
          Alert.alert("Login Failed", response.message);
        }
      }
    } catch (error: any) {
      console.error("❌ Unexpected login error:", error);
      Alert.alert("Error", error.message || "Something went wrong.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingVertical: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/alyalayislogo.png")}
            style={styles.logo}
          />
        </View>

        <Text style={styles.title}>AYLINK</Text>
        <Text style={styles.subTitle}>Please log in to continue</Text>

        <View style={styles.card}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#888"
              style={styles.leftIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#888"
              style={styles.leftIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              //   onChangeText={setPassword}
              onChangeText={(text) => {
                setPassword(text);
                // Reset blocked state if user starts typing password after being blocked
                if (blocked && text.length > 0) {
                  setBlocked(false);
                  setAttemptsLeft(3); // Reset attempts if user starts typing after block
                }
              }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#888"
                style={styles.rightIcon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={blocked}
            onPress={handleLogin}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#1E1E4B", "#3D3D6B"]}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Conditionally render biometric option */}
          {showBiometricsOption && (
            <TouchableOpacity
              onPress={handleBiometricLogin} // Renamed handler
              style={styles.biometricIconButton}
              activeOpacity={0.7}
            >
              <Image
                source={require("@/assets/images/face.png")}
                style={styles.biometricIconImage}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  logo: {
    width: 160,
    height: 160,
    resizeMode: "contain",
    marginBottom: 12,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1E1E4B",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
    textAlign: "center",
  },
  card: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 10,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    padding: 6,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  biometricIconButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 20,
    width: 70,
    height: 70,
    alignSelf: "center",
    borderRadius: 35,
    backgroundColor: "#fff",
    //borderWidth: 1,
    borderColor: "#ddd",
    // shadowColor: "#000",
    // shadowOffset: {
    //   width: 0,
    //   height: 4,
    // },
    // shadowOpacity: 0.15,
    // shadowRadius: 5,
    // elevation: 5,
  },
  biometricIconImage: {
    width: 47,
    height: 50,
    resizeMode: "stretch",
    tintColor: "#1E1E4B",
  },
});
