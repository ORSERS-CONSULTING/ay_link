import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [blocked, setBlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const cardAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = () => {
    if (blocked) {
      Alert.alert("Blocked", "Too many failed attempts. Try again later.");
      return;
    }

    if (!email || !password) {
      Alert.alert("Required", "Both email and password are required.");
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (email === "oduolateniola@gmail.com" && password === "12345678") {
      Alert.alert("Login Success", "Welcome!");
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
        Alert.alert(
          "Login Failed",
          `Incorrect credentials. ${remaining} attempt(s) left.`
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require("@/assets/images/alyalayis-logo.png")}
        style={styles.logo}
      />

      <Animated.View
        style={[styles.card, { transform: [{ translateY: cardAnim }] }]}
      >
        {/* <Text style={styles.title}>Login</Text> */}

        {/* Email Field */}
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

        {/* Password Field */}
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
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#888"
              style={styles.rightIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity disabled={blocked} onPress={handleLogin}>
          <LinearGradient
            colors={["#1E1E4B", "#3D3D6B"]}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    // backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    // shadowColor: "#000",
    // shadowOpacity: 0.1,
    // shadowRadius: 10,
    // shadowOffset: { width: 0, height: 5 },
    // elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E1E4B",
    marginBottom: 20,
    textAlign: "center",
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
  logo: {
    width: 250,
    height: 250,
    resizeMode: "contain",
    // marginBottom: 10,
  },
});
