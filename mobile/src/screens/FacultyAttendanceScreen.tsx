import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { Card, Text, Button, TextInput, useTheme, ActivityIndicator, Chip, Searchbar, Divider } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokenStore } from '../lib/storage'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

const SUBJECTS = ['Maths','Science','English','Hindi','Sanskrit','Social Studies','Computer','Physics','Chemistry','Biology']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function FacultyAttendanceScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null)
  const [standard, setStandard] = useState('')
  const [division, setDivision] = useState('')
  const [subject, setSubject] = useState('General')
  const [selectedDate, setSelectedDate] = useState(fmt(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [students, setStudents] = useState<any[]>([])
  const [records, setRecords] = useState<Record<string, string>>({})
  const [existingAttendance, setExistingAttendance] = useState<any>(null)
  const [allMonthAttendance, setAllMonthAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'loading' | 'mark' | 'view' | 'no-class'>('loading')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateSearchQuery, setDateSearchQuery] = useState('')
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState<any>(null)
  const [showMonthly, setShowMonthly] = useState(false)
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const todayStr = fmt(new Date())

  // Load faculty info
  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
      if (u?.role === 'faculty') {
        const res = await api.get<any[]>('/api/faculty')
        if (res.success) {
          const match = (res.data || []).find((f: any) => f.user_id === u.id)
          if (match && match.assigned_standard) {
            setStandard(match.assigned_standard)
            setDivision(match.assigned_division || '')
          }
        }
      }
    })()
  }, [])

  // Load students + all attendance for the month
  const loadMonthData = useCallback(async (y: number, m: number, std?: string, div?: string) => {
    const s = std || standard
    const d = div || division
    if (!s) { setMode('no-class'); setLoading(false); return }

    setLoading(true)
    setError('')
    setShowMonthly(false)
    setMonthlyStats(null)

    // Fetch students
    const params = new URLSearchParams({ standard: s })
    if (d) params.append('division', d)
    const studentsRes = await api.get<any[]>(`/api/students?${params.toString()}`)
    if (!studentsRes.success) { setError(studentsRes.error || 'Failed to load students'); setLoading(false); return }

    const studentList = studentsRes.data || []
    setStudents(studentList)

    // Fetch all attendance for this month
    const startDate = fmt(new Date(y, m, 1))
    const endDate = fmt(new Date(y, m, daysInMonth(y, m)))
    const attRes = await api.get<any[]>('/api/attendance')
    if (attRes.success && attRes.data) {
      const monthDocs = attRes.data.filter((a: any) =>
        a.attendance_date >= startDate && a.attendance_date <= endDate &&
        a.standard === s && (!d || a.division === d)
      )
      setAllMonthAttendance(monthDocs)

      // Build monthly stats
      const stats: Record<string, { present: number; absent: number; late: number; total: number }> = {}
      studentList.forEach((st: any) => {
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
      setMonthlyStats({ docs: monthDocs.length, stats, month: m, year: y })
    }

    setLoading(false)
  }, [standard, division])

  useEffect(() => {
    if (standard) {
      loadMonthData(calendarYear, calendarMonth)
    }
  }, [calendarYear, calendarMonth, standard, division])

  // Load date detail (for mark/view)
  const loadForDate = useCallback(async (date: string) => {
    const s = standard
    const d = division
    if (!s) return

    setError('')

    // Check existing attendance for this date
    const classParams = new URLSearchParams({ date, standard: s })
    if (d) classParams.append('division', d)
    const attRes = await api.get<any[]>(`/api/attendance/class?${classParams.toString()}`)
    if (attRes.success && attRes.data && attRes.data.length > 0) {
      const attDoc = attRes.data[0]
      setExistingAttendance(attDoc)
      setSubject(attDoc.subject || 'General')
      const recMap: Record<string, string> = {}
      ;(attDoc.attendance_records || []).forEach((r: any) => {
        recMap[r.student_id] = r.status
      })
      setRecords(recMap)
      setMode('view')
    } else {
      const initial: Record<string, string> = {}
      students.forEach((s: any) => { initial[s.id] = 'present' })
      setRecords(initial)
      setExistingAttendance(null)
      setMode('mark')
    }
  }, [standard, division, students])

  // When selectedDate changes, load its detail
  useEffect(() => {
    if (standard && students.length > 0 && selectedDate) {
      loadForDate(selectedDate)
    }
  }, [selectedDate, students.length > 0])

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1) }
    else setCalendarMonth(calendarMonth - 1)
  }
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1) }
    else setCalendarMonth(calendarMonth + 1)
  }

  const datesWithAttendance = useMemo(() => {
    const set = new Set<string>()
    allMonthAttendance.forEach((a: any) => set.add(a.attendance_date))
    return set
  }, [allMonthAttendance])

  const calendarDays = useMemo(() => {
    const total = daysInMonth(calendarYear, calendarMonth)
    const startDay = getFirstDayOfMonth(calendarYear, calendarMonth)
    const days: (number | null)[] = []
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let d = 1; d <= total; d++) days.push(d)
    return days
  }, [calendarYear, calendarMonth])

  // Build date list for the month
  const monthDateList = useMemo(() => {
    const total = daysInMonth(calendarYear, calendarMonth)
    const list: { date: string; day: number; hasAttendance: boolean; doc: any }[] = []
    for (let d = 1; d <= total; d++) {
      const ds = fmt(new Date(calendarYear, calendarMonth, d))
      if (ds > todayStr) continue  // skip future dates
      const doc = allMonthAttendance.find((a: any) => a.attendance_date === ds)
      list.push({ date: ds, day: d, hasAttendance: !!doc, doc: doc || null })
    }
    return list
  }, [calendarYear, calendarMonth, allMonthAttendance, todayStr])

  const filteredDateList = useMemo(() => {
    if (!dateSearchQuery.trim()) return monthDateList
    const q = dateSearchQuery.toLowerCase()
    return monthDateList.filter((item) => {
      const d = new Date(item.date)
      const dateStr = d.toLocaleDateString('en-IN')
      return item.date.includes(q) || dateStr.includes(q) || String(item.day).includes(q)
    })
  }, [monthDateList, dateSearchQuery])

  const toggleStatus = (studentId: string) => {
    if (mode === 'view') return
    setRecords((prev) => {
      const cur = prev[studentId] || 'present'
      const next = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present'
      return { ...prev, [studentId]: next }
    })
  }

  const setAll = (status: string) => {
    const all: Record<string, string> = {}
    students.forEach((s: any) => { all[s.id] = status })
    setRecords(all)
  }

  const submitAttendance = async () => {
    setSubmitting(true)
    setError('')
    const attendance_records = Object.entries(records).map(([student_id, status]) => ({
      student_id, status,
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
    loadMonthData(calendarYear, calendarMonth)
    loadForDate(selectedDate)
  }

  const selectDate = (d: number) => {
    if (!d) return
    const ds = fmt(new Date(calendarYear, calendarMonth, d))
    if (ds > todayStr) return
    setSelectedDate(ds)
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadMonthData(calendarYear, calendarMonth).then(() => {
      if (selectedDate) loadForDate(selectedDate)
      setRefreshing(false)
    })
  }, [calendarYear, calendarMonth, selectedDate, loadMonthData, loadForDate])

  // Initial load
  useEffect(() => {
    if (standard) onRefresh()
  }, [standard])

  const selectedDayNum = selectedDate ? new Date(selectedDate).getDate() : 0
  const selectedDoc = allMonthAttendance.find((a: any) => a.attendance_date === selectedDate)
  const absentCount = Object.values(records).filter((s) => s !== 'present').length
  const totalStudents = students.length

  if (mode === 'no-class') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: '#888', marginBottom: spacing.md }}>No class assigned to you</Text>
        <Text variant="bodySmall" style={{ color: '#aaa', textAlign: 'center' }}>Contact the admin to set your assigned class</Text>
        <Button mode="contained" style={{ marginTop: spacing.lg }} onPress={() => navigation.goBack()}>Back</Button>
      </View>
    )
  }

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
          <Chip
            style={{ backgroundColor: '#E8F5E9' }}
            onPress={() => setShowSubjectPicker(true)}
          >
            {subject} ▼
          </Chip>
          <Text variant="bodySmall" style={{ color: '#888', alignSelf: 'center', marginLeft: 'auto' }}>
            {allMonthAttendance.length} days marked
          </Text>
        </View>

        {/* Subject Picker Modal (inline) */}
        {showSubjectPicker && (
          <Card style={{ marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md }} mode="elevated">
            <Card.Content>
              <Text variant="bodySmall" style={styles.label}>Select Subject</Text>
              <View style={styles.optionsRow}>
                {SUBJECTS.map((s) => (
                  <TouchableOpacity
                    key={s} onPress={() => { setSubject(s); setShowSubjectPicker(false) }}
                    style={[styles.optChip, subject === s && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  >
                    <Text style={[styles.optChipText, subject === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button compact onPress={() => setShowSubjectPicker(false)}>Close</Button>
            </Card.Content>
          </Card>
        )}

        {/* Calendar Navigation */}
        <View style={styles.calNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.calArrow}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.primary }}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'][calendarMonth]} {calendarYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.calArrow}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.primary }}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <Card style={styles.calCard} mode="elevated">
          <Card.Content style={{ padding: spacing.sm }}>
            <View style={styles.calWeekRow}>
              {DAY_NAMES.map((dn) => (
                <View key={dn} style={styles.calDayHeader}><Text style={styles.calDayHeaderText}>{dn}</Text></View>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calendarDays.map((d, i) => {
                if (d === null) return <View key={`e${i}`} style={styles.calDayCell} />
                const ds = fmt(new Date(calendarYear, calendarMonth, d))
                const isToday = ds === todayStr
                const hasAtt = datesWithAttendance.has(ds)
                const isSelected = ds === selectedDate
                const isFuture = ds > todayStr
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => selectDate(d)}
                    disabled={isFuture}
                    style={[
                      styles.calDayCell,
                      isSelected && styles.calDaySelected,
                      isToday && !isSelected && { borderWidth: 1, borderColor: theme.colors.primary },
                    ]}
                  >
                    <View style={[
                      styles.calDayInner,
                      hasAtt && styles.calDayHasAtt,
                      isToday && !hasAtt && !isSelected && { backgroundColor: '#E3F2FD' },
                    ]}>
                      <Text style={[
                        styles.calDayText,
                        isFuture && { color: '#ddd' },
                        isSelected && { color: '#fff' },
                        hasAtt && !isSelected && { color: '#fff' },
                      ]}>{d}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Selected Date Detail */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select a date'}
            </Text>
            {mode === 'view' && existingAttendance && (
              <Button mode="outlined" compact icon="pencil" onPress={() => setMode('mark')}>
                Edit
              </Button>
            )}
          </View>

          {selectedDoc ? (
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
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
          ) : selectedDate && selectedDate <= todayStr ? (
            <Text variant="bodySmall" style={{ color: '#888', marginTop: 4 }}>No attendance recorded for this date</Text>
          ) : null}
        </View>

        {error ? (
          <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, marginHorizontal: spacing.md, marginBottom: spacing.md }]}>
            <Card.Content><Text style={{ color: theme.colors.error }}>{error}</Text></Card.Content>
          </Card>
        ) : null}

        {loading ? (
          <View style={[styles.center, { paddingVertical: spacing.xl }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}

        {/* Mark / View Mode for selected date */}
        {!loading && mode === 'mark' && selectedDate ? (
          <>
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Button mode="text" compact icon="check-all" onPress={() => setAll('present')}>All Present</Button>
                <Button mode="text" compact icon="close" onPress={() => setAll('absent')}>All Absent</Button>
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
                      <Text variant="bodySmall" style={{ marginLeft: 4, fontWeight: '600', color: isAbsent ? '#C62828' : '#2E7D32', width: 50, textAlign: 'right' }}>
                        {status.toUpperCase()}
                      </Text>
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
              {submitting ? 'Saving...' : `Save Attendance (${totalStudents} students)`}
            </Button>
          </>
        ) : !loading && mode === 'view' && selectedDate && students.length > 0 ? (
          <View style={styles.section}>
            {students.map((s: any) => {
              const status = records[s.id] || 'absent'
              const statusColor = status === 'present' ? '#C8E6C9' : status === 'absent' ? '#FFCDD2' : '#FFE0B2'
              return (
                <Card key={s.id} style={{ marginBottom: spacing.xs, borderRadius: radius.md }} mode="elevated">
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
          </View>
        ) : null}

        {/* Date Search & List */}
        <View style={styles.section}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Date-wise Attendance</Text>
          <Searchbar
            placeholder="Search by date (e.g. 2026-07 or 24)..."
            onChangeText={setDateSearchQuery}
            value={dateSearchQuery}
            style={styles.searchBar}
            inputStyle={{ fontSize: 13 }}
          />
        </View>

        {filteredDateList.length === 0 ? (
          <Text style={{ color: '#888', textAlign: 'center', marginVertical: spacing.md }}>
            {dateSearchQuery ? 'No matching dates' : 'No dates in this month'}
          </Text>
        ) : (
          filteredDateList.map((item) => {
            const d = new Date(item.date)
            const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' })
            return (
              <TouchableOpacity
                key={item.date}
                onPress={() => setSelectedDate(item.date)}
                activeOpacity={0.7}
              >
                <Card style={[styles.dateRow, selectedDate === item.date && { borderLeftWidth: 3, borderLeftColor: theme.colors.primary }]} mode="elevated">
                  <Card.Content style={styles.dateRowContent}>
                    <View style={styles.dateRowLeft}>
                      <Text style={styles.dateDayNum}>{item.day}</Text>
                      <View>
                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{dayName}</Text>
                        <Text variant="bodySmall" style={{ color: '#888' }}>{item.date}</Text>
                      </View>
                    </View>
                    {item.hasAttendance ? (
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        <Chip compact style={{ backgroundColor: '#C8E6C9' }} textStyle={{ fontSize: 10, fontWeight: '600' }}>
                          {item.doc?.attendance_records?.filter((r: any) => r.status === 'present').length || 0} P
                        </Chip>
                        <Chip compact style={{ backgroundColor: '#FFCDD2' }} textStyle={{ fontSize: 10, fontWeight: '600' }}>
                          {item.doc?.attendance_records?.filter((r: any) => r.status !== 'present').length || 0} A
                        </Chip>
                        <Text variant="bodySmall" style={{ color: '#888' }}>{item.doc?.subject || ''}</Text>
                      </View>
                    ) : (
                      <Chip compact style={{ backgroundColor: '#F5F5F5' }} textStyle={{ fontSize: 10, color: '#888' }}>Not marked</Chip>
                    )}
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            )
          })
        )}

        {/* Student Search */}
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
            <StudentSearchResults query={searchQuery} students={students} records={records} navigation={navigation} />
          ) : null}
        </View>

        {/* Monthly Stats */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Monthly Report</Text>
            {!showMonthly && monthlyStats ? (
              <Button mode="text" compact onPress={() => setShowMonthly(true)}>Show</Button>
            ) : null}
            {showMonthly ? (
              <Button mode="text" compact onPress={() => setShowMonthly(false)}>Hide</Button>
            ) : null}
          </View>
          {showMonthly && monthlyStats ? (
            <MonthlyStatsView stats={monthlyStats} students={students} />
          ) : null}
          {!showMonthly && (
            <Text variant="bodySmall" style={{ color: '#888' }}>
              {monthlyStats?.docs || 0} days recorded this month
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  )
}

const st = StyleSheet.create({
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  studentInfo: { flex: 1 },
})

function StudentSearchResults({ query, students, records, navigation }: any) {
  const q = query.toLowerCase()
  const filtered = students.filter((s: any) =>
    (s.student_name || s.full_name || '').toLowerCase().includes(q)
  )
  if (filtered.length === 0) {
    return <Text style={{ color: '#888', textAlign: 'center', marginTop: spacing.sm }}>No student found</Text>
  }
  return (
    <View style={{ marginTop: spacing.sm }}>
      {filtered.map((s: any) => (
        <TouchableOpacity
          key={s.id}
          onPress={() => navigation.navigate('StudentAttendanceDetail', { studentId: s.id, studentName: s.student_name || s.full_name })}
          activeOpacity={0.7}
        >
          <Card style={{ marginBottom: spacing.xs, borderRadius: radius.md }} mode="elevated">
            <Card.Content style={st.studentRow}>
              <View style={st.studentInfo}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{s.student_name || s.full_name}</Text>
                <Text variant="bodySmall" style={{ color: '#888' }}>Roll: {s.roll_number || '-'}</Text>
              </View>
              {records[s.id] ? (
                <Chip mode="flat" compact
                  style={{ backgroundColor: records[s.id] === 'present' ? '#C8E6C9' : records[s.id] === 'absent' ? '#FFCDD2' : '#FFE0B2' }}
                  textStyle={{ fontSize: 10, fontWeight: '600' }}
                >{records[s.id].toUpperCase()}</Chip>
              ) : null}
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function MonthlyStatsView({ stats, students }: { stats: any; students: any[] }) {
  const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][stats.month]
  return (
    <Card style={{ borderRadius: radius.md, marginTop: spacing.sm }} mode="elevated">
      <Card.Content>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
          {monthName} {stats.year} — {stats.docs} days
        </Text>
        <Text variant="bodySmall" style={{ color: '#888', marginBottom: spacing.sm }}>
          Class average: {students.length > 0
            ? Math.round(students.reduce((sum: number, s: any) => {
                const st = stats.stats[s.id]
                return sum + (st && st.total > 0 ? (st.present / st.total) * 100 : 0)
              }, 0) / students.length)
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
          <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: spacing.sm }}>Showing first 20</Text>
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

  // Calendar
  calNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  calArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calCard: { marginHorizontal: spacing.md, borderRadius: radius.md },
  calWeekRow: { flexDirection: 'row' },
  calDayHeader: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  calDayHeaderText: { fontSize: 11, fontWeight: '600', color: '#888' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCell: { width: '14.28%', aspectRatio: 1, padding: 1 },
  calDayInner: {
    flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  calDayHasAtt: { backgroundColor: '#4CAF50' },
  calDaySelected: { backgroundColor: '#0F4C81', borderRadius: 8 },
  calDayText: { fontSize: 13, fontWeight: '600', color: '#333' },

  // Date list
  dateRow: { marginHorizontal: spacing.md, marginBottom: spacing.xs, borderRadius: radius.md },
  dateRowContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateDayNum: { fontSize: 18, fontWeight: '700', color: '#333', width: 28 },

  // Options
  label: { color: '#666', marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  optChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  optChipText: { fontSize: 13, fontWeight: '600', color: '#333' },

  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm, color: '#333' },

  studentCard: { marginHorizontal: spacing.md, marginBottom: spacing.xs, borderRadius: radius.md },
  absentCard: { backgroundColor: '#FFF5F5' },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  studentInfo: { flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },

  searchBar: { borderRadius: radius.md, elevation: 0, backgroundColor: '#fff' },

  submitBtn: { marginHorizontal: spacing.md, marginTop: spacing.lg, borderRadius: radius.md },
})
