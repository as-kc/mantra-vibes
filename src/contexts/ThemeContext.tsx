import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  MD3LightTheme, 
  MD3DarkTheme, 
  adaptNavigationTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import { 
  DefaultTheme as NavigationLightTheme, 
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  paperTheme: typeof MD3LightTheme;
  navigationTheme: typeof NavigationLightTheme;
};

const THEME_STORAGE_KEY = '@mantra_vibes_theme';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationLightTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const customLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ea',
    primaryContainer: '#bb86fc',
    secondary: '#03dac6',
    secondaryContainer: '#a7ffeb',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    error: '#b00020',
    errorContainer: '#fdeaea',
  },
};

const customDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    primaryContainer: '#3700b3',
    secondary: '#03dac6',
    secondaryContainer: '#00695c',
    background: '#121212',
    surface: '#1e1e1e',
    surfaceVariant: '#2d2d2d',
    error: '#cf6679',
    errorContainer: '#93000a',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const systemColorScheme = useColorScheme();

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  const paperTheme = isDark ? customDarkTheme : customLightTheme;
  const navigationTheme = isDark ? DarkTheme : LightTheme;

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const contextValue: ThemeContextType = {
    themeMode,
    setThemeMode,
    isDark,
    paperTheme,
    navigationTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <PaperProvider theme={paperTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}