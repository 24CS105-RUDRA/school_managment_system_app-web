import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Card, Text, useTheme, ActivityIndicator, Chip, Divider, Button } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { tokenStore } from '../lib/storage'
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

export default function StudentAttendanceScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState('')
  const [showMonthly, setShowMonthly] = useState(false)
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const todayStr = fmt(new Date())

  useEffect(() => {
    ;(async () => {
      const u = await tokenStore.getUser()
      setUser(u)
    })()
  }, [])

  const loadAttendance = useCallback(async (u: any) => {
    if (!u) return
    setLoading(true)
    const res = await api.get<any[]>(`/api/attendance/student/${u.id}`)
    setLoading(false)
    if (res.success) setRecords(res.data || [])
  }, [])

  useEffect(() => {
    if (user) loadAttendance(user)
  }, [user])

  const attendanceByDate = useMemo(() => {
    const map: Record<string, string> = {}
    records.forEach((r: any) => {
      map[r.attendance_date] = r.status
    })
    return map
  }, [records])

  const datesWithAttendance = useMemo(() => {
    return new Set(Object.keys(attendanceByDate))
  }, [attendanceByDate])

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

  const monthlyStats = useMemo(() => {
    const monthRecords = records.filter((r: any) => {
      const d = new Date(r.attendance_date)
      return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear
    })
    const present = monthRecords.filter((r: any) => r.status === 'present').length
    const absent = monthRecords.filter((r: any) => r.status === 'absent').length
    const late = monthRecords.filter((r: any) => r.status === 'late').length
    const total = monthRecords.length
    const pct = total > 0 ? Math.round((present / total) * 100) : 0
    return { present, absent, late, total, pct }
  }, [records, calendarMonth, calendarYear])

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.classInfoRow}>
          {user?.standard ? (
            <Chip style={{ backgroundColor: theme.colors.primaryContainer }}>
              Std {user.standard}{user.division ? ` - ${user.division}` : ''}
            </Chip>
          ) : null}
          <Text variant="bodySmall" style={{ color: '#888', alignSelf: 'center', marginLeft: 'auto' }}>
            {records.length} total records
          </Text>
        </View>

        {/* Calendar Navigation */}
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

        {/* Calendar Grid */}
        <Card style={styles.calCard} mode="elevated">
          <Card.Content style={{ padding: spacing.sm }}>
            <View style={styles.calWeekRow}>
              {DAY_NAMES.map((d) => (
                <View key={d} style={styles.calDayHeader}>
                  <Text style={styles.calDayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calGrid}>
              {calendarDays.map((d, i) => {
                if (d === null) return <View key={`e-${i}`} style={styles.calDayCell} />
                const ds = fmt(new Date(calendarYear, calendarMonth, d))
                const isToday = ds === todayStr
                const isSelected = ds === selectedDate
                const status = attendanceByDate[ds]
                const hasAtt = !!status
                return (
                  <View key={ds} style={styles.calDayCell}>
                    <TouchableOpacity
                      onPress={() => setSelectedDate(isSelected ? '' : ds)}
                      style={[
                        styles.calDayInner,
                        isSelected && styles.calDaySelected,
                        hasAtt && !isSelected && { backgroundColor: status === 'present' ? '#C8E6C9' : '#FFCDD2' },
                        isToday && !hasAtt && !isSelected && { backgroundColor: '#E3F2FD' },
                      ]}
                    >
                      <Text style={[
                        styles.calDayText,
                        isSelected && { color: '#fff' },
                        !hasAtt && !isSelected && { color: '#bbb' },
                      ]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Selected Date Summary */}
        {selectedDate ? (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              {attendanceByDate[selectedDate] ? (
                <Chip mode="flat" compact
                  style={{
                    backgroundColor: attendanceByDate[selectedDate] === 'present' ? '#C8E6C9' : '#FFCDD2',
                  }}
                  textStyle={{ fontWeight: '700', fontSize: 11 }}
                >
                  {attendanceByDate[selectedDate].toUpperCase()}
                </Chip>
              ) : (
                <Text variant="bodySmall" style={{ color: '#888' }}>No record</Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Legend */}
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#C8E6C9' }} />
            <Text style={{ fontSize: 11, color: '#666' }}>Present</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FFCDD2' }} />
            <Text style={{ fontSize: 11, color: '#666' }}>Absent</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E3F2FD' }} />
            <Text style={{ fontSize: 11, color: '#666' }}>Today</Text>
          </View>
        </View>

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
                  {new Date(calendarYear, calendarMonth).toLocaleDateString('en-IN', { month: 'long' })} {calendarYear}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.statValue, { color: '#2E7D32' }]}>{monthlyStats.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
                    <Text style={[styles.statValue, { color: '#C62828' }]}>{monthlyStats.absent}</Text>
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
                    <View style={{
                      height: 8, width: `${monthlyStats.pct}%`, borderRadius: 4,
                      backgroundColor: monthlyStats.pct >= 90 ? '#4CAF50' : monthlyStats.pct >= 75 ? '#FF9800' : '#F44336',
                    }} />
                  </View>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <Text variant="bodySmall" style={{ color: '#888' }}>
              {monthlyStats.total} days recorded this month
            </Text>
          )}
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  classInfoRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexWrap: 'wrap' },
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
  calDaySelected: { backgroundColor: '#0F4C81', borderRadius: 8 },
  calDayText: { fontSize: 13, fontWeight: '600', color: '#333' },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionTitle: { fontWeight: '700', marginBottom: spacing.sm, color: '#333' },
  statCard: {
    flex: 1, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
})
