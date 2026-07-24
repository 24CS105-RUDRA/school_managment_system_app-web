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
import CreateStudentScreen from './src/screens/CreateStudentScreen'
import CreateFacultyScreen from './src/screens/CreateFacultyScreen'
import CreateHomeworkScreen from './src/screens/CreateHomeworkScreen'
import CreateNoticeScreen from './src/screens/CreateNoticeScreen'
import CreateFeeScreen from './src/screens/CreateFeeScreen'
import CreateMaterialScreen from './src/screens/CreateMaterialScreen'
import CreateGalleryScreen from './src/screens/CreateGalleryScreen'
import MarkAttendanceScreen from './src/screens/MarkAttendanceScreen'
import FeePayScreen from './src/screens/FeePayScreen'
import HomeworkSubmitScreen from './src/screens/HomeworkSubmitScreen'
import StudentFeesScreen from './src/screens/StudentFeesScreen'

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
              <Stack.Screen name="CreateStudent" component={CreateStudentScreen} />
              <Stack.Screen name="CreateFaculty" component={CreateFacultyScreen} />
              <Stack.Screen name="CreateHomework" component={CreateHomeworkScreen} />
              <Stack.Screen name="CreateNotice" component={CreateNoticeScreen} />
              <Stack.Screen name="CreateFee" component={CreateFeeScreen} />
              <Stack.Screen name="CreateMaterial" component={CreateMaterialScreen} />
              <Stack.Screen name="CreateGallery" component={CreateGalleryScreen} />
              <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
              <Stack.Screen name="FeePay" component={FeePayScreen} />
              <Stack.Screen name="HomeworkSubmit" component={HomeworkSubmitScreen} />
              <Stack.Screen name="StudentFees" component={StudentFeesScreen} />
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
