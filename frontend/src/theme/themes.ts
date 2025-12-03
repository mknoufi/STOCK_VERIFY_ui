// Experimental Unistyles theme definitions
// Keep minimal for POC; expand tokens after evaluation

export type AppTheme = {
  colors: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    success: string;
    danger: string;
    warning: string;
    border: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number };
  typography: { baseSize: number; scale: number };
};

export const themes: Record<string, AppTheme> = {
  light: {
    colors: {
      background: '#FFFFFF',
      surface: '#F7F9FA',
      text: '#1A1D21',
      muted: '#6B6F76',
      accent: '#007AFF',
      success: '#2E7D32',
      danger: '#D32F2F',
      warning: '#ED6C02',
      border: '#E0E3E7',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 4, md: 8, lg: 12 },
    typography: { baseSize: 14, scale: 1.125 },
  },
  dark: {
    colors: {
      background: '#121212',
      surface: '#1E1E1E',
      text: '#E0E0E0',
      muted: '#A0A0A0',
      accent: '#BB86FC',
      success: '#03DAC6',
      danger: '#CF6679',
      warning: '#FFB74D',
      border: '#333333',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 4, md: 8, lg: 12 },
    typography: { baseSize: 14, scale: 1.125 },
  },
  premium: {
    colors: {
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      muted: '#94A3B8',
      accent: '#38BDF8',
      success: '#4ADE80',
      danger: '#F87171',
      warning: '#FBBF24',
      border: '#334155',
    },
    spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 26 },
    radius: { sm: 6, md: 12, lg: 16 },
    typography: { baseSize: 15, scale: 1.2 },
  },
  highContrast: {
    colors: {
      background: '#000000',
      surface: '#111418',
      text: '#FFFFFF',
      muted: '#B0B6BD',
      accent: '#4FC3F7',
      success: '#81C784',
      danger: '#EF5350',
      warning: '#FFB74D',
      border: '#2A2F36',
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    radius: { sm: 4, md: 8, lg: 12 },
    typography: { baseSize: 15, scale: 1.15 },
  },
};
