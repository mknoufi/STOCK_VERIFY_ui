import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type PowerMode = 'normal' | 'power_saving' | 'critical';

export interface PowerSavingOptions {
  autoDisplayOff?: boolean;
  displayOffTimeout?: number;
  enableAutoMode?: boolean;
  lowBatteryThreshold?: number;
  throttleNetworkRequests?: boolean;
}

export interface PowerState {
  mode: PowerMode;
  batteryLevel: number | null;
  isLowPower: boolean;
  displayDimmed: boolean;
  lastActivity: number;
}

const DEFAULT_STATE: PowerState = {
  mode: 'normal',
  batteryLevel: null,
  isLowPower: false,
  displayDimmed: false,
  lastActivity: Date.now(),
};

const DEFAULT_OPTIONS: Required<PowerSavingOptions> = {
  autoDisplayOff: true,
  displayOffTimeout: 60_000,
  enableAutoMode: true,
  lowBatteryThreshold: 30,
  throttleNetworkRequests: false,
};

export default function usePowerSaving(options: PowerSavingOptions = {}) {
  const mergedOptions = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options.autoDisplayOff, options.displayOffTimeout, options.enableAutoMode, options.lowBatteryThreshold, options.throttleNetworkRequests]
  );

  const [powerState, setPowerState] = useState<PowerState>(DEFAULT_STATE);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleMapRef = useRef<Record<string, number>>({});

  const updateBatteryState = useCallback(
    (level?: number | null) => {
      setPowerState((prev) => {
        const nextLevel = typeof level === 'number' ? Math.round(level * 100) : prev.batteryLevel;
        let mode: PowerMode = prev.mode;
        if (typeof nextLevel === 'number' && mergedOptions.enableAutoMode) {
          if (nextLevel <= mergedOptions.lowBatteryThreshold / 2) {
            mode = 'critical';
          } else if (nextLevel <= mergedOptions.lowBatteryThreshold) {
            mode = 'power_saving';
          } else {
            mode = 'normal';
          }
        }

        return {
          ...prev,
          batteryLevel: nextLevel ?? prev.batteryLevel,
          mode,
          isLowPower: mode !== 'normal',
        };
      });
    },
    [mergedOptions.enableAutoMode, mergedOptions.lowBatteryThreshold]
  );

  const scheduleDisplayTimer = useCallback(() => {
    if (!mergedOptions.autoDisplayOff) {
      return;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setPowerState((prev) => ({
        ...prev,
        displayDimmed: true,
        mode: prev.mode === 'normal' ? 'power_saving' : prev.mode,
      }));
    }, mergedOptions.displayOffTimeout);
  }, [mergedOptions.autoDisplayOff, mergedOptions.displayOffTimeout]);

  const resetActivityTimer = useCallback(() => {
    setPowerState((prev) => ({
      ...prev,
      displayDimmed: false,
      lastActivity: Date.now(),
    }));
    scheduleDisplayTimer();
  }, [scheduleDisplayTimer]);

  useEffect(() => {
    scheduleDisplayTimer();
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [scheduleDisplayTimer]);

  useEffect(() => {
    let battery: any;
    let mounted = true;
    let handleLevelChange: (() => void) | null = null;

    const subscribe = async () => {
      try {
        const globalNavigator = typeof window !== 'undefined' ? window.navigator : undefined;
        if (globalNavigator && 'getBattery' in globalNavigator) {
          battery = await (globalNavigator as any).getBattery();
          handleLevelChange = () => {
            if (mounted) {
              updateBatteryState(battery.level);
            }
          };
          handleLevelChange();
          battery.addEventListener?.('levelchange', handleLevelChange);
        }
      } catch {
        // ignore battery API failures – hook will still work with defaults
      }
    };

    subscribe();

    return () => {
      mounted = false;
      if (battery && handleLevelChange && battery.removeEventListener) {
        battery.removeEventListener('levelchange', handleLevelChange);
      }
    };
  }, [updateBatteryState]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resetActivityTimer();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [resetActivityTimer]);

  const shouldDisableFeature = useCallback(
    (feature: string) => {
      if (powerState.mode === 'normal') {
        return false;
      }
      if (feature === 'animation') {
        return powerState.displayDimmed || powerState.mode === 'power_saving' || powerState.mode === 'critical';
      }
      if (feature === 'camera') {
        return powerState.mode === 'critical';
      }
      if (feature === 'network') {
        return mergedOptions.throttleNetworkRequests;
      }
      return powerState.mode === 'critical';
    },
    [mergedOptions.throttleNetworkRequests, powerState.displayDimmed, powerState.mode]
  );

  const throttleNetworkRequest = useCallback(
    (key: string, cooldownMs = 500) => {
      if (!mergedOptions.throttleNetworkRequests) {
        return false;
      }
      const now = Date.now();
      const lastRun = throttleMapRef.current[key] ?? 0;
      if (now - lastRun < cooldownMs) {
        return true;
      }
      throttleMapRef.current[key] = now;
      return false;
    },
    [mergedOptions.throttleNetworkRequests]
  );

  const optimizeCamera = useCallback(
    () => ({
      preferredFrameRate: powerState.mode === 'critical' ? 24 : powerState.mode === 'power_saving' ? 30 : 60,
      enableTorchByDefault: powerState.mode === 'normal',
    }),
    [powerState.mode]
  );

  return {
    powerState,
    shouldDisableFeature,
    throttleNetworkRequest,
    resetActivityTimer,
    optimizeCamera,
  };
}

