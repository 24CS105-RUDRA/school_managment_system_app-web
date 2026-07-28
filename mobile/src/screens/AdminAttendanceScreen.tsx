import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text, useTheme, ActivityIndicator, Chip, Button, Divider, Avatar } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api } from '../lib/api'
import { spacing, radius } from '../lib/theme'

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

export default function AdminAttendanceScreen({ navigation }: any) {
  const [classes, setClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [allAttendance, setAllAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState('')
  const [showMonthly, setShowMonthly] = useState(false)
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const todayStr = fmt(new Date())

  // Load all students to get available classes
  useEffect(() => {
    ;(async () => {
      const res = await api.get<any[]>('/api/students')
      if (!res.success) return
      const all = res.data || []
      setStudents(all)
      const stds = [...new Set(all.map((s: any) => s.standard).filter(Boolean))].sort()
      setClasses(stds)
      setLoading(false)
    })()
  }, [])

  // Load attendance for selected class
  const loadAttendance = useCallback(async (std: string) => {
    setAllAttendance([])
    setSelectedDate('')
    const res = await api.get<any[]>('/api/attendance')
    if (res.success) {
      const filtered = (res.data || []).filter((a: any) => a.standard === std)
      setAllAttendance(filtered)
    }
  }, [])

  const classStudents = useMemo(() => {
    return students.filter((s: any) => s.standard === selectedClass)
  }, [students, selectedClass])

  const attendanceByDate = useMemo(() => {
    const map: Record<string, { total: number; present: number; records: any[] }> = {}
    allAttendance.forEach((doc: any) => {
      const date = doc.attendance_date
      const records = doc.attendance_records || []
      const present = records.filter((r: any) => r.status === 'present').length
      map[date] = { total: records.length, present, records }
    })
    return map
  }, [allAttendance])

  const datesWithAttendance = useMemo(() => new Set(Object.keys(attendanceByDate)), [attendanceByDate])

  const calendarDays = useMemo(() => {
    const total = daysInMonth(calendarYear, calendarMonth)
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= total; d++) {
      const ds = fmt(new Date(calendarYear, calendarMonth, d))
      if (ds > todayStr) { days.push(null); continue }
      days.push(d)
    }
    return days
  }, [calendarYear, calendarMonth, todayStr])

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1) }
    else setCalendarMonth(calendarMonth - 1)
  }

  const nextMonth = () => {
    const nextM = calendarMonth === 11 ? 0 : calendarMonth + 1
    const nextY = calendarMonth === 11 ? calendarYear + 1 : calendarYear
    if (nextY > new Date().getFullYear() || (nextY === new Date().getFullYear() && nextM > new Date().getMonth())) return
    setCalendarMonth(nextM)
    setCalendarYear(nextY)
  }

  const selectedDayAttendance = selectedDate ? attendanceByDate[selectedDate] : null

  const monthlyStats = useMemo(() => {
    const monthDocs = allAttendance.filter((a: any) => {
      const d = new Date(a.attendance_date)
      return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear
    })
    let totalPresent = 0, totalRecords = 0
    monthDocs.forEach((doc: any) => {
      const records = doc.attendance_records || []
      totalRecords += records.length
      totalPresent += records.filter((r: any) => r.status === 'present').length
    })
    const pct = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0
    return { totalDocs: monthDocs.length, totalRecords, totalPresent, pct }
  }, [allAttendance, calendarMonth, calendarYear])

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
  }

  if (!selectedClass) {
    return (
      <View style={styles.container}>
        <View style={{ padding: spacing.md }}>
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: spacing.md }}>Select Class</Text>
          <View style={{ gap: spacing.sm }}>
            {classes.map((std) => {
              const count = students.filter((s: any) => s.standard === std).length
              return (
                <TouchableOpacity key={std} onPress={() => { setSelectedClass(std); loadAttendance(std) }}>
                  <Card style={{ borderRadius: radius.md }} mode="elevated">
                    <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                      <Avatar.Text size={44} label={std} style={{ backgroundColor: theme.colors.primary }} />
                      <View>
                        <Text variant="titleSmall" style={{ fontWeight: '600' }}>Standard {std}</Text>
                        <Text variant="bodySmall" style={{ color: '#888' }}>{count} students</Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm }}>
        <Button icon="arrow-left" mode="text" compact onPress={() => { setSelectedClass(''); setSelectedDate('') }}>Classes</Button>
        <Chip style={{ backgroundColor: theme.colors.primaryContainer }}>Std {selectedClass}</Chip>
        <Text variant="bodySmall" style={{ color: '#888', marginLeft: 'auto' }}>{allAttendance.length} days</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Calendar */}
        <View style={styles.calNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.calArrow}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.primary }}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700' }}>
            {new Date(calendarYear, calendarMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.calArrow}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.primary }}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.calCard} mode="elevated">
          <Card.Content style={{ padding: spacing.sm }}>
            <View style={styles.calWeekRow}>
              {DAY_NAMES.map((d) => <View key={d} style={styles.calDayHeader}><Text style={styles.calDayHeaderText}>{d}</Text></View>)}
            </View>
            <View style={styles.calGrid}>
              {calendarDays.map((d, i) => {
                if (d === null) return <View key={`e-${i}`} style={styles.calDayCell} />
                const ds = fmt(new Date(calendarYear, calendarMonth, d))
                const isToday = ds === todayStr
                const isSelected = ds === selectedDate
                const att = attendanceByDate[ds]
                const hasAtt = !!att
                const allPresent = hasAtt && att.total === att.present
                return (
                  <View key={ds} style={styles.calDayCell}>
                    <TouchableOpacity
                      onPress={() => setSelectedDate(isSelected ? '' : ds)}
                      style={[
                        styles.calDayInner,
                        isSelected && styles.calDaySelected,
                        hasAtt && !isSelected && { backgroundColor: allPresent ? '#C8E6C9' : '#FFCDD2' },
                        isToday && !hasAtt && !isSelected && { backgroundColor: '#E3F2FD' },
                      ]}
                    >
                      <Text style={[styles.calDayText, isSelected && { color: '#fff' }, !hasAtt && !isSelected && { color: '#bbb' }]}>{d}</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#C8E6C9' }} />
            <Text style={{ fontSize: 11, color: '#666' }}>All Present</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FFCDD2' }} />
            <Text style={{ fontSize: 11, color: '#666' }}>Some Absent</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E3F2FD' }} />
            <Text style={{ fontSize: 11, color: '#666' }}>No Record</Text>
          </View>
        </View>

        {/* Selected Date Summary */}
        {selectedDate && selectedDayAttendance ? (
          <View style={styles.section}>
            <Card style={{ borderRadius: radius.md }} mode="elevated">
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                  {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.statValue, { color: '#2E7D32' }]}>{selectedDayAttendance.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[styles.statValue, { color: '#C62828' }]}>{selectedDayAttendance.total - selectedDayAttendance.present}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.statValue, { color: '#1565C0' }]}>{selectedDayAttendance.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>
        ) : selectedDate && !selectedDayAttendance ? (
          <View style={styles.section}>
            <Text style={{ color: '#888', textAlign: 'center' }}>No attendance marked for {new Date(selectedDate).toLocaleDateString('en-IN')}</Text>
          </View>
        ) : null}

        {/* Monthly Report */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Monthly Report</Text>
            <Button mode="text" compact onPress={() => setShowMonthly(!showMonthly)}>
              {showMonthly ? 'Hide' : 'Show'}
            </Button>
          </View>
          {showMonthly ? (
            <Card style={{ borderRadius: radius.md }} mode="elevated">
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: spacing.md }}>
                  {new Date(calendarYear, calendarMonth).toLocaleDateString('en-IN', { month: 'long' })} {calendarYear} — {monthlyStats.totalDocs} days
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.statValue, { color: '#2E7D32' }]}>{monthlyStats.totalPresent}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[styles.statValue, { color: '#C62828' }]}>{monthlyStats.totalRecords - monthlyStats.totalPresent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.statValue, { color: '#1565C0' }]}>{monthlyStats.pct}%</Text>
                    <Text style={styles.statLabel}>Rate</Text>
                  </View>
                </View>
                <View style={{ marginTop: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text variant="bodySmall" style={{ color: '#888' }}>Attendance Rate</Text>
                    <Text variant="bodySmall" style={{ fontWeight: '600', color: monthlyStats.pct >= 90 ? '#2E7D32' : monthlyStats.pct >= 75 ? '#E65100' : '#C62828' }}>
                      {monthlyStats.pct}%
                    </Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: '#E0E0E0', borderRadius: 4 }}>
                    <View style={{ height: 8, width: `${monthlyStats.pct}%`, borderRadius: 4, backgroundColor: monthlyStats.pct >= 90 ? '#4CAF50' : monthlyStats.pct >= 75 ? '#FF9800' : '#F44336' }} />
                  </View>
                </View>

                {/* Per-student breakdown */}
                <Divider style={{ marginVertical: spacing.md }} />
                <Text variant="bodySmall" style={{ fontWeight: '700', marginBottom: spacing.sm }}>Per Student</Text>
                {classStudents.slice(0, 20).map((s: any) => {
                  let present = 0, total = 0
                  allAttendance.forEach((doc: any) => {
                    const rec = (doc.attendance_records || []).find((r: any) => r.student_id === s.id)
                    if (rec) { total++; if (rec.status === 'present') present++ }
                  })
                  const pct = total > 0 ? Math.round((present / total) * 100) : 0
                  const barColor = pct >= 90 ? '#4CAF50' : pct >= 75 ? '#FF9800' : '#F44336'
                  return (
                    <View key={s.id} style={{ paddingVertical: 3 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="bodySmall" style={{ flex: 1 }} numberOfLines={1}>{s.student_name}</Text>
                        <Text variant="bodySmall" style={{ fontWeight: '600', color: barColor }}>{pct}%</Text>
                      </View>
                      <View style={{ height: 3, backgroundColor: '#E0E0E0', borderRadius: 2, marginTop: 2 }}>
                        <View style={{ height: 3, width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
                      </View>
                    </View>
                  )
                })}
              </Card.Content>
            </Card>
          ) : (
            <Text variant="bodySmall" style={{ color: '#888' }}>{monthlyStats.totalDocs} days recorded, {monthlyStats.pct}% overall rate</Text>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { alignItems: 'center', justifyContent: 'center' },
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
  calDayInner: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calDaySelected: { backgroundColor: '#0F4C81', borderRadius: 8 },
  calDayText: { fontSize: 13, fontWeight: '600', color: '#333' },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm, color: '#333' },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
})
