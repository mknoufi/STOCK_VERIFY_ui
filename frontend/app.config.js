/* eslint-env node */
const fs = require("fs");
const path = require("path");
const os = require("os");

// Function to get local IP address (fallback)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-ipv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// Function to determine Backend URL
function getBackendUrl() {
  const DEFAULT_PORT = "8001";
  let backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

  // 1. If env var is set, use it (Highest Priority - Docker/CI)
  if (backendUrl) {
    console.log(`[Expo Config] Using Backend URL from Env: ${backendUrl}`);
    return backendUrl;
  }

  // 2. Try to read from backend_port.json (Local Development Source of Truth)
  try {
    const backendPortPath = path.resolve(__dirname, "../backend_port.json");
    if (fs.existsSync(backendPortPath)) {
      const portData = JSON.parse(fs.readFileSync(backendPortPath, "utf8"));
      if (portData && portData.url) {
        console.log(
          `[Expo Config] Detected Backend URL from file: ${portData.url}`,
        );
        return portData.url;
      } else if (portData && portData.port) {
        // Fallback if IP/URL not explicitly in file (older backend version)
        const ip = getLocalIpAddress();
        const url = `http://${ip}:${portData.port}`;
        console.log(
          `[Expo Config] Constructed Backend URL from file port: ${url}`,
        );
        return url;
      }
    }
  } catch (e) {
    console.log("[Expo Config] Could not read backend_port.json");
  }

  // 3. Fallback to auto-detection
  const ip = getLocalIpAddress();
  const fallbackUrl = `http://${ip}:${DEFAULT_PORT}`;
  console.log(`[Expo Config] Using Fallback Backend URL: ${fallbackUrl}`);
  return fallbackUrl;
}

const backendUrl = getBackendUrl();

module.exports = {
  expo: {
    sdkVersion: "54.0.0",
    name: "frontend",
    slug: "frontend",
    version: "1.0.0",
    orientation: "portrait",

    scheme: "frontend",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#000000",
      },
      edgeToEdgeEnabled: true,
      usesCleartextTraffic: true,
    },
    web: {
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      backendUrl: backendUrl,
    },
  },
};
