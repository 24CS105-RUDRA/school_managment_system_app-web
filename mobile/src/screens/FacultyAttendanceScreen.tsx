import { useState, useEffect, useCallback } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { Card, Text, Button, TextInput, useTheme, ActivityIndicator, Chip, Searchbar, Divider } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokenStore } from '../lib/storage'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

const SUBJECTS = ['Maths','Science','English','Hindi','Sanskrit','Social Studies','Computer','Physics','Chemistry','Biology']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export default function FacultyAttendanceScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null)
  const [facultyInfo, setFacultyInfo] = useState<any>(null)
  const [standard, setStandard] = useState('')
  const [division, setDivision] = useState('')
  const [subject, setSubject] = useState('General')
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [students, setStudents] = useState<any[]>([])
  const [records, setRecords] = useState<Record<string, string>>({})
  const [existingAttendance, setExistingAttendance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'loading' | 'mark' | 'view' | 'no-class'>('loading')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState<any>(null)
  const [showMonthly, setShowMonthly] = useState(false)
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const todayStr = formatDate(new Date())

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDate(yesterday)

  const quickDates = [
    { label: 'Today', value: todayStr },
    { label: 'Yesterday', value: yesterdayStr },
  ]

  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
      if (u?.role === 'faculty') {
        const res = await api.get<any[]>('/api/faculty')
        if (res.success) {
          const match = (res.data || []).find((f: any) => f.user_id === u.id)
          if (match) {
            setFacultyInfo(match)
            if (match.assigned_standard) {
              setStandard(match.assigned_standard)
              setDivision(match.assigned_division || '')
            }
          }
        }
      }
    })()
  }, [])

  const loadForDate = useCallback(async (date: string, std?: string, div?: string) => {
    const s = std || standard
    const d = div || division
    if (!s) { setMode('no-class'); setLoading(false); return }

    setLoading(true)
    setError('')
    setExistingAttendance(null)

    // Fetch students
    const params = new URLSearchParams({ standard: s })
    if (d) params.append('division', d)
    const studentsRes = await api.get<any[]>(`/api/students?${params.toString()}`)
    if (!studentsRes.success) { setError(studentsRes.error || 'Failed to load students'); setLoading(false); return }

    const studentList = studentsRes.data || []
    setStudents(studentList)

    // Check existing attendance for this date
    const classParams = new URLSearchParams({ date, standard: s })
    if (d) classParams.append('division', d)
    const attRes = await api.get<any[]>(`/api/attendance/class?${classParams.toString()}`)
    if (attRes.success && attRes.data && attRes.data.length > 0) {
      const attDoc = attRes.data[0]
      setExistingAttendance(attDoc)
      const recMap: Record<string, string> = {}
      ;(attDoc.attendance_records || []).forEach((r: any) => {
        recMap[r.student_id] = r.status
      })
      setRecords(recMap)
      setMode('view')
    } else {
      // No existing attendance → mark mode
      const initial: Record<string, string> = {}
      studentList.forEach((s: any) => { initial[s.id] = 'present' })
      setRecords(initial)
      setExistingAttendance(null)
      setMode('mark')
    }

    setLoading(false)
  }, [standard, division])

  useEffect(() => {
    if (facultyInfo || (standard && !facultyInfo)) {
      loadForDate(selectedDate)
    } else if (standard) {
      loadForDate(selectedDate)
    }
  }, [selectedDate, standard, division, facultyInfo])

  const loadMonthlyStats = async () => {
    setShowMonthly(true)
    const s = standard
    const d = division
    if (!s) return

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const totalDays = daysInMonth(year, month)

    const startDate = formatDate(new Date(year, month, 1))
    const endDate = formatDate(new Date(year, month, totalDays))

    const params = new URLSearchParams({ standard: s, start: startDate, end: endDate })
    if (d) params.append('division', d)

    // Fetch ALL attendance docs for this month
    const attRes = await api.get<any[]>('/api/attendance')
    if (!attRes.success || !attRes.data) return

    const monthDocs = attRes.data.filter((a: any) => {
      const ad = a.attendance_date
      return ad >= startDate && ad <= endDate && a.standard === s && (!d || a.division === d)
    })

    const stats: Record<string, { present: number; absent: number; late: number; total: number }> = {}
    students.forEach((st: any) => {
      stats[st.id] = { present: 0, absent: 0, late: 0, total: 0 }
    })

    monthDocs.forEach((doc: any) => {
      ;(doc.attendance_records || []).forEach((r: any) => {
        if (stats[r.student_id]) {
          stats[r.student_id].total++
          if (r.status === 'present') stats[r.student_id].present++
          else if (r.status === 'absent') stats[r.student_id].absent++
          else if (r.status === 'late') stats[r.student_id].late++
        }
      })
    })

    setMonthlyStats({ docs: monthDocs.length, stats, totalDays, month: MONTHS[month], year })
  }

  const toggleStatus = (studentId: string) => {
    if (mode === 'view') return
    setRecords((prev) => {
      const cur = prev[studentId] || 'present'
      const next = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present'
      return { ...prev, [studentId]: next }
    })
  }

  const markAllPresent = () => {
    const all: Record<string, string> = {}
    students.forEach((s: any) => { all[s.id] = 'present' })
    setRecords(all)
  }

  const submitAttendance = async () => {
    setSubmitting(true)
    setError('')
    const attendance_records = Object.entries(records).map(([student_id, status]) => ({
      student_id,
      status: status === 'present' ? 'present' : status === 'absent' ? 'absent' : 'late',
    }))
    const res = await api.post('/api/attendance', {
      standard,
      division: division || undefined,
      attendance_date: selectedDate,
      subject,
      attendance_records,
    })
    setSubmitting(false)
    if (!res.success) { setError(res.error || 'Failed to submit'); return }
    // Reload to show view mode
    loadForDate(selectedDate)
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadForDate(selectedDate).then(() => setRefreshing(false))
  }, [selectedDate, loadForDate])

  if (mode === 'no-class') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#888', marginBottom: spacing.md }}>No class assigned to you</Text>
        <Text variant="bodySmall" style={{ color: '#aaa', textAlign: 'center' }}>Contact the admin to set your assigned class</Text>
        <Button mode="contained" style={{ marginTop: spacing.lg }} onPress={() => navigation.goBack()}>Back</Button>
      </View>
    )
  }

  const absentCount = Object.values(records).filter((s) => s !== 'present').length
  const totalStudents = students.length

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} mode="text" compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1, marginLeft: spacing.sm }}>Attendance</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        {/* Class info */}
        <View style={styles.classInfoRow}>
          <Chip style={{ backgroundColor: theme.colors.primaryContainer }}>
            Std {standard}{division ? ` - ${division}` : ''}
          </Chip>
          <Chip style={{ backgroundColor: '#E8F5E9' }}>{subject}</Chip>
        </View>

        {/* Date selector */}
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Select Date</Text>
          <View style={styles.quickDatesRow}>
            {quickDates.map((qd) => (
              <TouchableOpacity
                key={qd.value}
                onPress={() => setSelectedDate(qd.value)}
                style={[styles.quickDateChip, selectedDate === qd.value && { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.quickDateText, selectedDate === qd.value && { color: '#fff' }]}>{qd.label}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              mode="outlined"
              value={selectedDate}
              onChangeText={(v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v.length <= 10) setSelectedDate(v) }}
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
              outlineStyle={{ borderRadius: radius.md }}
              dense
            />
          </View>
        </View>

        {error ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginHorizontal: spacing.md, marginBottom: spacing.md }]}>
            <Card.Content><Text style={{ color: theme.colors.error }}>{error}</Text></Card.Content>
          </Card>
        ) : null}

        {loading ? (
          <View style={[styles.center, { paddingVertical: spacing.xxl }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : mode === 'mark' ? (
          <>
            {/* Mark mode */}
            <View style={styles.section}>
              <View style={styles.summaryRow}>
                <Text variant="titleSmall" style={styles.sectionTitle}>Mark Attendance</Text>
                <View style={styles.summaryChips}>
                  <Chip compact style={{ backgroundColor: '#C8E6C9' }} textStyle={{ fontSize: 11 }}>Present: {totalStudents - absentCount}</Chip>
                  <Chip compact style={{ backgroundColor: '#FFCDD2' }} textStyle={{ fontSize: 11 }}>Absent: {absentCount}</Chip>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <Button mode="text" compact icon="check-all" onPress={markAllPresent}>All Present</Button>
              </View>
            </View>

            {students.map((s: any) => {
              const status = records[s.id] || 'present'
              const isAbsent = status !== 'present'
              return (
                <TouchableOpacity key={s.id} onPress={() => toggleStatus(s.id)} activeOpacity={0.7}>
                  <Card style={[styles.studentCard, isAbsent && styles.absentCard]} mode="elevated">
                    <Card.Content style={styles.studentRow}>
                      <View style={styles.studentInfo}>
                        <Text variant="titleSmall" style={{ fontWeight: '600' }}>{s.student_name || s.full_name || s.id.slice(0, 8)}</Text>
                        <Text variant="bodySmall" style={{ color: '#888' }}>Roll: {s.roll_number || '-'}</Text>
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: isAbsent ? '#F44336' : '#4CAF50' }]} />
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            })}

            <Button
              mode="contained"
              onPress={submitAttendance}
              loading={submitting}
              disabled={submitting}
              style={styles.submitBtn}
              contentStyle={{ paddingVertical: 8 }}
            >
              {submitting ? 'Saving...' : `Send Attendance (${totalStudents} students)`}
            </Button>
          </>
        ) : mode === 'view' && existingAttendance ? (
          <>
            {/* View mode */}
            <View style={styles.section}>
              <View style={styles.summaryRow}>
                <Text variant="titleSmall" style={styles.sectionTitle}>Attendance Record</Text>
                <Chip compact style={{ backgroundColor: '#E3F2FD' }} textStyle={{ fontSize: 11 }}>
                  {existingAttendance.subject || 'General'}
                </Chip>
              </View>
              <View style={styles.summaryChips}>
                <Chip compact style={{ backgroundColor: '#C8E6C9' }} textStyle={{ fontSize: 11 }}>
                  Present: {Object.values(records).filter((s) => s === 'present').length}
                </Chip>
                <Chip compact style={{ backgroundColor: '#FFCDD2' }} textStyle={{ fontSize: 11 }}>
                  Absent: {Object.values(records).filter((s) => s === 'absent').length}
                </Chip>
                <Chip compact style={{ backgroundColor: '#FFE0B2' }} textStyle={{ fontSize: 11 }}>
                  Late: {Object.values(records).filter((s) => s === 'late').length}
                </Chip>
              </View>
            </View>

            {students.map((s: any) => {
              const status = records[s.id] || 'absent'
              const statusColor = status === 'present' ? '#C8E6C9' : status === 'absent' ? '#FFCDD2' : '#FFE0B2'
              return (
                <Card key={s.id} style={styles.studentCard} mode="elevated">
                  <Card.Content style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <Text variant="titleSmall" style={{ fontWeight: '600' }}>{s.student_name || s.full_name || s.id.slice(0, 8)}</Text>
                      <Text variant="bodySmall" style={{ color: '#888' }}>Roll: {s.roll_number || '-'}</Text>
                    </View>
                    <Chip mode="flat" compact style={{ backgroundColor: statusColor }} textStyle={{ fontWeight: '600', fontSize: 11 }}>
                      {status.toUpperCase()}
                    </Chip>
                  </Card.Content>
                </Card>
              )
            })}
          </>
        ) : null}

        {/* Search Student */}
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Search Student</Text>
          <Searchbar
            placeholder="Search by name..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{ fontSize: 14 }}
          />
          {searchQuery.trim() ? (
            <StudentSearchResults
              query={searchQuery}
              students={students}
              records={records}
              standard={standard}
              division={division}
              navigation={navigation}
            />
          ) : null}
        </View>

        {/* Monthly Stats */}
        <View style={styles.section}>
          <View style={styles.summaryRow}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Monthly Report</Text>
            {!showMonthly ? (
              <Button mode="text" compact onPress={loadMonthlyStats}>Show</Button>
            ) : null}
          </View>
          {showMonthly && monthlyStats ? (
            <MonthlyStatsView stats={monthlyStats} students={students} />
          ) : showMonthly && !monthlyStats ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : null}
        </View>

      </ScrollView>
    </View>
  )
}

