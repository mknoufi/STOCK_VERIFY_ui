console.log('Polyfills running. Window type:', typeof window);

try {
  if (typeof window !== 'undefined') {
    delete global.window;
  }
} catch (e) {
}

// Polyfill setImmediate and clearImmediate for JSDOM environment
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));
global.clearImmediate = global.clearImmediate || ((id) => clearTimeout(id));
