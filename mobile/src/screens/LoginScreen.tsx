import { useState } from 'react'
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import {
  Button,
  TextInput,
  Text,
  Card,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper'
import { api } from '../lib/api'
import { tokenStore, type AuthUser } from '../lib/storage'
import { spacing, radius } from '../lib/theme'

export default function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: (user: AuthUser) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('admin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useTheme()

  async function handleLogin() {
    setError(null)
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }
    setLoading(true)
    const res = await api.login(username, password, role)
    setLoading(false)
    if (!res.success || !res.data) {
      setError(res.error || 'Login failed')
      return
    }
    await tokenStore.saveToken(res.data.token)
    await tokenStore.saveUser(res.data.user)
    onAuthenticated(res.data.user)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoText}>SM</Text>
          </View>
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: spacing.md }}>
            School Management
          </Text>
          <Text variant="bodyMedium" style={{ color: '#888', marginTop: 4 }}>
            Sign in to your account
          </Text>
        </View>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="lock" />}
            />
            <Text
              variant="bodySmall"
              style={{ color: '#888', marginBottom: spacing.sm }}
            >
              Login as
            </Text>
            <SegmentedButtons
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
              buttons={[
                { value: 'student', label: 'Student' },
                { value: 'faculty', label: 'Faculty' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            {error && (
              <Text
                style={{
                  color: theme.colors.error,
                  marginTop: spacing.md,
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                {error}
              </Text>
            )}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={{ height: 48 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
            >
              Sign In
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  card: {
    borderRadius: radius.md,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: spacing.lg,
    borderRadius: radius.sm,
  },
})
