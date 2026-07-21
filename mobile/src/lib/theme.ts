import { MD3LightTheme } from 'react-native-paper'

export const theme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0',
    primaryContainer: '#D1E4FF',
    secondary: '#7B1FA2',
    secondaryContainer: '#F3E5F5',
    tertiary: '#00897B',
    tertiaryContainer: '#B2DFDB',
    surface: '#FAFAFA',
    background: '#F5F5F5',
    error: '#D32F2F',
    errorContainer: '#FFEBEE',
    outline: '#E0E0E0',
  },
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
export const radius = { sm: 8, md: 12, lg: 16, xl: 24 }
