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
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [blocked, setBlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFaceIDLogin = async () => {
    const hasLoggedInBefore = await AsyncStorage.getItem("hasLoggedInBefore");
    if (hasLoggedInBefore !== "true") {
      Alert.alert(
        "Not Allowed",
        "Please login with email and password first to enable Face ID."
      );
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        "Face ID Not Available",
        "Your device doesn't support Face ID or it hasn't been set up."
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Login with Face ID",
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      router.replace("/(tabs)/home");
    } else {
      Alert.alert(
        "Authentication Failed",
        "Face ID verification unsuccessful."
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

      if (response.success) {
        await AsyncStorage.setItem("faceIdEnabled", "true");
        await AsyncStorage.setItem("hasLoggedInBefore", "true");
        await AsyncStorage.setItem("email", email);

        router.replace("/(tabs)/home");
      } else {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);

        if (remaining <= 0) {
          setBlocked(true);
          Alert.alert(
            "Login Blocked",
            "You have exceeded the maximum number of login attempts."
          );
        } else {
          Alert.alert("Login Failed", response.message);
        }
      }
    } catch (error) {
      console.error("❌ Unexpected login error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    const checkFaceId = async () => {
      const hasLoggedInBefore = await AsyncStorage.getItem("hasLoggedInBefore");
      const faceIdEnabled = await AsyncStorage.getItem("faceIdEnabled");

      if (hasLoggedInBefore === "true" && faceIdEnabled === "true") {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const supported =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && supported.length && enrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate with Face ID",
          });

          if (result.success) {
            router.replace("/(tabs)/home");
          }
        }
      }
    };

    checkFaceId();
  }, []);

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
            source={require("@/assets/images/alyalayis-logo.png")}
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
              onChangeText={setPassword}
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
          {/* <TouchableOpacity
            onPress={handleFaceIDLogin}
            style={styles.faceIDIconButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="face-recognition"
              size={36}
              color="#1E1E4B"
            />
          </TouchableOpacity> */}
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
  // faceIDIconButton: {
  //   alignItems: "center",
  //   justifyContent: "center",
  //   marginTop: 10,
  //   marginBottom: 10,
  // },
});
