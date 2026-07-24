import { useState, useEffect } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text, Button, TextInput, useTheme, ActivityIndicator, Chip } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokenStore } from '../lib/storage'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const DIVISIONS = ['A','B','C','D','E']
const SUBJECTS = ['Maths','Science','English','Hindi','Sanskrit','Social Studies','Computer','Physics','Chemistry','Biology']

type Status = 'present' | 'absent' | 'late'

export default function MarkAttendanceScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null)
  const [loadingFaculty, setLoadingFaculty] = useState(true)
  const [standard, setStandard] = useState('')
  const [division, setDivision] = useState('')
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<any[]>([])
  const [records, setRecords] = useState<Record<string, Status>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'config' | 'mark'>('config')
  const [error, setError] = useState('')
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
      if (u && u.role === 'faculty') {
        const res = await api.get<any[]>('/api/faculty')
        if (res.success) {
          const facultyList = res.data || []
          const match = facultyList.find((f: any) => f.user_id === u.id)
          if (match && match.assigned_standard) {
            setStandard(match.assigned_standard)
            setDivision(match.assigned_division || '')
            setLoadingFaculty(false)
            return
          }
        }
      }
      setLoadingFaculty(false)
    })()
  }, [])

  const loadStudents = async () => {
    if (!standard) { setError('Select a standard'); return }
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ standard })
    if (division) params.append('division', division)
    const res = await api.get<any[]>(`/api/students?${params.toString()}`)
    setLoading(false)
    if (!res.success) { setError(res.error || 'Failed to load students'); return }
    const list = res.data || []
    setStudents(list)
    const initial: Record<string, Status> = {}
    list.forEach((s: any) => { initial[s.id] = 'present' })
    setRecords(initial)
    setStep('mark')
  }

  const toggleStatus = (studentId: string) => {
    setRecords((prev) => {
      const cur = prev[studentId] || 'present'
      const next: Status = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present'
      return { ...prev, [studentId]: next }
    })
  }

  const submitAttendance = async () => {
    setSubmitting(true)
    setError('')
    const attendance_records = Object.entries(records).map(([student_id, status]) => ({
      student_id,
      status,
    }))
    const res = await api.post('/api/attendance', {
      standard,
      division: division || undefined,
      attendance_date: date,
      subject: subject || 'General',
      attendance_records,
    })
    setSubmitting(false)
    if (!res.success) { setError(res.error || 'Failed to submit'); return }
    navigation.goBack()
  }

  if (loadingFaculty) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  const isFaculty = user?.role === 'faculty'

  if (step === 'config') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
          <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>Mark Attendance</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {error ? (
            <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginBottom: spacing.md }]}>
              <Card.Content><Text style={{ color: theme.colors.error }}>{error}</Text></Card.Content>
            </Card>
          ) : null}

          <Text variant="bodySmall" style={styles.label}>Standard *</Text>
          {isFaculty && standard ? (
            <Card style={[styles.card, { backgroundColor: '#E8F0FE', marginBottom: spacing.md }]}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.primary }}>
                  Your assigned class: Standard {standard}{division ? ` - ${division}` : ''}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={styles.optionsRow}>
              {STANDARDS.map((s) => (
                <TouchableOpacity
                  key={s} onPress={() => { setStandard(s); setError('') }}
                  style={[styles.optionChip, standard === s && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                >
                  <Text style={[styles.optionChipText, standard === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!isFaculty && (
            <>
              <Text variant="bodySmall" style={[styles.label, { marginTop: spacing.md }]}>Division</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  onPress={() => setDivision('')}
                  style={[styles.optionChip, !division && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                >
                  <Text style={[styles.optionChipText, !division && { color: '#fff' }]}>All</Text>
                </TouchableOpacity>
                {DIVISIONS.map((d) => (
                  <TouchableOpacity
                    key={d} onPress={() => setDivision(d)}
                    style={[styles.optionChip, division === d && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  >
                    <Text style={[styles.optionChipText, division === d && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text variant="bodySmall" style={[styles.label, { marginTop: spacing.md }]}>Subject</Text>
          <View style={styles.optionsRow}>
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s} onPress={() => setSubject(s)}
                style={[styles.optionChip, subject === s && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.optionChipText, subject === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            mode="outlined"
            label="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            style={[styles.input, { marginTop: spacing.md }]}
            outlineStyle={{ borderRadius: radius.md }}
          />

          <Button
            mode="contained"
            onPress={loadStudents}
            loading={loading}
            disabled={loading}
            style={{ marginTop: spacing.lg, borderRadius: radius.md }}
            contentStyle={{ paddingVertical: 6 }}
          >
            {loading ? 'Loading...' : 'Load Students'}
          </Button>
        </ScrollView>
      </View>
    )
  }

  const presentCount = Object.values(records).filter((s) => s === 'present').length
  const absentCount = Object.values(records).filter((s) => s === 'absent').length
  const lateCount = Object.values(records).filter((s) => s === 'late').length

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>
          Attendance — Std {standard}{division ? ` ${division}` : ''}
        </Text>
      </View>
      <View style={styles.summary}>
        <Chip style={{ backgroundColor: '#C8E6C9' }} textStyle={{ fontSize: 12 }}>Present: {presentCount}</Chip>
        <Chip style={{ backgroundColor: '#FFCDD2' }} textStyle={{ fontSize: 12 }}>Absent: {absentCount}</Chip>
        <Chip style={{ backgroundColor: '#FFE0B2' }} textStyle={{ fontSize: 12 }}>Late: {lateCount}</Chip>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        {error ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginBottom: spacing.md }]}>
            <Card.Content><Text style={{ color: theme.colors.error }}>{error}</Text></Card.Content>
          </Card>
        ) : null}
        {students.map((s: any) => {
          const status = records[s.id] || 'present'
          const statusColor = status === 'present' ? '#C8E6C9' : status === 'absent' ? '#FFCDD2' : '#FFE0B2'
          return (
            <TouchableOpacity key={s.id} onPress={() => toggleStatus(s.id)} activeOpacity={0.7}>
              <Card style={[styles.studentCard, { borderLeftWidth: 4, borderLeftColor: status === 'present' ? '#4CAF50' : status === 'absent' ? '#F44336' : '#FF9800' }]} mode="elevated">
                <Card.Content style={styles.studentRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }}>{s.student_name || s.full_name || s.id.slice(0, 8)}</Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>Roll: {s.roll_number || '-'} | {s.phone_number || ''}</Text>
                  </View>
                  <Chip mode="flat" compact style={{ backgroundColor: statusColor }} textStyle={{ fontWeight: '600', fontSize: 12 }}>
                    {status.toUpperCase()}
                  </Chip>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      <View style={styles.bottomBar}>
        <Button mode="contained" onPress={submitAttendance} loading={submitting} disabled={submitting}>
          {submitting ? 'Saving...' : `Save Attendance (${students.length} students)`}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.md },
  label: { color: '#666', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  optionChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  input: { backgroundColor: '#fff', fontSize: 14 },
  summary: {
    flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  studentCard: { marginBottom: spacing.sm, borderRadius: radius.md },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  bottomBar: {
    padding: spacing.md, borderTopWidth: 1, borderTopColor: '#E0E0E0', backgroundColor: '#fff',
  },
})
