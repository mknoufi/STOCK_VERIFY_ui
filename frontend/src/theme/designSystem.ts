// Design System for Premium Theme
export const PremiumTheme = {
  // Colors
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    accent: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8',
    success: '#28a745',

    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      dark: '#121212',
      surface: '#ffffff',
    },

    // Text colors
    text: {
      primary: '#212529',
      secondary: '#6c757d',
      light: '#ffffff',
      muted: '#868e96',
    },

    // Border colors
    border: {
      light: '#dee2e6',
      medium: '#ced4da',
      dark: '#343a40',
    },

    // Status colors
    status: {
      active: '#28a745',
      inactive: '#6c757d',
      pending: '#ffc107',
      error: '#dc3545',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },

    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 50,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },

  // Component specific styles
  components: {
    button: {
      primary: {
        backgroundColor: '#007bff',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
      secondary: {
        backgroundColor: '#6c757d',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
    },

    input: {
      default: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
      },
      focused: {
        borderColor: '#007bff',
        borderWidth: 2,
      },
    },

    card: {
      default: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
      },
    },
  },
};

export type PremiumThemeType = typeof PremiumTheme;
