import { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Card, Text, Button, Chip, ActivityIndicator, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

export default function StudentAttendanceDetailScreen({ route, navigation }: any) {
  const { studentId, studentName } = route.params
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    ;(async () => {
      const res = await api.get<any[]>(`/api/attendance/student/${studentId}`)
      setLoading(false)
      if (!res.success) { setError(res.error || 'Failed to load'); return }
      setAttendance(res.data || [])
    })()
  }, [studentId])

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const absentCount = attendance.filter((a) => a.status === 'absent').length
  const lateCount = attendance.filter((a) => a.status === 'late').length
  const total = attendance.length
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }} numberOfLines={1}>
          {studentName || 'Student'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Summary card */}
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.md }}>
                Attendance Summary ({total} days)
              </Text>
              <View style={styles.statRow}>
                <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.statValue, { color: '#2E7D32' }]}>{presentCount}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
                  <Text style={[styles.statValue, { color: '#C62828' }]}>{absentCount}</Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.statValue, { color: '#E65100' }]}>{lateCount}</Text>
                  <Text style={styles.statLabel}>Late</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={[styles.statValue, { color: '#1565C0' }]}>{pct}%</Text>
                  <Text style={styles.statLabel}>Rate</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Attendance history */}
          <Text variant="titleSmall" style={{ fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm }}>
            History
          </Text>
          {attendance.length === 0 ? (
            <Text style={{ color: '#888', textAlign: 'center' }}>No attendance records found</Text>
          ) : (
            attendance.map((a: any) => (
              <Card key={a.id} style={styles.historyCard} mode="elevated">
                <Card.Content style={styles.historyRow}>
                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {a.attendance_date ? new Date(a.attendance_date).toLocaleDateString('en-IN') : 'Unknown date'}
                  </Text>
                  <Chip
                    mode="flat" compact
                    style={{
                      backgroundColor: a.status === 'present' ? '#C8E6C9' : a.status === 'absent' ? '#FFCDD2' : '#FFE0B2',
                    }}
                    textStyle={{ fontWeight: '600', fontSize: 11 }}
                  >
                    {a.status?.toUpperCase() || 'NO RECORD'}
                  </Chip>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.md },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  historyCard: { marginBottom: spacing.xs, borderRadius: radius.md },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
})
