/**
 * Staff Layout - Premium tab navigation with animated tab bar
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  modernColors,
  modernSpacing,
} from '../../src/styles/modernDesignSystem';

const AnimatedIcon = Animated.createAnimatedComponent(View);

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, focused, color }) => {
  const scale = useSharedValue(focused ? 1.15 : 1);
  const translateY = useSharedValue(focused ? -2 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, {
      damping: 15,
      stiffness: 200,
    });
    translateY.value = withSpring(focused ? -2 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [focused, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <AnimatedIcon style={animatedStyle}>
      <Ionicons name={name} size={24} color={color} />
    </AnimatedIcon>
  );
};

const TabBarBackground = () => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
    );
  }
  return <View style={[StyleSheet.absoluteFill, styles.androidTabBarBg]} />;
};

export default function StaffLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: modernColors.primary[400],
        tabBarInactiveTintColor: modernColors.text.tertiary,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync();
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? 'home' : 'home-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? 'scan' : 'scan-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? 'time' : 'time-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon
              name={focused ? 'settings' : 'settings-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  androidTabBarBg: {
    backgroundColor: modernColors.background.paper,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  tabBarItem: {
    paddingTop: 4,
  },
});
