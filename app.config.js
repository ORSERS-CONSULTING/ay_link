import 'dotenv/config';

export default {
  expo: {
    name: "AYLINK",
    slug: "creditApp",
    version: "1.0.1",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    statusBar: {
      style: "dark",
      hidden: false,
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tenioduola.aylink",
      infoPlist: {
        UIStatusBarStyle: "UIStatusBarStyleDarkContent",
        UIViewControllerBasedStatusBarAppearance: true,
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#ffffff"
      },
      package: "com.tenioduola.creditApp",
      googleServicesFile: "./google-services.json",
      versionCode: 2,
      permissions: [
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT"
      ]
    },
    androidStatusBar: {
      barStyle: "dark-content",
      backgroundColor: "#ffffff",
      translucent: false
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/logo.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      API_SECRET: process.env.API_SECRET,
      router: {
        origin: false
      },
      eas: {
        projectId: "a867d74b-7553-431e-895b-c225b596ce03"
      }
    },
    owner: "tenioduola",
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/a867d74b-7553-431e-895b-c225b596ce03"
    }
  }
};
