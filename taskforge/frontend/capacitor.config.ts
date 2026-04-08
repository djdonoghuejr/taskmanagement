import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.secreterry.app",
  appName: "SecreTerry",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#f6f1e8",
      showSpinner: false,
    },
    Keyboard: {
      resize: "body",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#f6f1e8",
    },
  },
};

export default config;
