import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../../app/staff/home";

jest.mock("expo-haptics", () => ({
    selectionAsync: jest.fn(),
    notificationAsync: jest.fn(),
    impactAsync: jest.fn(),
}));

jest.mock("react-native-modal", () => {
    const React = require("react");
    const { View } = require("react-native");
    return (props: any) => (props.isVisible ? React.createElement(View, { testID: "modal-view" }, props.children) : null);
});

jest.mock("@tanstack/react-query", () => ({
    useQueryClient: jest.fn(() => ({
        invalidateQueries: jest.fn(),
    })),
}));

jest.mock("../../src/hooks/useSessionsQuery", () => ({
    useSessionsQuery: jest.fn(() => ({
        data: { items: [], pagination: { total: 0 } },
        isLoading: false,
        isRefetching: false,
        refetch: jest.fn(),
    })),
}));

// Mocks
jest.mock("../../src/store/scanSessionStore", () => ({
    useScanSessionStore: jest.fn(() => ({
        activeSessionId: null,
        currentFloor: null,
        setFloor: jest.fn(),
    })),
}));

jest.mock("../../src/store/authStore", () => ({
    useAuthStore: jest.fn(() => ({
        user: { username: "staff1" },
    })),
}));

jest.mock("../../src/services/utils/toastService", () => ({
    toastService: {
        show: jest.fn(),
    },
}));

jest.mock("expo-router", () => ({
    router: { push: jest.fn() },
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    }),
    useFocusEffect: jest.fn((cb) => cb()),
    Stack: {
        Screen: jest.fn(() => null),
    },
}));

jest.mock("../../src/context/ThemeContext", () => {
    const mockColors = {
        text: "#F0F6FC",
        textPrimary: "#F0F6FC",
        textSecondary: "#8B949E",
        textTertiary: "#6E7681",
        background: "#0D1117",
        surface: "#161B22",
        surfaceElevated: "#21262D",
        accent: "#58A6FF",
        primary: {
            500: "#3B82F6",
            600: "#2563EB",
            400: "#60A5FA",
        },
        border: "#30363D",
        borderLight: "#30363D",
        glass: "rgba(255,255,255,0.1)",
        success: "#3FB950",
        danger: "#F85149",
        warning: "#D29922",
        info: "#58A6FF",
        muted: "#8B949E",
        card: "#161B22",
        placeholder: "#6E7681",
        disabled: "#484F58",
        overlayPrimary: "rgba(88, 166, 255, 0.1)",
    };
    const mockThemeLegacy = {
        theme: "dark",
        isDark: true,
        colors: mockColors,
        gradients: {
            primary: ["#58A6FF", "#58A6FF"],
            accent: ["#58A6FF", "#58A6FF"],
        },
        spacing: { xs: 4, sm: 8, md: 16, base: 16, lg: 24, xl: 32, xxl: 48 },
        typography: { fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24 } },
        borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, round: 50 },
        shadows: {},
        animations: {},
        componentSizes: { button: { sm: 36, md: 44, lg: 56, xl: 72 } },
        layout: { safeArea: { top: 0, bottom: 34 } },
    };
    const mockTheme = {
        theme: {
            colors: mockColors,
            spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
            radius: { sm: 4, md: 8, lg: 12 },
            typography: { baseSize: 14, scale: 1.125 },
        },
        themeLegacy: mockThemeLegacy,
        isDark: true,
    };
    return {
        useThemeContext: jest.fn(() => mockTheme),
        useThemeContextSafe: jest.fn(() => mockTheme),
        useTheme: jest.fn(() => mockTheme),
    };
});

jest.mock("../../src/services/api/api", () => ({
    getWarehouses: jest.fn().mockResolvedValue([]),
    getSessions: jest.fn().mockResolvedValue([]),
    getZones: jest.fn().mockResolvedValue([]),
}));

describe("HomeScreen", () => {
    it("renders correctly", () => {
        const { getByText } = render(<HomeScreen />);
        expect(getByText("Welcome, staff1")).toBeTruthy();
    });

    // Note: Testing actual floor picker interactions requires deeper mocking of the complex home component state
    // limiting to render test for regression basic check.
});
