import React, { useState, useEffect, useRef } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import styled from "@emotion/native";

import { SystemStatus } from "../../components/feedback/SystemStatus";
import { storage } from "../../services/asyncStorageService";
import { AppLogo } from "../../components/AppLogo";
import { PremiumInput } from "../../components/premium/PremiumInput";
import { PremiumButton } from "../../components/premium/PremiumButton";
import { useFormValidation } from "../../hooks/useFormValidation";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { modernColors } from "../../styles/modernDesignSystem";
import { runFullDiagnostics } from "../../utils/loginDiagnostics";
import { LoginDiagnosticsPanel } from "../../components/LoginDiagnosticsPanel";
import { useAuthStore } from "../../store/authStore";

// Styled Components
const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background.default};
`;

const ContentContainer = styled(KeyboardAvoidingView)`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: ${(props) => props.theme.spacing.lg}px;
  z-index: 1;
`;

const LoginCard = styled(BlurView)`
  width: 100%;
  border-radius: ${(props) => props.theme.borderRadius["2xl"]}px;
  padding: ${(props) => props.theme.spacing.xl}px;
  overflow: hidden;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.1);
  background-color: rgba(30, 41, 59, 0.4);
`;

const Header = styled.View`
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.xl}px;
`;

const Title = styled.Text`
  font-size: ${(props) => props.theme.typography.h2.fontSize}px;
  font-weight: ${(props) => props.theme.typography.h2.fontWeight};
  color: ${(props) => props.theme.colors.text.primary};
  margin-bottom: ${(props) => props.theme.spacing.xs}px;
  text-align: center;
`;

const Subtitle = styled.Text`
  font-size: ${(props) => props.theme.typography.body.medium.fontSize}px;
  color: ${(props) => props.theme.colors.text.secondary};
  text-align: center;
`;

const FormContainer = styled.View`
  gap: ${(props) => props.theme.spacing.lg}px;
`;

const InputGroup = styled.View`
  gap: ${(props) => props.theme.spacing.md}px;
`;

const OptionsContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.xs}px;
`;

const RememberMeContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs}px;
`;

const Checkbox = styled.View<{ checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border-width: 2px;
  border-color: ${(props) =>
    props.checked
      ? props.theme.colors.primary[500]
      : props.theme.colors.text.tertiary};
  background-color: ${(props) =>
    props.checked ? props.theme.colors.primary[500] : "transparent"};
  justify-content: center;
  align-items: center;
`;

const RememberMeText = styled.Text`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: ${(props) => props.theme.typography.body.small.fontSize}px;
`;

const ForgotPasswordText = styled.Text`
  color: ${(props) => props.theme.colors.primary[400]};
  font-size: ${(props) => props.theme.typography.body.small.fontSize}px;
  font-weight: 600;
`;

const DividerContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-vertical: ${(props) => props.theme.spacing.lg}px;
  gap: ${(props) => props.theme.spacing.md}px;
`;

const DividerLine = styled.View`
  flex: 1;
  height: 1px;
  background-color: ${(props) => props.theme.colors.border.light};
`;

const DividerText = styled.Text`
  color: ${(props) => props.theme.colors.text.tertiary};
  font-size: ${(props) => props.theme.typography.body.small.fontSize}px;
`;

const Footer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.xl}px;
  gap: ${(props) => props.theme.spacing.xs}px;
`;

const FooterText = styled.Text`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: ${(props) => props.theme.typography.body.medium.fontSize}px;
`;

const RegisterLink = styled.Text`
  color: ${(props) => props.theme.colors.primary[400]};
  font-size: ${(props) => props.theme.typography.body.medium.fontSize}px;
  font-weight: 600;
`;

const ErrorContainer = styled(Animated.View)`
  background-color: rgba(239, 68, 68, 0.1);
  border-width: 1px;
  border-color: rgba(239, 68, 68, 0.2);
  padding: ${(props) => props.theme.spacing.md}px;
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  margin-bottom: ${(props) => props.theme.spacing.lg}px;
`;

const ErrorText = styled.Text`
  color: ${(props) => props.theme.colors.error.main};
  font-size: ${(props) => props.theme.typography.body.small.fontSize}px;
  text-align: center;
`;

