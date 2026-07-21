import { View, StyleSheet } from 'react-native'
import { Card, Text, Button, Divider, useTheme } from 'react-native-paper'
import { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { tokenStore, type AuthUser } from '../lib/storage'
import { useLogout } from '../lib/useLogout'
import { spacing, radius } from '../lib/theme'

export default function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const theme = useTheme()
  const logout = useLogout(onLogout)
  const navigation = useNavigation<any>()

  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
    })()
  }, [])

  if (!user) return null

  const fields = [
    { label: 'Username', value: user.username },
    { label: 'Full Name', value: user.full_name },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
    ...(user.standard ? [{ label: 'Standard', value: user.standard }] : []),
    ...(user.division ? [{ label: 'Division', value: user.division }] : []),
  ]

  const roleColor =
    user.role === 'admin' ? '#1565C0' :
    user.role === 'faculty' ? '#7B1FA2' : '#00897B'

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={{ fontWeight: '700', marginBottom: spacing.md }}>
        Profile
      </Text>
      <Card style={styles.card} mode="elevated">
        <Card.Content>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
              {user.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Divider style={{ marginVertical: spacing.md }} />
          {fields.map((f, i) => (
            <View key={i} style={styles.fieldRow}>
              <Text variant="bodySmall" style={{ color: '#888' }}>{f.label}</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{f.value}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Settings')}
        style={{ marginTop: spacing.md }}
        icon="cog"
      >
        Server Settings
      </Button>
      <Button
        mode="contained"
        buttonColor={theme.colors.error}
        onPress={logout}
        style={{ marginTop: spacing.md }}
        icon="logout"
      >
        Sign Out
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: '#F5F5F5' },
  card: { borderRadius: radius.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
})
