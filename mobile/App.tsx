import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View, Text } from 'react-native'
import { PaperProvider } from 'react-native-paper'
import { tokenStore, type AuthUser } from './src/lib/storage'
import { theme } from './src/lib/theme'
import LoginScreen from './src/screens/LoginScreen'
import StudentTabs from './src/navigation/StudentTabs'
import FacultyTabs from './src/navigation/FacultyTabs'
import AdminTabs from './src/navigation/AdminTabs'
import DetailScreen from './src/screens/DetailScreen'
import SettingsScreen from './src/screens/SettingsScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const u = await tokenStore.getUser()
        if (!cancelled) { setUser(u); setReady(true) }
      } catch {
        if (!cancelled) setReady(true)
      }
    })()
    const timer = setTimeout(() => { if (!cancelled) setReady(true) }, 3000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: '#888' }}>Loading...</Text>
      </View>
    )
  }

  const handleLogout = () => setUser(null)
  const handleLogin = (u: AuthUser) => setUser(u)

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              {user.role === 'student' ? (
                <Stack.Screen name="Student">
                  {() => <StudentTabs onLogout={handleLogout} />}
                </Stack.Screen>
              ) : user.role === 'faculty' ? (
                <Stack.Screen name="Faculty">
                  {() => <FacultyTabs onLogout={handleLogout} />}
                </Stack.Screen>
              ) : (
                <Stack.Screen name="Admin">
                  {() => <AdminTabs onLogout={handleLogout} />}
                </Stack.Screen>
              )}
              <Stack.Screen name="Detail" component={DetailScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          ) : (
            <Stack.Screen name="Login">
              {() => <LoginScreen onAuthenticated={handleLogin} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  )
}
