import { MD3LightTheme } from 'react-native-paper'

export const theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F4C81',
    primaryContainer: '#E8F0FE',
    secondary: '#4F9DDE',
    secondaryContainer: '#E3F0FA',
    tertiary: '#00897B',
    tertiaryContainer: '#B2DFDB',
    surface: '#FFFFFF',
    background: '#F8FAFC',
    error: '#D32F2F',
    errorContainer: '#FFEBEE',
    outline: '#E5E7EB',
  },
}

export const colors = {
  primary: '#0F4C81',
  secondary: '#4F9DDE',
  background: '#FFFFFF',
  section: '#F8FAFC',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  cardBorder: '#E5E7EB',
  white: '#FFFFFF',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 20, xl: 24, xxl: 32 }
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 22, pill: 28, full: 9999 }
