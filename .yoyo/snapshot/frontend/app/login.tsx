import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { StatusBar } from 'expo-status-bar';
import { storage } from '@/services/asyncStorageService';
import { AppLogo } from '@/components/AppLogo';
import EnhancedTextInput from '@/components/forms/EnhancedTextInput';
import EnhancedButton from '@/components/forms/EnhancedButton';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import usePowerSaving from '@/hooks/usePowerSaving';
import PowerSavingIndicator from '@/components/PowerSavingIndicator';
import { colors, spacing, typography, borderRadius, shadows } from '@/styles/globalStyles';
import { runFullDiagnostics } from '@/utils/loginDiagnostics';
import { useSegments } from 'expo-router';
import { LoginDiagnosticsPanel } from '@/components/LoginDiagnosticsPanel';

const STORAGE_KEYS = {
  REMEMBERED_USERNAME: 'remembered_username_v1',
  REMEMBER_ME_ENABLED: 'remember_me_enabled_v1',
};

export default function LoginScreen() {
  if (__DEV__) {
    // Component initialization
  }

  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const router = useRouter();
  const segments = useSegments();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (__DEV__) {
    // Auth state loaded
  }
  const passwordInputRef = useRef<TextInput>(null);
  const isMounted = useRef(true);

  // Power saving integration
  const {
    powerState,
    shouldDisableFeature,
    throttleNetworkRequest,
    resetActivityTimer,
  } = usePowerSaving({
    autoDisplayOff: true,
    displayOffTimeout: 120000, // 2 minutes for login screen
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Form validation
  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    setFieldError,
    handleSubmit,
  } = useFormValidation<{ username: string; password: string }>([
    {
      name: 'username',
      label: 'Username',
      defaultValue: '',
      rules: {
        required: 'Username is required',
        minLength: { value: 3, message: 'Username must be at least 3 characters' },
      },
    },
    {
      name: 'password',
      label: 'Password',
      defaultValue: '',
      rules: {
        required: 'Password is required',
        minLength: { value: 4, message: 'Password must be at least 4 characters' },
      },
    },
  ]);

  // Keyboard shortcuts for web
  useKeyboardShortcuts([
    {
      key: 'Enter',
      callback: () => {
        if (Platform.OS === 'web' && !isSubmitting) {
          submitLogin();
        }
      },
    },
    {
      key: 'Escape',
      callback: () => {
        if (Platform.OS === 'web') {
          if (showDiagnostics) {
            setShowDiagnostics(false);
          } else {
            router.back();
          }
        }
      },
    },
    {
      key: 'd',
      shift: true,
      ctrl: true,
      callback: () => {
        if (Platform.OS === 'web') {
          setShowDiagnostics(!showDiagnostics);
          // Re-run diagnostics when opening
          if (!showDiagnostics) {
            setTimeout(() => {
              runFullDiagnostics(
                Platform.OS,
                values,
                errors,
                touched,
                user,
                isLoading,
                segments
              ).catch(err => console.error('Diagnostic error:', err));
            }, 100);
          }
        }
      },
    },
  ]);

  // Log web platform identification and inject web-specific styles
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Global handlers to prevent text selection without blocking clicks
      const handleSelectStart = (e: Event) => {
        const target = e.target as HTMLElement;
        // Only prevent selection on non-input, non-textarea elements
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        // Clear any accidental text selection on mouse up (but only if it's not in an input)
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0 && e.detail === 2) {
            // Double-click detected, clear selection
            selection.removeAllRanges();
          }
        }
      };

      // Use capture phase to catch events early, but don't prevent default on click
      document.addEventListener('selectstart', handleSelectStart, true);
      document.addEventListener('mouseup', handleMouseUp, false);

      // Inject CSS to fix mouse/pointer events on web
      if (typeof document !== 'undefined') {
        const styleId = 'login-web-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            input#username:focus,
            input#password:focus {
              outline: none !important;
            }
            input#username,
            input#password {
              border: none !important;
              background: transparent !important;
            }
            /* Fix pointer events for web - be specific to avoid input issues */
            [data-testid="login-form"] {
              pointer-events: auto !important;
            }
            /* Ensure form elements are clickable */
            form {
              pointer-events: auto !important;
            }
            /* Inputs must have proper cursor and pointer events */
            form input,
            form textarea,
            [data-testid="login-form"] input,
            [data-testid="login-form"] textarea {
              pointer-events: auto !important;
              cursor: text !important;
              -webkit-user-select: text !important;
              user-select: text !important;
            }
            /* Buttons should have pointer cursor */
            form button,
            [data-testid="login-form"] button,
            form div[role="button"],
            [data-testid="login-form"] div[role="button"] {
              cursor: pointer !important;
            }
            /* Fix for React Native Web - ensure all interactive elements work */
            div[role="button"],
            button,
            [data-testid="login-form"] {
              pointer-events: auto !important;
              cursor: pointer !important;
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
              -webkit-tap-highlight-color: transparent !important;
            }
            /* Inputs should allow text selection and input - highest priority */
            input[type="text"],
            input[type="password"],
            input[type="email"],
            input[type="number"],
            input,
            textarea {
              cursor: text !important;
              -webkit-user-select: text !important;
              user-select: text !important;
              pointer-events: auto !important;
              /* Ensure inputs can receive focus and input */
              -webkit-tap-highlight-color: rgba(33, 150, 243, 0.1) !important;
            }
            /* Ensure inputs are not blocked by parent styles */
            input:focus,
            textarea:focus {
              outline: 2px solid rgba(33, 150, 243, 0.5) !important;
              outline-offset: 2px !important;
            }
            /* Prevent text selection on buttons and non-input text - but exclude inputs */
            button,
            div[role="button"]:not(input),
            label:not(input),
            span:not(input),
            p:not(input),
            div:not(input):not(textarea):not([contenteditable]) {
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }
            /* Explicitly allow inputs to be selectable */
            input,
            textarea {
              -webkit-user-select: text !important;
              user-select: text !important;
            }
            /* Prevent double-click selection */
            * {
              -webkit-tap-highlight-color: transparent !important;
            }
            /* Prevent context menu on double-click */
            * {
              -webkit-user-drag: none !important;
            }
            /* Ensure no overlays block clicks - but be selective */
            body > #root {
              pointer-events: auto !important;
            }
            /* React Native Web internal overlay - ensure it doesn't block */
            div[style*="pointer-events: none"][style*="visibility: hidden"] {
              pointer-events: none !important;
              visibility: hidden !important;
            }
            /* Fix for TouchableOpacity on web */
            div[style*="cursor: pointer"],
            div[tabindex="0"] {
              pointer-events: auto !important;
              cursor: pointer !important;
            }
            /* Ensure all clickable divs work */
            div[tabindex="0"][role="button"],
            div[tabindex="0"][role="checkbox"] {
              pointer-events: auto !important;
              cursor: pointer !important;
              -webkit-user-select: none !important;
              user-select: none !important;
            }
            /* Prevent text selection overlay - but allow selection in inputs */
            ::selection {
              background: rgba(33, 150, 243, 0.2) !important;
            }
            ::-moz-selection {
              background: rgba(33, 150, 243, 0.2) !important;
            }
            /* Allow normal selection in inputs */
            input::selection,
            textarea::selection {
              background: rgba(33, 150, 243, 0.3) !important;
            }
            /* Force pointer events on all interactive elements */
            form div[tabindex],
            form div[role="button"],
            form div[role="checkbox"] {
              pointer-events: auto !important;
              cursor: pointer !important;
            }
          `;
          document.head.appendChild(style);
        }
      }

      if (__DEV__) {
        console.log('🌐 LoginScreen loaded on WEB platform');
          console.log('🌐 Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
          console.log('🌐 Auth state:', { hasUser: !!user, isLoading, userRole: user?.role });
          console.log('🌐 Form state:', {
          hasUsername: !!values.username,
          hasPassword: !!values.password,
          isSubmitting,
          errors: Object.keys(errors).length > 0 ? errors : 'none'
        });

        // Run full diagnostics after a short delay to allow DOM to render
        setTimeout(() => {
          runFullDiagnostics(
            Platform.OS,
            values,
            errors,
            touched,
            user,
            isLoading,
            segments
          ).catch(err => {
            console.error('❌ Diagnostic error:', err);
          });
        }, 1000);

        // Verify form is in DOM
        setTimeout(() => {
          if (typeof document !== 'undefined') {
            const formElement = document.querySelector('[data-testid="login-form"]') ||
              document.querySelector('form') ||
              document.querySelector('[class*="form"]');
            if (__DEV__) {
              console.log('🌐 Form element found:', !!formElement);
            }
            const usernameInput = document.getElementById('username') ||
              document.querySelector('input[placeholder*="Username" i]');
            const passwordInput = document.getElementById('password') ||
              document.querySelector('input[type="password"]');
            if (__DEV__) {
              console.log('🌐 Inputs found:', {
                username: !!usernameInput,
                password: !!passwordInput
              });
            }
            // Check visibility
            if (formElement && __DEV__) {
              const styles = window.getComputedStyle(formElement as Element);
              console.log('🌐 Form visibility:', {
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity,
                width: styles.width,
                height: styles.height,
              });
            }
          }
        }, 500);
      }

      return () => {
        document.removeEventListener('selectstart', handleSelectStart, true);
        document.removeEventListener('mouseup', handleMouseUp, false);
      };
    }
    return undefined;
  }, [values.username, values.password, isSubmitting, errors, user, isLoading]);

  // Redirect if already logged in (let _layout handle it, but also check here as backup)
  useEffect(() => {
    if (user && !isLoading && Platform.OS === 'web') {
      // User is already logged in, redirect based on role
      const targetRoute = (user.role === 'supervisor' || user.role === 'admin')
        ? '/admin/control-panel'
        : '/staff/home';

      if (__DEV__) {
        console.log('[LOGIN] User already logged in, redirecting', {
          username: user.username,
          role: user.role,
          targetRoute
        });
      }

      // Small delay to ensure state is ready
      const redirectTimer = setTimeout(() => {
        router.replace(targetRoute as any);
      }, 100);

      return () => clearTimeout(redirectTimer);
    }
    return undefined;
  }, [user, isLoading, router]);

  // Entry animation
  useEffect(() => {
    if (!shouldDisableFeature('animation')) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [fadeAnim, slideAnim, shouldDisableFeature]);

  useEffect(() => {
    isMounted.current = true;
    const loadSavedUsername = async () => {
      try {
        const wasRemembered = await storage.get(
          STORAGE_KEYS.REMEMBER_ME_ENABLED
        );
        if (wasRemembered === 'true') {
          const saved = await storage.get(
            STORAGE_KEYS.REMEMBERED_USERNAME
          );
          if (saved) {
            setValue('username', saved);
            setRememberMe(true);
          }
        }
      } catch {
        if (__DEV__) {
          console.warn('Failed to load saved login preference.');
        }
      }
    };
    loadSavedUsername();
    return () => {
      isMounted.current = false;
    };
  }, [setValue]);

  const persistUsernamePreference = useCallback(
    async (save: boolean, value: string) => {
      try {
        if (save) {
          await storage.set(
            STORAGE_KEYS.REMEMBERED_USERNAME,
            value
          );
          await storage.set(
            STORAGE_KEYS.REMEMBER_ME_ENABLED,
            'true'
          );
        } else {
          await storage.remove(STORAGE_KEYS.REMEMBERED_USERNAME);
          await storage.remove(STORAGE_KEYS.REMEMBER_ME_ENABLED);
        }
      } catch {
        if (__DEV__) {
          console.warn('Failed to persist login preference.');
        }
      }
    },
    []
  );

  const handleLogin = useCallback(async () => {
    const loginStartTime = Date.now();
    const stepLog = (step: number, message: string, data?: unknown) => {
      if (__DEV__) {
        const elapsed = Date.now() - loginStartTime;
        console.log(`[LOGIN STEP ${step}] [${elapsed}ms] ${message}`, data || '');
      }
    };

    stepLog(1, '🔐 Login handler called');

    const sanitizedUsername = values.username.trim();
    stepLog(4, 'Starting login', { username: sanitizedUsername, passwordLength: values.password.length, rememberMe });

    resetActivityTimer(); // Keep screen on during login

    try {
      stepLog(5, 'Calling authStore.login()');

      // Call login directly - throttleNetworkRequest is just a boolean check, not a wrapper
      const success = await login(sanitizedUsername, values.password, rememberMe);

      stepLog(6, 'authStore.login() completed', { success });

      if (!isMounted.current) {
        stepLog(6.1, '⚠️ Component unmounted - aborting redirect');
        return;
      }

      if (success) {
        stepLog(7, '✅ Login successful - starting post-login flow');

        stepLog(7.1, 'Persisting username preference');
        await persistUsernamePreference(rememberMe, sanitizedUsername);
        stepLog(7.2, 'Username preference persisted');

        stepLog(7.3, 'Waiting for state/AsyncStorage sync');
        // On web, wait a bit longer for state to propagate
        const waitTime = Platform.OS === 'web' ? 500 : 100;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        stepLog(7.4, 'Wait completed');

        // Get the user from store to determine redirect target
        // Try multiple times in case state hasn't updated yet
        let currentUser = useAuthStore.getState().user;
        let attempts = 0;
        while (!currentUser && attempts < 5) {
          await new Promise(resolve => setTimeout(resolve, 100));
          currentUser = useAuthStore.getState().user;
          attempts++;
        }

        stepLog(7.5, 'Current user after login', {
          hasUser: !!currentUser,
          role: currentUser?.role,
          username: currentUser?.username,
          attempts
        });

        if (currentUser) {
          // Determine target route based on role
          let targetRoute: string;
          if (Platform.OS === 'web' && (currentUser.role === 'supervisor' || currentUser.role === 'admin')) {
            targetRoute = '/admin/control-panel';
          } else if (currentUser.role === 'supervisor' || currentUser.role === 'admin') {
            targetRoute = '/supervisor/dashboard';
          } else {
            targetRoute = '/staff/home';
          }

          stepLog(8, '🚀 Redirecting after login', {
            platform: Platform.OS,
            role: currentUser.role,
            targetRoute,
            username: currentUser.username
          });

          // On web, use window.location for more reliable redirect
          if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
              stepLog(8.1, 'Using window.location.href for redirect on web');
              if (__DEV__) {
                console.log('[LOGIN] 🚀 Redirecting to:', targetRoute);
                console.log('[LOGIN] Current URL:', window.location.href);
                console.log('[LOGIN] Target URL will be:', window.location.origin + targetRoute);
              }
              // Use a small delay to ensure state is fully updated
              setTimeout(() => {
                window.location.href = targetRoute;
              }, 100);
              return; // Exit early since we're redirecting
            }
          }

          // Fallback to router for mobile
          stepLog(8.2, 'Using router.replace for redirect');
          router.replace(targetRoute as any);
          stepLog(9, 'Router redirect initiated');
        } else {
          stepLog(8, '⚠️ No user found after login - letting _layout handle redirect');
          // Fallback: navigate to index and let _layout handle it
          router.replace('/');
        }
      } else {
        stepLog(6.2, '❌ Login returned false - invalid credentials');
        setFieldError('password', 'Invalid credentials. Please check your username and password.');
      }
    } catch (err: unknown) {
      stepLog(10, '❌ Exception caught in login handler');
      const fallback = 'Login failed. Please try again.';
      const axiosError = err as { message?: string; response?: { data?: { detail?: { message?: string }; message?: string } } };
      const msg =
        axiosError?.message ||
        axiosError?.response?.data?.detail?.message ||
        axiosError?.response?.data?.message ||
        fallback;
      stepLog(10.1, 'Error message extracted', { message: msg, error: err });
      setFieldError('password', msg);
    } finally {
      const totalTime = Date.now() - loginStartTime;
      stepLog(12, `🏁 Login flow completed in ${totalTime}ms`);
    }
  }, [
    values.username,
    values.password,
    rememberMe,
    login,
    persistUsernamePreference,
    router,
    setFieldError,
  ]);

  const submitLogin = useCallback(() => {
    if (isSubmitting || isLoading) {
      return;
    }
    return handleSubmit(handleLogin)();
  }, [handleSubmit, handleLogin, isSubmitting, isLoading]);

  // On web, don't use KeyboardAvoidingView as it can block events
  return Platform.OS === 'web' ? (
    <View style={[styles.container, styles.containerWeb]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#121212', '#0A0A0A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Power Saving Indicator */}
      <View
        style={styles.powerIndicatorContainer}
        pointerEvents="box-none"
      >
        <PowerSavingIndicator powerState={powerState} compact />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && styles.scrollContentWeb]}
        keyboardShouldPersistTaps="handled"
        style={Platform.OS === 'web' ? styles.scrollViewWeb : undefined}
        onScroll={resetActivityTimer}
        scrollEventThrottle={16}
        {...(Platform.OS === 'web' ? {
          pointerEvents: 'auto' as const,
          onMouseUp: (e: any) => {
            // Clear selection on double-click, but don't prevent the click
            if (e.detail === 2 && window.getSelection) {
              const selection = window.getSelection();
              if (selection && selection.toString().length > 0) {
                selection.removeAllRanges();
              }
            }
          },
        } : {})}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, Platform.OS === 'web' && { cursor: 'pointer' }]}
          onPress={() => {
            resetActivityTimer();
            router.back();
          }}
          accessibilityLabel="Go back"
          {...(Platform.OS === 'web' ? {
            onSelectStart: (e: any) => {
              e.preventDefault();
            },
          } : {})}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <AppLogo size="large" showText={true} variant="default" />
        </Animated.View>

        {/* Low battery warning */}
        {powerState.displayDimmed && (
          <View style={styles.batteryWarning}>
            <Ionicons name="moon-outline" size={16} color={colors.warning} />
            <Text style={styles.batteryWarningText}>
              Screen dimmed to save battery. Tap to restore brightness.
            </Text>
          </View>
        )}

        {/* Web: Wrap in proper HTML form element for password manager support */}
        {Platform.OS === 'web' ? (
          <View style={styles.formWrapper}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                submitLogin();
              }}
            >
              <View
                style={[styles.form, Platform.OS === 'web' && styles.webFormContainer]}
                data-testid="login-form"
                {...(Platform.OS !== 'web'
                  ? {
                    onStartShouldSetResponder: () => true,
                    onResponderTerminationRequest: () => false,
                  }
                  : {})}
              >
                {/* Display form-level errors */}
                {errors.password && touched.password && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#ff4444" />
                    <Text style={styles.errorText}>{errors.password}</Text>
                  </View>
                )}

                {/* Username Field */}
                <EnhancedTextInput
                  label="Username"
                  placeholder="Username"
                  value={values.username}
                  onChangeText={(text: string) => setValue('username', text)}
                  onBlur={() => setFieldTouched('username', true)}
                  error={touched.username ? errors.username : undefined}
                  editable={!(isSubmitting || isLoading)}
                  autoCapitalize="none"
                  autoComplete="username"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  returnKeyType="next"
                />

                {/* Password Field */}
                <EnhancedTextInput
                  ref={passwordInputRef}
                  label="Password"
                  placeholder="Password"
                  value={values.password}
                  onChangeText={(text: string) => setValue('password', text)}
                  onBlur={() => setFieldTouched('password', true)}
                  error={touched.password ? errors.password : undefined}
                  editable={!(isSubmitting || isLoading)}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={submitLogin}
                  returnKeyType="done"
                />

                {/* Remember Me */}
                <Pressable
                  style={styles.rememberMeContainer}
                  onPress={() => {
                    if (!(isSubmitting || isLoading)) {
                      setRememberMe(!rememberMe);
                    }
                  }}
                  disabled={isSubmitting || isLoading}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  {...(Platform.OS === 'web' ? {
                    onSelectStart: (e: any) => {
                      e.preventDefault();
                    },
                  } : {})}
                >
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={rememberMe ? '#4CAF50' : '#888'}
                  />
                  <Text style={styles.rememberMeText}>Remember Me</Text>
                </Pressable>

                {/* Login Button */}
                <EnhancedButton
                  title={isSubmitting || isLoading ? 'Logging in...' : 'Login'}
                  onPress={() => submitLogin()}
                  disabled={isSubmitting || isLoading}
                  loading={isSubmitting || isLoading}
                  variant="primary"
                  fullWidth
                />

                {/* Register Link - Using Pressable for consistency */}
                <View style={styles.registerLink}>
                  <Pressable
                    onPress={() => {
                      if (!(isSubmitting || isLoading)) {
                        router.push('/register');
                      }
                    }}
                    disabled={isSubmitting || isLoading}
                    {...(Platform.OS === 'web' ? {
                      onSelectStart: (e: any) => {
                        e.preventDefault();
                      },
                    } : {})}
                  >
                    <Text style={styles.registerLinkText}>
                      {"Don't have an account? "}
                      <Text style={styles.registerLinkBold}>Register</Text>
                    </Text>
                  </Pressable>
                </View>

                {/* Demo Accounts Info */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>Demo Accounts:</Text>
                  <Text style={styles.infoText}>Staff: staff1 / staff123</Text>
                  <Text style={styles.infoText}>
                    Supervisor: supervisor / super123
                  </Text>
                  <Text style={styles.infoText}>Admin: admin / admin123</Text>
                </View>
              </View>
            </form>
          </View>
        ) : (
          // Mobile: Direct View without form wrapper
          <View style={styles.form}>
            {/* Display form-level errors */}
            {errors.password && touched.password && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff4444" />
                <Text style={styles.errorText}>{errors.password}</Text>
              </View>
            )}

            {/* Username Field */}
            <EnhancedTextInput
              label="Username"
              placeholder="Username"
              value={values.username}
              onChangeText={(text) => setValue('username', text)}
              onBlur={() => setFieldTouched('username', true)}
              error={touched.username ? errors.username : undefined}
              editable={!(isSubmitting || isLoading)}
              autoCapitalize="none"
              autoComplete="username"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              returnKeyType="next"
            />

            {/* Password Field */}
            <EnhancedTextInput
              ref={passwordInputRef}
              label="Password"
              placeholder="Password"
              value={values.password}
              onChangeText={(text) => setValue('password', text)}
              onBlur={() => setFieldTouched('password', true)}
              error={touched.password ? errors.password : undefined}
              editable={!(isSubmitting || isLoading)}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={submitLogin}
              returnKeyType="done"
            />

            {/* Remember Me */}
            <Pressable
              style={styles.rememberMeContainer}
              onPress={() => !(isSubmitting || isLoading) && setRememberMe(!rememberMe)}
              disabled={isSubmitting || isLoading}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <Ionicons
                name={rememberMe ? 'checkbox' : 'square-outline'}
                size={24}
                color={rememberMe ? '#4CAF50' : '#888'}
              />
              <Text style={styles.rememberMeText}>Remember Me</Text>
            </Pressable>

            {/* Login Button */}
            <EnhancedButton
              title={isSubmitting || isLoading ? 'Logging in...' : 'Login'}
              onPress={submitLogin}
              disabled={isSubmitting || isLoading}
              loading={isSubmitting || isLoading}
              variant="primary"
              fullWidth
            />

            {/* Register Link - Using Pressable for consistency */}
            <View style={styles.registerLink}>
              <Pressable
                onPress={() => {
                  if (!(isSubmitting || isLoading)) {
                    router.push('/register');
                  }
                }}
                disabled={isSubmitting || isLoading}
              >
                <Text style={styles.registerLinkText}>
                  {"Don't have an account? "}
                  <Text style={styles.registerLinkBold}>Register</Text>
                </Text>
              </Pressable>
            </View>

            {/* Demo Accounts Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Demo Accounts:</Text>
              <Text style={styles.infoText}>Staff: staff1 / staff123</Text>
              <Text style={styles.infoText}>
                Supervisor: supervisor / super123
              </Text>
              <Text style={styles.infoText}>Admin: admin / admin123</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Diagnostics Panel */}
      {__DEV__ && (
        <LoginDiagnosticsPanel
          visible={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </View>
  ) : (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      onTouchStart={resetActivityTimer}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={['#1a1a1a', '#0d0d0d', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Power Saving Indicator */}
      <View
        style={styles.powerIndicatorContainer}
        pointerEvents="box-none"
      >
        <PowerSavingIndicator powerState={powerState} compact />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={resetActivityTimer}
        scrollEventThrottle={16}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            resetActivityTimer();
            router.back();
          }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <AppLogo size="large" showText={true} variant="default" />
        </Animated.View>

        {/* Low battery warning */}
        {powerState.displayDimmed && (
          <View style={styles.batteryWarning}>
            <Ionicons name="moon-outline" size={16} color={colors.warning} />
            <Text style={styles.batteryWarningText}>
              Screen dimmed to save battery. Tap to restore brightness.
            </Text>
          </View>
        )}

        {/* Mobile: Direct View without form wrapper */}
        <View style={styles.form}>
          {/* Display form-level errors */}
          {errors.password && touched.password && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ff4444" />
              <Text style={styles.errorText}>{errors.password}</Text>
            </View>
          )}

          {/* Username Field */}
          <EnhancedTextInput
            label="Username"
            placeholder="Username"
            value={values.username}
            onChangeText={(text) => setValue('username', text)}
            onBlur={() => setFieldTouched('username', true)}
            error={touched.username ? errors.username : undefined}
            editable={!(isSubmitting || isLoading)}
            autoCapitalize="none"
            autoComplete="username"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            returnKeyType="next"
          />

          {/* Password Field */}
          <EnhancedTextInput
            ref={passwordInputRef}
            label="Password"
            placeholder="Password"
            value={values.password}
            onChangeText={(text) => setValue('password', text)}
            onBlur={() => setFieldTouched('password', true)}
            error={touched.password ? errors.password : undefined}
            editable={!(isSubmitting || isLoading)}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submitLogin}
            returnKeyType="done"
          />

          {/* Remember Me */}
          <Pressable
            style={styles.rememberMeContainer}
            onPress={() => !(isSubmitting || isLoading) && setRememberMe(!rememberMe)}
            disabled={isSubmitting || isLoading}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
          >
            <Ionicons
              name={rememberMe ? 'checkbox' : 'square-outline'}
              size={24}
              color={rememberMe ? '#4CAF50' : '#888'}
            />
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </Pressable>

          {/* Login Button */}
          <EnhancedButton
            title={isSubmitting || isLoading ? 'Logging in...' : 'Login'}
            onPress={submitLogin}
            disabled={isSubmitting || isLoading}
            loading={isSubmitting || isLoading}
            variant="primary"
            fullWidth
          />

          {/* Register Link - Using Pressable for consistency */}
          <View style={styles.registerLink}>
            <Pressable
              onPress={() => {
                if (!(isSubmitting || isLoading)) {
                  router.push('/register');
                }
              }}
              disabled={isSubmitting || isLoading}
            >
              <Text style={styles.registerLinkText}>
                {"Don't have an account? "}
                <Text style={styles.registerLinkBold}>Register</Text>
              </Text>
            </Pressable>
          </View>

          {/* Demo Accounts Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Demo Accounts:</Text>
            <Text style={styles.infoText}>Staff: staff1 / staff123</Text>
            <Text style={styles.infoText}>
              Supervisor: supervisor / super123
            </Text>
            <Text style={styles.infoText}>Admin: admin / admin123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  containerWeb: {
    minHeight: '100vh',
    width: '100%',
  } as any,
  scrollViewWeb: {
    width: '100%',
    height: '100%',
  } as any,
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  scrollContentWeb: {
    minHeight: '100vh',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  } as any,
  powerIndicatorContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  batteryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  batteryWarningText: {
    color: colors.warning,
    fontSize: typography.bodySmall.fontSize,
    flex: 1,
  },
  formWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  form: {
    width: '100%',
    ...(Platform.OS === 'web' ? {
      maxWidth: '100%',
    } : {}),
  } as any,
  webFormContainer: {
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      pointerEvents: 'auto',
    } : {}),
  } as any,
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}20`,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.bodySmall.fontSize,
    flex: 1,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  rememberMeText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginLeft: spacing.sm,
  },
  registerLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
    padding: spacing.sm,
  },
  registerLinkText: {
    color: colors.textTertiary,
    fontSize: typography.body.fontSize,
  },
  registerLinkBold: {
    color: colors.success,
    fontWeight: 'bold',
    textDecorationLine: Platform.OS === 'web' ? 'underline' : 'none',
  },
  infoBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  infoText: {
    color: colors.textTertiary,
    fontSize: typography.bodySmall.fontSize,
    marginBottom: 4,
  },
});