export default function LoginScreen() {
  const router = useRouter();
  const segments = useSegments();

  const { login, isLoading, user } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Refs for focusing
  const passwordInputRef = useRef<TextInput>(null);

  const handleLoginSubmit = async (formValues: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAuthError(null);

    try {
      const success = await login(formValues.username, formValues.password);

      if (success) {
        // Handle "Remember Me"
        if (rememberMe) {
          await storage.set("saved_username", formValues.username);
        } else {
          await storage.remove("saved_username");
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setAuthError("Invalid username or password");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setAuthError("An error occurred during login");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Login failed:", err);
    }
  };

  // Form validation
  const { values, errors, touched, setValue, setFieldTouched, handleSubmit } =
    useFormValidation([
      {
        name: "username",
        rules: {
          required: "Username is required",
          minLength: {
            value: 3,
            message: "Username must be at least 3 characters",
          },
          custom: (value) =>
            !value.includes(" ") ? null : "Username cannot contain spaces",
        },
      },
      {
        name: "password",
        rules: {
          required: "Password is required",
          minLength: {
            value: 4,
            message: "Password must be at least 4 characters",
          },
        },
      },
    ]);

  // Load saved username if "Remember Me" was checked
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedUsername = await storage.get("saved_username");
        if (savedUsername) {
          setValue("username", savedUsername);
          setRememberMe(true);
        }
      } catch (error) {
        console.error("Failed to load saved credentials:", error);
      }
    };
    loadSavedCredentials();
  }, [setValue]);

  // Run diagnostics on mount
  useEffect(() => {
    if (__DEV__) {
      // Small delay to ensure everything is mounted
      setTimeout(() => {
        runFullDiagnostics(
          Platform.OS,
          values,
          errors,
          touched,
          user,
          isLoading,
          segments,
        ).catch((err) => __DEV__ && console.error("Diagnostic error:", err));
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      const redirectPath =
        user.role === "admin"
          ? "/admin/metrics"
          : user.role === "supervisor"
            ? "/supervisor/dashboard"
            : "/staff/home";
      router.replace(redirectPath as any);
    }
  }, [user, isLoading, router]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "Enter",
      callback: () => handleSubmit(handleLoginSubmit)(),
    },
    {
      key: "d",
      ctrl: true,
      callback: () => setShowDiagnostics((prev) => !prev),
    },
  ]);

  return (
    <Container>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0F172A", "#020617"]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      {/* Background decoration */}
      <View
        style={{
          position: "absolute",
          top: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: modernColors.primary[500],
          opacity: 0.1,
          transform: [{ scale: 1.5 }],
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: modernColors.secondary[500],
          opacity: 0.1,
          transform: [{ scale: 1.5 }],
        }}
      />

      <ContentContainer behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeInUp.duration(800).springify()}
              style={{ width: "100%", maxWidth: 420 }}
            >
              <LoginCard intensity={30} tint="dark">
                <Header>
                  <AppLogo size="large" />
                  <View style={{ height: 24 }} />
                  <Title>Welcome Back</Title>
                  <Subtitle>Sign in to access your dashboard</Subtitle>
                </Header>

                {authError && (
                  <ErrorContainer entering={FadeInDown}>
                    <ErrorText>{authError}</ErrorText>
                  </ErrorContainer>
                )}

                <FormContainer>
                  <InputGroup>
                    <PremiumInput
                      label="Username"
                      value={values.username}
                      onChangeText={(text) => setValue("username", text)}
                      onBlur={() => setFieldTouched("username", true)}
                      placeholder="Enter your username"
                      error={touched.username ? errors.username : undefined}
                      icon="person-outline"
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />

                    <PremiumInput
                      ref={passwordInputRef}
                      label="Password"
                      value={values.password}
                      onChangeText={(text) => setValue("password", text)}
                      onBlur={() => setFieldTouched("password", true)}
                      placeholder="Enter your password"
                      error={touched.password ? errors.password : undefined}
                      icon="lock-closed-outline"
                      secureTextEntry
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit(handleLoginSubmit)}
                    />
                  </InputGroup>

                  <OptionsContainer>
                    <RememberMeContainer
                      onPress={() => setRememberMe(!rememberMe)}
                      activeOpacity={0.7}
                    >
                      <Checkbox checked={rememberMe}>
                        {rememberMe && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              backgroundColor: "#fff",
                              borderRadius: 2,
                            }}
                          />
                        )}
                      </Checkbox>
                      <RememberMeText>Remember me</RememberMeText>
                    </RememberMeContainer>

                    <TouchableOpacity onPress={() => Haptics.selectionAsync()}>
                      <ForgotPasswordText>Forgot Password?</ForgotPasswordText>
                    </TouchableOpacity>
                  </OptionsContainer>

                  <PremiumButton
                    title={isLoading ? "Signing in..." : "Sign In"}
                    onPress={handleSubmit(handleLoginSubmit)}
                    variant="primary"
                    size="large"
                    fullWidth
                    loading={isLoading}
                    disabled={isLoading}
                    icon="log-in-outline"
                    iconPosition="right"
                  />
                </FormContainer>

                <DividerContainer>
                  <DividerLine />
                  <DividerText>OR</DividerText>
                  <DividerLine />
                </DividerContainer>

                <Footer>
                  <FooterText>Don&apos;t have an account?</FooterText>
                  <TouchableOpacity onPress={() => router.push("/register")}>
                    <RegisterLink>Sign Up</RegisterLink>
                  </TouchableOpacity>
                </Footer>
              </LoginCard>

              <View style={{ marginTop: 24 }}>
                <SystemStatus />
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </ContentContainer>

      {/* Diagnostics Panel (Hidden by default, toggle with Ctrl+D) */}
      {showDiagnostics && (
        <LoginDiagnosticsPanel
          visible={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      )}
    </Container>
  );
}
