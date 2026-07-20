'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentSidebar } from '@/components/layout/student-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getHomeworkByStudent } from '@/lib/actions/homework'
import { getStudentRecordByUserId } from '@/lib/actions/attendance'
import { ChevronRight, Folder } from 'lucide-react'

interface User {
  id: string
  username: string
  full_name: string
}

interface Homework {
  id: string
  title: string
  description?: string
  subject: string
  due_date: string
  assigned_date?: string
}

export default function HomeworkPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  useEffect(() => {
    const session = localStorage.getItem('userSession')
    const role = localStorage.getItem('userRole')

    if (!session || role !== 'student') {
      router.push('/login')
      return
    }

    const userData = JSON.parse(session) as User
    setUser(userData)

    // Fetch the student record to get the actual student ID
    const fetchStudentRecord = async () => {
      try {
        const result = await getStudentRecordByUserId(userData.id)

        if (result.success && result.data) {
          setStudentId(result.data.id)

          // Fetch homework for this student
          const homeworkResult = await getHomeworkByStudent(result.data.id)
          if (homeworkResult.success && homeworkResult.data) {
            setHomeworks(homeworkResult.data)
          }
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateWithDay = (date: string) => {
    const dateObj = new Date(date)
    const day = dateObj.toLocaleDateString('en-GB', { weekday: 'short' })
    return `${day}, ${formatDate(date)}`
  }

  // Group homework by due date
  const groupedByDate = homeworks.reduce((acc, hw) => {
    if (!acc[hw.due_date]) {
      acc[hw.due_date] = []
    }
    acc[hw.due_date].push(hw)
    return acc
  }, {} as Record<string, Homework[]>)

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const toggleFolder = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <StudentSidebar activeSection="homework" />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <h1 className="text-3xl font-bold text-primary mb-2 ml-5 md:ml-0">Homework</h1>
          <p className="text-muted-foreground mb-8">({homeworks.length} assignments)</p>

          {homeworks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-lg">No homework assigned yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedDates.map((date) => (
                <div key={date} className="space-y-0">
                  {/* Folder Header */}
                  <button
                    onClick={() => toggleFolder(date)}
                    className="w-full text-left transition-all duration-200 hover:shadow-md"
                  >
                    <Card className="bg-gradient-to-r from-blue-50 to-blue-25 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Chevron Icon */}
                          <ChevronRight
                            className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-200 flex-shrink-0 ${
                              expandedDate === date ? 'rotate-90' : ''
                            }`}
                          />

                          {/* Folder Icon */}
                          <div className="flex-shrink-0">
                            <Folder className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                          </div>

                          {/* Folder Info */}
                          <div className="flex-1">
                            <p className="font-bold text-foreground text-lg">{formatDateWithDay(date)}</p>
                            <p className="text-sm text-muted-foreground">
                              {groupedByDate[date].length} homework item{groupedByDate[date].length !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {/* Count Badge */}
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
                            {groupedByDate[date].length}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </button>

                  {/* Expanded Folder Contents */}
                  {expandedDate === date && (
                    <div className="mt-2 ml-4 space-y-2 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
                      {groupedByDate[date].map((hw) => (
                        <Card key={hw.id} className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-foreground text-base leading-snug">{hw.title}</h4>
                                {hw.description && (
                                  <p className="text-sm text-muted-foreground mt-2">{hw.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {hw.subject && (
                                <Badge variant="outline" className="text-xs bg-background">
                                  {hw.subject}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs bg-background">
                                Posted: {formatDate(hw.assigned_date ?? '')}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
