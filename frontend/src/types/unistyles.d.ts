import { AppTheme } from '@/theme/themes';

declare module 'react-native-unistyles' {
    export interface UnistylesThemes {
        light: AppTheme;
        dark: AppTheme;
        premium: AppTheme;
        highContrast: AppTheme;
    }
}
