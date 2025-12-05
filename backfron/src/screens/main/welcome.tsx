import React from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import styled from "@emotion/native";
import { useTheme } from "@emotion/react";

import { useAuthStore } from "../../store/authStore";
import { PremiumButton } from "../../components/premium/PremiumButton";

// Styled Components
const Container = styled.View`
  flex: 1;
  background-color: #000;
  align-items: center;
`;

const BackgroundGradient = styled(LinearGradient)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const Content = styled.View<{ isDesktop: boolean }>`
  flex: 1;
  justify-content: space-between;
  padding-vertical: ${Platform.OS === "ios" ? "60px" : "40px"};
  padding-horizontal: ${(props) => props.theme.spacing.lg}px;
  z-index: 1;
  width: 100%;
  max-width: ${(props) => (props.isDesktop ? "600px" : "100%")};
`;

const DecorativeCircle1 = styled.View`
  position: absolute;
  top: -100px;
  left: -100px;
  width: 300px;
  height: 300px;
  border-radius: 150px;
  background-color: ${(props) => props.theme.colors.primary[500]};
  opacity: 0.1;
  transform: scale(1.5);
`;

const DecorativeCircle2 = styled.View`
  position: absolute;
  bottom: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
  border-radius: 100px;
  background-color: ${(props) => props.theme.colors.secondary[500]};
  opacity: 0.1;
  transform: scale(1.5);
`;

const Header = styled(Animated.View)`
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.xl}px;
`;

const LogoContainer = styled.View`
  margin-bottom: ${(props) => props.theme.spacing.lg}px;
  align-items: center;
  justify-content: center;
`;

const LogoBackground = styled(LinearGradient)`
  width: 120px;
  height: 120px;
  border-radius: 40px;
  justify-content: center;
  align-items: center;
  transform: rotate(-5deg);
  shadow-color: ${(props) => props.theme.colors.primary[500]};
  shadow-offset: 0px 10px;
  shadow-opacity: 0.3;
  shadow-radius: 20px;
  elevation: 10;
  z-index: 2;
`;

const LogoGlow = styled.View`
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 40px;
  background-color: ${(props) => props.theme.colors.primary[500]};
  opacity: 0.3;
  transform: scale(1.2) rotate(-5deg);
  z-index: 1;
`;

const Title = styled.Text`
  font-size: 40px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
  text-align: center;
  letter-spacing: -1px;
  text-shadow-color: rgba(0, 0, 0, 0.5);
  text-shadow-offset: 0px 2px;
  text-shadow-radius: 4px;
`;

const Subtitle = styled.Text`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
  text-align: center;
  font-weight: 500;
`;

const VersionBadge = styled.View`
  padding-horizontal: 12px;
  padding-vertical: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.2);
`;

const VersionText = styled.Text`
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 600;
`;

const FeaturesContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
  margin-top: ${(props) => props.theme.spacing.xl}px;
`;

const FeatureWrapper = styled(Animated.View)`
  flex: 1;
`;

const StyledBlurView = styled(BlurView)`
  padding: 16px;
  border-radius: 20px;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  height: 110px;
  justify-content: center;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.1);
`;

const IconCircle = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: rgba(76, 175, 80, 0.15);
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;
`;

const FeatureText = styled.Text`
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
`;

const Actions = styled(Animated.View)`
  gap: 16px;
  margin-top: ${(props) => props.theme.spacing.xl}px;
`;

const Footer = styled(Animated.View)`
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.lg}px;
`;

const FooterText = styled.Text`
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
`;

const FooterSubtext = styled.Text`
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
  margin-top: 4px;
`;

const FeatureCard = ({
  icon,
  title,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  delay: number;
}) => {
  const theme = useTheme();
  return (
    <FeatureWrapper entering={FadeInDown.delay(delay).springify()}>
      <StyledBlurView intensity={20} tint="light">
        <IconCircle>
          <Ionicons name={icon} size={24} color={theme.colors.primary[500]} />
        </IconCircle>
        <FeatureText>{title}</FeatureText>
      </StyledBlurView>
    </FeatureWrapper>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const isDesktop = width >= 1024;

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (!isLoading && user) {
      if (__DEV__)
        console.log("🔄 [WELCOME] User already logged in, redirecting:", {
          role: user.role,
        });
      if (
        Platform.OS === "web" &&
        (user.role === "supervisor" || user.role === "admin")
      ) {
        router.replace("/admin/metrics" as any);
      } else if (user.role === "supervisor" || user.role === "admin") {
        router.replace("/supervisor/dashboard" as any);
      } else {
        router.replace("/staff/home" as any);
      }
    }
  }, [user, isLoading, router]);

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <Container>
      <StatusBar style="light" />
      <BackgroundGradient colors={["#121212", "#0A0A0A", "#000000"]} />

      {/* Decorative Background Elements */}
      <DecorativeCircle1 />
      <DecorativeCircle2 />

      <Content isDesktop={isDesktop}>
        {/* Header Section */}
        <Header entering={FadeInUp.duration(1000).springify()}>
          <LogoContainer>
            <LogoBackground
              colors={theme.colors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="cube-outline" size={64} color="#fff" />
            </LogoBackground>
            <LogoGlow />
          </LogoContainer>

          <Title>Lavanya E-Mart</Title>
          <Subtitle>Stock Verification System</Subtitle>
          <VersionBadge>
            <VersionText>v2.0 Premium</VersionText>
          </VersionBadge>
        </Header>

        {/* Features Grid */}
        <FeaturesContainer>
          <FeatureCard
            icon="barcode-outline"
            title="Smart Scanning"
            delay={400}
          />
          <FeatureCard icon="sync-outline" title="Live Sync" delay={600} />
          <FeatureCard
            icon="stats-chart-outline"
            title="Analytics"
            delay={800}
          />
        </FeaturesContainer>

        {/* Action Buttons */}
        <Actions entering={FadeInDown.delay(1000).springify()}>
          <PremiumButton
            title="Get Started"
            onPress={() => handlePress("/login")}
            variant="primary"
            size="large"
            icon="arrow-forward"
            iconPosition="right"
            fullWidth
          />

          <PremiumButton
            title="Create Account"
            onPress={() => handlePress("/register")}
            variant="outline"
            size="large"
            fullWidth
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
            textStyle={{ color: "#fff" }}
          />
        </Actions>

        {/* Footer */}
        <Footer entering={FadeInDown.delay(1200)}>
          <FooterText>© 2024 Lavanya E-Mart</FooterText>
          <FooterSubtext>Powered by Stock Verify</FooterSubtext>
        </Footer>
      </Content>
    </Container>
  );
}