function StudentSearchResults({
  query, students, records, standard, division, navigation,
}: {
  query: string; students: any[]; records: Record<string, string>; standard: string; division: string; navigation: any
}) {
  const q = query.toLowerCase()
  const filtered = students.filter((s: any) =>
    (s.student_name || s.full_name || '').toLowerCase().includes(q)
  )

  if (filtered.length === 0) {
    return <Text style={{ color: '#888', textAlign: 'center', marginTop: spacing.sm }}>No student found</Text>
  }

  return (
    <View style={{ marginTop: spacing.sm }}>
      {filtered.map((s: any) => {
        const status = records[s.id] || 'absent'
        return (
          <TouchableOpacity
            key={s.id}
            onPress={() => navigation.navigate('StudentAttendanceDetail', { studentId: s.id, studentName: s.student_name || s.full_name })}
            activeOpacity={0.7}
          >
            <Card style={{ marginBottom: spacing.xs, borderRadius: radius.md }} mode="elevated">
              <Card.Content style={styles.studentRow}>
                <View style={styles.studentInfo}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{s.student_name || s.full_name}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Roll: {s.roll_number || '-'}</Text>
                </View>
                {records[s.id] ? (
                  <Chip
                    mode="flat" compact
                    style={{ backgroundColor: status === 'present' ? '#C8E6C9' : status === 'absent' ? '#FFCDD2' : '#FFE0B2' }}
                    textStyle={{ fontSize: 10, fontWeight: '600' }}
                  >
                    {status.toUpperCase()}
                  </Chip>
                ) : null}
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function MonthlyStatsView({ stats, students }: { stats: any; students: any[] }) {
  return (
    <Card style={{ borderRadius: radius.md, marginTop: spacing.sm }} mode="elevated">
      <Card.Content>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
          {stats.month} {stats.year} — {stats.docs} days recorded
        </Text>
        <Text variant="bodySmall" style={{ color: '#888', marginBottom: spacing.sm }}>
          Class average: {students.length > 0
            ? Math.round(
                students.reduce((sum: number, s: any) => {
                  const st = stats.stats[s.id]
                  return sum + (st && st.total > 0 ? (st.present / st.total) * 100 : 0)
                }, 0) / students.length
              )
            : 0}%
        </Text>
        <Divider />
        {students.slice(0, 20).map((s: any) => {
          const st = stats.stats[s.id]
          if (!st || st.total === 0) return null
          const pct = Math.round((st.present / st.total) * 100)
          const barColor = pct >= 90 ? '#4CAF50' : pct >= 75 ? '#FF9800' : '#F44336'
          return (
            <View key={s.id} style={{ paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text variant="bodySmall" style={{ fontWeight: '500', flex: 1 }} numberOfLines={1}>
                  {s.student_name || s.full_name || s.id.slice(0, 8)}
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600', color: barColor }}>{pct}%</Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 }}>
                <View style={{ height: 4, width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
              </View>
            </View>
          )
        })}
        {students.length > 20 ? (
          <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: spacing.sm }}>
            Showing first 20 of {students.length} students
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { borderRadius: radius.md },

  classInfoRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexWrap: 'wrap' },

  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm, color: '#333' },

  quickDatesRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  quickDateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  quickDateText: { fontSize: 13, fontWeight: '600', color: '#333' },
  dateInput: { backgroundColor: '#fff', fontSize: 13, height: 38, width: 130 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryChips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: spacing.xs },
  actionsRow: { marginTop: spacing.xs },

  studentCard: { marginHorizontal: spacing.md, marginBottom: spacing.xs, borderRadius: radius.md },
  absentCard: { backgroundColor: '#FFF5F5' },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  studentInfo: { flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },

  searchBar: { borderRadius: radius.md, elevation: 0, backgroundColor: '#fff' },

  submitBtn: { marginHorizontal: spacing.md, marginTop: spacing.lg, borderRadius: radius.md },
})
