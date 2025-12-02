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
