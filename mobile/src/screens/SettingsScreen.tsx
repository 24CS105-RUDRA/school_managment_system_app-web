import { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import {
  Card,
  Text,
  Button,
  TextInput,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper'
import { settingsStore } from '../lib/settings'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

export default function SettingsScreen({ navigation }: any) {
  const [url, setUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const theme = useTheme()

  useEffect(() => {
    ;(async () => {
      const u = await settingsStore.getApiUrl()
      setUrl(u)
      setSavedUrl(u)
    })()
  }, [])

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const res = await api.testConnection(url)
    setTesting(false)
    if (res.success) {
      setTestResult({ ok: true, msg: 'Server is reachable! ✓' })
    } else {
      setTestResult({ ok: false, msg: res.error || 'Connection failed' })
    }
  }

  async function handleSave() {
    setSaving(true)
    const trimmed = url.trim().replace(/\/+$/, '')
    await settingsStore.setApiUrl(trimmed)
    setUrl(trimmed)
    setSavedUrl(trimmed)
    setTestResult({ ok: true, msg: 'Server URL saved! Re-login to apply.' })
    setSaving(false)
  }

  const hasChanges = url.trim().replace(/\/+$/, '') !== savedUrl

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>
          Back
        </Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>
          Server Settings
        </Text>
      </View>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="bodySmall" style={{ color: '#888', marginBottom: spacing.xs }}>
            API Server URL
          </Text>
          <TextInput
            mode="outlined"
            value={url}
            onChangeText={(v) => { setUrl(v); setTestResult(null) }}
            placeholder="http://192.168.137.85:8080"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
            left={<TextInput.Icon icon="server" />}
          />
          <Text variant="bodySmall" style={{ color: '#999', marginTop: spacing.xs, lineHeight: 16 }}>
            Enter the IP address and port of your API server.{'\n'}
            Your friend must be on the same Wi-Fi network.
          </Text>

          {testResult && (
            <Card
              style={{
                marginTop: spacing.md,
                backgroundColor: testResult.ok ? '#E8F5E9' : '#FFEBEE',
                borderRadius: radius.sm,
              }}
              mode="flat"
            >
              <Card.Content>
                <Text
                  variant="bodyMedium"
                  style={{ color: testResult.ok ? '#2E7D32' : '#C62828', fontWeight: '500' }}
                >
                  {testResult.msg}
                </Text>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleTest}
          loading={testing}
          disabled={testing || !url.trim()}
          style={styles.actionButton}
          icon="wifi"
        >
          Test Connection
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !hasChanges}
          style={styles.actionButton}
          icon="content-save"
        >
          Save
        </Button>
      </View>

      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <Text variant="bodySmall" style={{ color: '#888', marginBottom: spacing.sm }}>
            Need help?
          </Text>
          <Text variant="bodySmall" style={{ color: '#666', lineHeight: 18 }}>
            1. Make sure your API server is running{'\n'}
            2. Find your Mac's IP: System Settings → Network → Wi-Fi{'\n'}
            3. Enter the IP with port :8080{'\n'}
            4. Tap "Test Connection" to verify{'\n'}
            5. Tap "Save" and re-login
          </Text>
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  card: { borderRadius: radius.md, marginBottom: spacing.md },
  input: { backgroundColor: '#fff', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionButton: { flex: 1 },
})
