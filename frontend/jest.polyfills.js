// Fix for "The global process.env.EXPO_OS is not defined" warning
if (!process.env.EXPO_OS) {
  process.env.EXPO_OS = "ios";
}

try {
  if (typeof window !== "undefined") {
    delete global.window;
  }
} catch (e) {}
