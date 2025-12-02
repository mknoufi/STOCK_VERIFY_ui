import { Platform, StyleSheet } from 'react-native';

export const PremiumTheme = {
    colors: {
        background: '#0F172A', // Slate 900
        surface: '#1E293B',    // Slate 800
        surfaceHighlight: '#334155', // Slate 700
        primary: '#3B82F6',    // Blue 500
        primaryDark: '#2563EB', // Blue 600
        secondary: '#10B981',  // Emerald 500
        danger: '#EF4444',     // Red 500
        warning: '#F59E0B',    // Amber 500
        text: {
            primary: '#F8FAFC', // Slate 50
            secondary: '#94A3B8', // Slate 400
            muted: '#64748B',    // Slate 500
            inverse: '#0F172A',
        },
        border: '#334155',     // Slate 700
        overlay: 'rgba(15, 23, 42, 0.8)',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        full: 9999,
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.18,
            shadowRadius: 1.0,
            elevation: 1,
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
};

export const PremiumStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PremiumTheme.colors.background,
    },
    card: {
        backgroundColor: PremiumTheme.colors.surface,
        borderRadius: PremiumTheme.borderRadius.lg,
        padding: PremiumTheme.spacing.md,
        borderWidth: 1,
        borderColor: PremiumTheme.colors.border,
        ...PremiumTheme.shadows.sm,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: PremiumTheme.colors.text.primary,
        letterSpacing: 0.5,
    },
    subTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: PremiumTheme.colors.text.secondary,
    },
    input: {
        backgroundColor: PremiumTheme.colors.background,
        borderRadius: PremiumTheme.borderRadius.md,
        padding: PremiumTheme.spacing.md,
        color: PremiumTheme.colors.text.primary,
        borderWidth: 1,
        borderColor: PremiumTheme.colors.border,
        fontSize: 16,
    },
    button: {
        backgroundColor: PremiumTheme.colors.primary,
        borderRadius: PremiumTheme.borderRadius.md,
        paddingVertical: PremiumTheme.spacing.md,
        paddingHorizontal: PremiumTheme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        ...PremiumTheme.shadows.md,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    badge: {
        paddingHorizontal: PremiumTheme.spacing.sm,
        paddingVertical: 2,
        borderRadius: PremiumTheme.borderRadius.full,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
