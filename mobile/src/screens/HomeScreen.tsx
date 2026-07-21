import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text, Button, ActivityIndicator, useTheme } from 'react-native-paper'
import { tokenStore, type AuthUser } from '../lib/storage'
import { api } from '../lib/api'
import { useLogout } from '../lib/useLogout'
import { spacing, radius } from '../lib/theme'

const STAT_CONFIG: Record<string, { endpoints: string[]; labels: string[]; icons: string[] }> = {
  admin: {
    endpoints: ['/api/students', '/api/faculty', '/api/notices', '/api/fees'],
    labels: ['Students', 'Faculty', 'Notices', 'Fees'],
    icons: ['👨‍🎓', '👩‍🏫', '📢', '💰'],
  },
  faculty: {
    endpoints: ['/api/students', '/api/homework', '/api/notices', '/api/attendance'],
    labels: ['Students', 'Homework', 'Notices', 'Attendance'],
    icons: ['👨‍🎓', '📝', '📢', '✅'],
  },
  student: {
    endpoints: ['/api/notices', '/api/homework', '/api/study-materials'],
    labels: ['Notices', 'Homework', 'Materials'],
    icons: ['📢', '📝', '📚'],
  },
}

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const theme = useTheme()
  const logout = useLogout(onLogout)

  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
      if (u) {
        const cfg = STAT_CONFIG[u.role] || STAT_CONFIG.student
        const results = await Promise.allSettled(
          cfg.endpoints.map((ep) => api.get<any>(ep))
        )
        const s: Record<string, number> = {}
        results.forEach((r, i) => {
          s[cfg.labels[i]] = r.status === 'fulfilled' ? r.value.data?.length || 0 : 0
        })
        setStats(s)
      }
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  const roleColor =
    user?.role === 'admin' ? '#1565C0' :
    user?.role === 'faculty' ? '#7B1FA2' : '#00897B'

  const cfg = STAT_CONFIG[user?.role || 'student']
  const statEntries = Object.entries(stats)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ fontWeight: '700' }}>Dashboard</Text>
        <Button onPress={logout} compact mode="text">Logout</Button>
      </View>

      <Card style={styles.profileCard} mode="elevated">
        <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
              {((user?.full_name || user?.username || 'U')[0]).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text variant="titleLarge" style={{ fontWeight: '700' }}>
              Welcome, {user?.full_name || user?.username}
            </Text>
            <View style={[styles.badge, { backgroundColor: roleColor }]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                {(user?.role || '').toUpperCase()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {statEntries.length > 0 && (
        <View style={styles.statsGrid}>
          {statEntries.map(([label, count], i) => (
            <Card key={label} style={styles.statCard} mode="elevated">
              <Card.Content style={styles.statContent}>
                <Text style={{ fontSize: 28 }}>{cfg?.icons[i] || '📋'}</Text>
                <Text
                  variant="headlineMedium"
                  style={{ fontWeight: '700', color: theme.colors.primary, marginTop: spacing.xs }}
                >
                  {count}
                </Text>
                <Text variant="bodySmall" style={{ color: '#888', marginTop: 2 }}>{label}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      <Card style={styles.quickActions} mode="elevated">
        <Card.Content>
          <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            Quick Tips
          </Text>
          <Text variant="bodySmall" style={{ color: '#666', lineHeight: 18 }}>
            • Tap any item in a list to view full details{'\n'}
            • Pull down to refresh lists{'\n'}
            • Use the search bar to find records
          </Text>
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: '#F5F5F5' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileCard: { marginBottom: spacing.md, borderRadius: radius.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: radius.md,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  quickActions: {
    borderRadius: radius.md,
  },
})
