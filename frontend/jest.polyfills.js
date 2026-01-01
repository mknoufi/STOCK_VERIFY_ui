console.log("Polyfills running. Window type:", typeof window);

try {
  if (typeof window !== "undefined") {
    delete global.window;
  }
} catch (e) {}
