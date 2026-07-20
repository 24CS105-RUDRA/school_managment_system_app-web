'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, CheckCircle, AlertCircle, Search } from 'lucide-react'
import {
  getClassFaculty,
  assignFacultyToClass,
  removeFacultyFromClass,
  getAllFacultyForAssignment,
} from '@/lib/actions/class-faculty'

interface Faculty {
  id: string
  faculty_name: string
  phone_number: string
}

interface ClassFacultyAssignment {
  id: string
  standard: string
  division: string
  faculty_id: string
  faculty_name: string
  phone_number: string
  subject: string
}

interface UserSession {
  username: string
  name: string
}

const STANDARDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const DIVISIONS = ['A', 'B', 'C', 'D']

export default function FacultyClassManagement() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedStandard, setSelectedStandard] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [classFaculty, setClassFaculty] = useState<ClassFacultyAssignment[]>([])
  const [availableFaculty, setAvailableFaculty] = useState<Faculty[]>([])
  const [facultySearch, setFacultySearch] = useState('')
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  useEffect(() => {
    const session = localStorage.getItem('userSession')
    const role = localStorage.getItem('userRole')

    if (!session || role !== 'admin') {
      router.push('/login')
      return
    }

    const userData = JSON.parse(session)
    setUser(userData)
    fetchAvailableFaculty()
    setLoading(false)
  }, [router])

  const fetchAvailableFaculty = async () => {
    console.log('[v0] Fetching all faculty')
    const result = await getAllFacultyForAssignment()
    console.log('[v0] Faculty result:', result)
    if (result.success && result.data) {
      console.log('[v0] Faculty count:', result.data.length)
      setAvailableFaculty(result.data)
    }
  }

  const handleClassChange = async () => {
    if (!selectedStandard || !selectedDivision) return

    console.log('[v0] Fetching faculty for class:', selectedStandard, selectedDivision)
    const result = await getClassFaculty(selectedStandard, selectedDivision)
    console.log('[v0] Class faculty result:', result)
    if (result.success && result.data) {
      setClassFaculty(result.data)
    }
  }

  useEffect(() => {
    handleClassChange()
  }, [selectedStandard, selectedDivision])

  const handleSelectFaculty = (facultyId: string) => {
    setSelectedFacultyId(facultyId)
    setSubject('')
    setMessage('')
  }

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStandard || !selectedDivision || !selectedFacultyId || !subject.trim()) {
      setMessage('Please fill all fields')
      setMessageType('error')
      return
    }

    // Check if faculty already assigned to this class
    const alreadyAssigned = classFaculty.some(f => f.faculty_id === selectedFacultyId)
    if (alreadyAssigned) {
      setMessage('This faculty is already assigned to this class')
      setMessageType('error')
      return
    }

    const result = await assignFacultyToClass({
      standard: selectedStandard,
      division: selectedDivision,
      faculty_id: selectedFacultyId,
      subject: subject.trim(),
    })

    if (result.success) {
      setMessage('Faculty assigned successfully!')
      setMessageType('success')
      setSelectedFacultyId('')
      setSubject('')
      handleClassChange()
    } else {
      setMessage(result.error || 'Failed to assign faculty')
      setMessageType('error')
    }
  }

  const handleRemoveFaculty = async (assignmentId: string, facultyName: string) => {
    if (!confirm(`Remove ${facultyName} from this class?`)) return

    const result = await removeFacultyFromClass(assignmentId)
    if (result.success) {
      setMessage('Faculty removed successfully!')
      setMessageType('success')
      handleClassChange()
    } else {
      setMessage(result.error || 'Failed to remove faculty')
      setMessageType('error')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) return null

  const selectedFacultyData = availableFaculty.find(f => f.id === selectedFacultyId)
  const filteredFaculty = availableFaculty.filter((faculty) =>
    faculty.faculty_name.toLowerCase().includes(facultySearch.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activeSection="faculty-class" />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2 ml-5 md:ml-0">Faculty Class Management</h1>
            <p className="text-muted-foreground">Assign faculty to classes with subjects</p>
          </div>

          {/* Class Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Select Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Standard</Label>
                  <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARDS.map(std => (
                        <SelectItem key={std} value={std}>
                          Class {std}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Division</Label>
                  <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIVISIONS.map(div => (
                        <SelectItem key={div} value={div}>
                          {div}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Faculty Assignment Section */}
          {selectedStandard && selectedDivision && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Faculty List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Select Faculty</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Click on a faculty member to select and assign</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={facultySearch}
                      onChange={(e) => setFacultySearch(e.target.value)}
                      placeholder="Search faculty by name..."
                      className="pl-10"
                    />
                  </div>

                  {filteredFaculty.length > 0 ? (
                    <div className="space-y-2">
                      {filteredFaculty.map(faculty => (
                        <div
                          key={faculty.id}
                          onClick={() => handleSelectFaculty(faculty.id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedFacultyId === faculty.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedFacultyId === faculty.id
                                ? 'border-primary bg-primary'
                                : 'border-border'
                            }`}>
                              {selectedFacultyId === faculty.id && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{faculty.faculty_name}</h3>
                              <p className="text-sm text-muted-foreground">📱 {faculty.phone_number}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No faculty found</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assign Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAssignFaculty} className="space-y-4">
                    {/* Selected Faculty Display */}
                    <div>
                      <Label className="text-sm mb-2 block">Selected Faculty</Label>
                      <div className="p-3 bg-muted rounded-lg min-h-16 flex flex-col justify-center">
                        {selectedFacultyData ? (
                          <div>
                            <p className="font-semibold text-foreground">{selectedFacultyData.faculty_name}</p>
                            <p className="text-sm text-muted-foreground">📱 {selectedFacultyData.phone_number}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No faculty selected</p>
                        )}
                      </div>
                    </div>

                    {/* Subject Input */}
                    <div>
                      <Label className="text-sm">Subject</Label>
                      <Input
                        placeholder="e.g., Mathematics"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={!selectedFacultyId}
                      />
                    </div>

                    {/* Message */}
                    {message && (
                      <div className={`p-3 rounded-lg flex gap-2 items-start text-sm ${
                        messageType === 'success' 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {messageType === 'success' ? (
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{message}</span>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={!selectedFacultyId}
                        className="flex-1"
                      >
                        Assign Faculty
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedFacultyId('')
                          setSubject('')
                          setMessage('')
                        }}
                        className="flex-1"
                      >
                        Clear
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assigned Faculty List */}
          {selectedStandard && selectedDivision && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Faculty Assigned to Class {selectedStandard}-{selectedDivision}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {classFaculty.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classFaculty.map(faculty => (
                      <div
                        key={faculty.id}
                        className="p-4 border-l-4 border-l-primary rounded-lg bg-card hover:shadow-md transition-shadow"
                      >
                        <h4 className="font-semibold text-foreground text-base">{faculty.faculty_name}</h4>
                        <p className="text-sm text-primary font-medium mt-2">Subject: {faculty.subject}</p>
                        <p className="text-sm text-muted-foreground mt-1">📱 {faculty.phone_number}</p>
                        <button
                          onClick={() => handleRemoveFaculty(faculty.id, faculty.faculty_name)}
                          className="mt-4 w-full p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No faculty assigned to this class yet
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
