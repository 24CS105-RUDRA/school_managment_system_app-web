'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentSidebar } from '@/components/layout/student-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Check, Clock, HelpCircle } from 'lucide-react'
import { getStudentAttendance, getAttendanceStats, getStudentRecordByUserId } from '@/lib/actions/attendance'

interface AttendanceRecord {
  id: string
  attendance_date: string
  status: 'present' | 'absent' | 'missing' | 'no_record'
}

interface User {
  id: string
  username: string
  full_name: string
}

interface Stats {
  total: number
  present: number
  absent: number
  missing: number
  percentage: number
}

export default function AttendancePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const fetchAttendance = async (studentRecordId: string) => {
    try {
      const result = await getStudentAttendance(studentRecordId)
      if (result.success) {
        console.log('[v0] Attendance fetched:', result.data)
        setAttendanceData(result.data || [])
      } else {
        console.error('[v0] Error fetching attendance:', result.error)
      }

      const statsResult = await getAttendanceStats(studentRecordId)
      if (statsResult.success) {
        console.log('[v0] Attendance stats:', statsResult.data)
        setStats(statsResult.data || null)
      }
    } catch (error) {
      console.error('[v0] Fetch error:', error)
    }
  }

  useEffect(() => {
    const session = localStorage.getItem('userSession')
    const role = localStorage.getItem('userRole')

    if (!session || role !== 'student') {
      router.push('/login')
      return
    }

    const userData = JSON.parse(session) as User
    setUser(userData)

    // Fetch the student record to get the actual student ID using server action
    const fetchStudentRecord = async () => {
      try {
        const result = await getStudentRecordByUserId(userData.id)

        if (result.success && result.data) {
          console.log('[v0] Student record ID:', result.data.id)
          setStudentId(result.data.id)
          await fetchAttendance(result.data.id)
        } else {
          console.error('[v0] Error fetching student record:', result.error)
        }
      } catch (error) {
        console.error('[v0] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentRecord()
  }, [router])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const monthDays: (number | null)[] = Array.from({ length: firstDayOfMonth }).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ) as (number | null)[]

  const getAttendanceStatus = (day: number): 'present' | 'absent' | 'missing' | 'no_record' => {
    if (!day) return 'no_record'
    // Create date in UTC to avoid timezone issues
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const dateStr = `${year}-${month}-${dayStr}`
    
    const record = attendanceData.find((r) => r.attendance_date === dateStr)
    return record?.status || 'no_record'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-500 hover:bg-green-600 text-white'
      case 'absent':
        return 'bg-red-500 hover:bg-red-600 text-white'
      case 'missing':
        return 'bg-orange-500 hover:bg-orange-600 text-white'
      case 'no_record':
        return 'bg-gray-300 hover:bg-gray-400 text-gray-700'
      default:
        return 'bg-gray-200 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <Check className="w-4 h-4" />
      case 'absent':
        return 'A'
      case 'missing':
        return '?'
      default:
        return '-'
    }
  }

  const displayStats = stats || {
    total: 0,
    present: 0,
    absent: 0,
    missing: 0,
    percentage: 0,
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex min-h-screen bg-background">
      <StudentSidebar activeSection="attendance" />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <h1 className="text-3xl font-bold text-primary mb-8 ml-5 md:ml-0">Attendance Report</h1>

          {/* Attendance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-2 border-green-500/20 bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <Check className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{displayStats.present}</p>
                <p className="text-xs text-muted-foreground mt-1">Present</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-500/20 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                    A
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{displayStats.absent}</p>
                <p className="text-xs text-muted-foreground mt-1">Absent</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-500/20 bg-purple-50 dark:bg-purple-950/30">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                    %
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{displayStats.percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Selected Date Info */}
          <Card className="mb-6 bg-gray-50 dark:bg-gray-950/30">
            <CardContent className="p-4">
              <p className="text-lg font-semibold">
                Selected Date: {selectedDate ? selectedDate.toLocaleDateString() : 'None'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Status:{' '}
                {selectedDate
                  ? getAttendanceStatus(selectedDate.getDate()) === 'present'
                    ? '✓ Present'
                    : getAttendanceStatus(selectedDate.getDate()) === 'absent'
                    ? '✗ Absent'
                    : getAttendanceStatus(selectedDate.getDate()) === 'missing'
                    ? '? Missing'
                    : '- No Record'
                  : 'No Record'}
              </p>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
                  }
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-primary">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={() =>
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
                  }
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map((day) => (
                  <div key={day} className="text-center font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />
                  }

                  const status = getAttendanceStatus(day as number)
                  const isSelected = selectedDate && selectedDate.getDate() === day

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day as number)
                        setSelectedDate(newDate)
                      }}
                      className={`aspect-square rounded-full flex items-center justify-center font-semibold text-base transition-all ${getStatusColor(
                        status || 'no_record'
                      )} ${isSelected ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    >
                      <span className="text-center">
                        {status === 'present' || status === 'absent' || status === 'missing'
                          ? getStatusIcon(status)
                          : day}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="text-sm text-muted-foreground">Missing</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
