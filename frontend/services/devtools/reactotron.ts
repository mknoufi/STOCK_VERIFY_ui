import { flags } from '../../constants/flags';

let initialized = false;

export async function initReactotron() {
  if (!__DEV__ || !flags.enableReactotron || initialized) return;
  try {
    const mod = await import('reactotron-react-native');
    const Reactotron = mod.default;
    Reactotron.configure({ name: 'Stock Verify' })
      .useReactNative()
      .connect();
    initialized = true;
    console.log('[Reactotron] Connected');
  } catch (e) {
    console.warn('[Reactotron] init failed:', e);
  }
}
