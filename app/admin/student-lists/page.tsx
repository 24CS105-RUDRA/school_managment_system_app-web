'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { createStudent, getAllStudents, deleteStudent, updateStudent } from '@/lib/actions/students'

interface Student {
  id: string
  roll_number: string
  standard: string
  division: string
  student_name?: string
  phone_number?: string
  parent_contact?: string
  date_of_birth?: string | null
  user_id?: string
  user?: {
    full_name: string
    email: string
    username: string
  }
}

export default function StudentListsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    roll_number: '',
    standard: '10',
    division: 'A',
    phone_number: '',
    parent_contact: '',
    date_of_birth: '',
  })

  const fetchStudents = async () => {
    const result = await getAllStudents()
    if (result.success) {
      console.log('[v0] Students fetched:', result.data)
      setStudents(result.data || [])
    } else {
      console.error('[v0] Error fetching students:', result.error)
    }
  }

  useEffect(() => {
    const session = localStorage.getItem('userSession')
    const role = localStorage.getItem('userRole')

    if (!session || role !== 'admin') {
      router.push('/login')
      return
    }

    setUser(JSON.parse(session))
    setLoading(false)
    fetchStudents()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.password || !formData.full_name || !formData.email) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      const result = await createStudent(formData)

      if (result.success) {
        console.log('[v0] Student created:', result.data)
        setFormData({
          username: '',
          password: '',
          full_name: '',
          email: '',
          roll_number: '',
          standard: '10',
          division: 'A',
          phone_number: '',
          parent_contact: '',
          date_of_birth: '',
        })
        setShowForm(false)
        await fetchStudents()
        alert('Student added successfully! Credentials: ' + formData.username + ' / ' + formData.password)
      } else {
        alert(`Error: ${result.error}`)
        console.error('[v0] Create student error:', result.error)
      }
    } catch (error) {
      console.error('[v0] Submit error:', error)
      alert('Failed to create student')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const result = await deleteStudent(studentId)
      if (result.success) {
        await fetchStudents()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('[v0] Delete error:', error)
    }
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id)
    setFormData({
      username: student.user?.username ?? '',
      password: '',
      full_name: student.student_name || student.user?.full_name || '',
      email: student.user?.email ?? '',
      roll_number: student.roll_number,
      standard: student.standard,
      division: student.division,
      phone_number: student.phone_number || '',
      parent_contact: student.parent_contact || '',
      date_of_birth: student.date_of_birth || '',
    })
    setShowForm(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingStudentId) return

    try {
      const result = await updateStudent(editingStudentId, {
        full_name: formData.full_name,
        email: formData.email,
        roll_number: formData.roll_number,
        standard: formData.standard,
        division: formData.division,
        phone_number: formData.phone_number,
        father_mobile: formData.parent_contact,
        date_of_birth: formData.date_of_birth,
      })

      if (result.success) {
        alert('Student updated successfully!')
        setEditingStudentId(null)
        setFormData({
          username: '',
          password: '',
          full_name: '',
          email: '',
          roll_number: '',
          standard: '10',
          division: 'A',
          phone_number: '',
          parent_contact: '',
          date_of_birth: '',
        })
        setShowForm(false)
        await fetchStudents()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('[v0] Update error:', error)
      alert('Failed to update student')
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!user) return null

  const standardDivisions = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const divisions = ['A', 'B', 'C', 'D']

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activeSection="student-lists" />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-primary ml-5 md:ml-0">Student Management</h1>
            <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Student
            </Button>
          </div>

          {/* Add/Edit Student Form */}
          {showForm && (
            <Card className="mb-8 border-2 border-accent">
              <CardHeader>
                <CardTitle>{editingStudentId ? 'Edit Student' : 'Add New Student'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingStudentId ? handleSaveEdit : handleSubmit} className="grid md:grid-cols-2 gap-4">
                  {!editingStudentId && (
                    <>
                      <div>
                        <Label>Username *</Label>
                        <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                      </div>
                      <div>
                        <Label>Password *</Label>
                        <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Roll Number</Label>
                    <Input value={formData.roll_number} onChange={(e) => setFormData({...formData, roll_number: e.target.value})} />
                  </div>
                  <div>
                    <Label>Standard (Class)</Label>
                    <select className="w-full border border-border rounded px-3 py-2 bg-background text-foreground" value={formData.standard} onChange={(e) => setFormData({...formData, standard: e.target.value})}>
                      <option value="">Select Standard</option>
                      {standardDivisions.map(std => <option key={std} value={std}>Class {std}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Division (A/B/C/D)</Label>
                    <select className="w-full border border-border rounded px-3 py-2 bg-background text-foreground" value={formData.division} onChange={(e) => setFormData({...formData, division: e.target.value})}>
                      <option value="">Select Division</option>
                      {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
                  </div>
                  <div>
                    <Label>Parent Contact</Label>
                    <Input value={formData.parent_contact} onChange={(e) => setFormData({...formData, parent_contact: e.target.value})} />
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 flex gap-3">
                    <Button type="submit" disabled={submitting} className="bg-accent hover:bg-accent/90">
                      {submitting ? (editingStudentId ? 'Saving...' : 'Creating...') : (editingStudentId ? 'Save Changes' : 'Add Student')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setShowForm(false)
                      setEditingStudentId(null)
                      setFormData({
                        username: '',
                        password: '',
                        full_name: '',
                        email: '',
                        roll_number: '',
                        standard: '10',
                        division: 'A',
                        phone_number: '',
                        parent_contact: '',
                        date_of_birth: '',
                      })
                    }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Students List */}
          <Card>
            <CardHeader>
              <CardTitle>All Students ({students.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Roll #</th>
                      <th className="text-left py-3 px-4 font-semibold">Std/Div</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-border hover:bg-accent/10">
                        <td className="py-3 px-4">{student.student_name || student.user?.full_name || 'N/A'}</td>
                        <td className="py-3 px-4">{student.roll_number || 'N/A'}</td>
                        <td className="py-3 px-4">{student.standard}/{student.division}</td>
                        <td className="py-3 px-4 text-sm">{student.user?.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm">{student.phone_number || 'N/A'}</td>
                        <td className="py-3 px-4 flex gap-2">
                          <button onClick={() => handleEditStudent(student)} className="p-2 rounded hover:bg-accent/20 text-accent">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(student.id)} className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length === 0 && <p className="text-center py-4 text-muted-foreground">No students found</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
