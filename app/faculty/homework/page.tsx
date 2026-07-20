'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FacultySidebar } from '@/components/layout/faculty-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { createHomework, getHomeworkByFaculty, deleteHomework } from '@/lib/actions/homework'
import { getFacultyByUserId } from '@/lib/actions/faculty'

interface Faculty {
  id: string
  user_id: string
  assigned_standard?: string | null
  assigned_division?: string | null
  subject?: string
  faculty_name?: string
}

interface User {
  id: string
  username: string
  full_name: string
}

interface Homework {
  id: string
  title: string
  description?: string
  standard: string
  division?: string
  subject: string
  due_date: string
  assigned_date?: string
  faculty_id: string
}

export default function HomeworkPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [faculty, setFaculty] = useState<Faculty | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [homeworks, setHomeworks] = useState<Homework[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    standard: '',
    division: '',
    dueDate: '',
  })

  const fetchFacultyProfileWithRetry = async (userId: string, retries = 1) => {
    let lastResult: Awaited<ReturnType<typeof getFacultyByUserId>> | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await getFacultyByUserId(userId)
      lastResult = result

      const isFetchFailure = typeof result.error === 'string' && result.error.toLowerCase().includes('fetch failed')
      if (!isFetchFailure || attempt === retries) {
        return result
      }

      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return lastResult || { success: false, error: 'Failed to fetch faculty profile' }
  }

  const fetchHomeworks = async (facultyId: string) => {
    try {
      const result = await getHomeworkByFaculty(facultyId)
      if (result.success && result.data) {
        console.log('[v0] Homeworks fetched:', result.data)
        setHomeworks(result.data)
      }
    } catch (error) {
      console.error('[v0] Error fetching homeworks:', error)
    }
  }

  useEffect(() => {
    const session = localStorage.getItem('userSession')
    const role = localStorage.getItem('userRole')

    if (!session || role !== 'faculty') {
      router.push('/login')
      return
    }

    const userData = JSON.parse(session) as User
    setUser(userData)

    const loadFacultyAndHomework = async () => {
      try {
        const result = await fetchFacultyProfileWithRetry(userData.id)
        if (result.success && result.data) {
          console.log('[v0] Faculty profile:', result.data)
          setFaculty(result.data)
          await fetchHomeworks(result.data.id)
        } else {
          console.error('[v0] Error fetching faculty profile:', result.error)
        }
      } finally {
        setLoading(false)
      }
    }

    loadFacultyAndHomework()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !faculty) {
      alert('Faculty information not available')
      return
    }

    if (!formData.title || !formData.standard || !formData.division || !formData.dueDate) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const result = await createHomework({
        faculty_id: faculty.id,
        standard: formData.standard,
        division: formData.division,
        subject: faculty.subject ?? '',
        title: formData.title,
        description: formData.description,
        due_date: formData.dueDate,
      })

      console.log('[v0] Create homework result:', result)

      if (result.success) {
        alert('Homework posted successfully!')
        setFormData({ title: '', description: '', standard: '', division: '', dueDate: '' })
        setShowForm(false)
        // Refresh homeworks list
        await fetchHomeworks(faculty.id)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('[v0] Error posting homework:', error)
      alert('Failed to post homework')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteHomework = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homework?')) {
      return
    }

    try {
      const result = await deleteHomework(id)

      if (result.success) {
        alert('Homework deleted successfully!')
        setHomeworks(homeworks.filter((h) => h.id !== id))
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('[v0] Error deleting homework:', error)
      alert('Failed to delete homework')
    }
  }

  if (loading) return <div>Loading...</div>
  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <FacultySidebar activeSection="homework" />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary ml-5 md:ml-0">Post Homework</h1>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              disabled={!faculty}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Assignment
            </Button>
          </div>

          {/* New Homework Form */}
          {showForm && (
            <Card className="mb-8 border-2 border-accent">
              <CardHeader>
                <CardTitle>Assign New Homework</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="title" className="text-foreground font-semibold">
                      Assignment Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Algebra Equations"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-2 bg-background border-border"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="standard" className="text-foreground font-semibold">
                        Class (Standard) *
                      </Label>
                      <select
                        id="standard"
                        value={formData.standard}
                        onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                        className="w-full mt-2 p-2 rounded-lg border border-border bg-background text-foreground"
                        required
                      >
                        <option value="">Select Standard</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((std) => (
                          <option key={std} value={std.toString()}>
                            Standard {std}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="division" className="text-foreground font-semibold">
                        Division *
                      </Label>
                      <select
                        id="division"
                        value={formData.division}
                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                        className="w-full mt-2 p-2 rounded-lg border border-border bg-background text-foreground"
                        required
                      >
                        <option value="">Select Division</option>
                        <option value="A">Division A</option>
                        <option value="B">Division B</option>
                        <option value="C">Division C</option>
                        <option value="D">Division D</option>
                        <option value="E">Division E</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-foreground font-semibold">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Provide homework details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-2 bg-background border-border h-24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dueDate" className="text-foreground font-semibold">
                      Date for Homework *
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="mt-2 bg-background border-border"
                      required
                    />
                  </div>

                  {faculty && (
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm text-foreground mt-1">
                        <strong>Posted for:</strong> Standard {formData.standard || '?'}, Division {formData.division || '?'} on {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('en-IN') : '?'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button 
                      type="submit"
                      disabled={submitting}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      {submitting ? 'Posting...' : 'Post Assignment'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Posted Homework */}
          <Card>
            <CardHeader>
              <CardTitle>Posted Assignments ({homeworks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {homeworks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No homework posted yet.</p>
              ) : (
                homeworks.map((hw) => (
                  <div
                    key={hw.id}
                    className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-primary mb-2">{hw.title}</h3>
                        {hw.description && (
                          <p className="text-sm text-muted-foreground mb-3">{hw.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="outline">Class {hw.standard}{hw.division}</Badge>
                          <Badge variant="outline">{hw.subject}</Badge>
                          <span className="text-sm text-muted-foreground">
                            For: {new Date(hw.due_date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHomework(hw.id)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
