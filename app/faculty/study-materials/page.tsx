'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { FacultySidebar } from '@/components/layout/faculty-sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Trash2, FileText, Folder, ChevronRight, FolderPlus } from 'lucide-react'
import { createStudyMaterial, getStudyMaterialsByFaculty, deleteStudyMaterial } from '@/lib/actions/study-materials'
import { createFolder, getFoldersByFaculty, deleteFolder } from '@/lib/actions/study-material-folders'
import { getFacultyByUserId } from '@/lib/actions/faculty'

interface Faculty {
  id: string
  subject?: string
  faculty_name?: string
}

interface User {
  id: string
  username: string
  full_name: string
}

interface Material {
  id: string
  title: string
  description: string
  subject: string
  standard: string
  file_type: string
  file_url: string
  uploaded_date: string
  is_downloadable: boolean
  folder_id?: string
}

interface FolderWithChildren {
  id: string
  folder_name: string
  parent_folder_id?: string
  faculty_id: string
  standard: string
  subject: string
  created_at: string
  children?: FolderWithChildren[]
  materials?: Material[]
}

export default function StudyMaterialsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [faculty, setFaculty] = useState<Faculty | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [folders, setFolders] = useState<FolderWithChildren[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [currentFolderStandard, setCurrentFolderStandard] = useState<string>('10')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null as File | null,
    isDownloadable: true,
    parent_folder_id: null as string | null,
  })

  const [folderForm, setFolderForm] = useState({
    folder_name: '',
    standard: '',
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

  const fetchFoldersAndMaterials = async (facultyId: string, standard: string) => {
    try {
      const foldersResult = await getFoldersByFaculty(facultyId, standard)
      if (foldersResult.success && foldersResult.data) {
        setFolders(foldersResult.data)
      }

      const materialsResult = await getStudyMaterialsByFaculty(facultyId)
      if (materialsResult.success && materialsResult.data) {
        setMaterials(materialsResult.data)
      }
    } catch (error) {
      console.error('[v0] Error fetching data:', error)
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

    const fetchData = async () => {
      try {
        const result = await fetchFacultyProfileWithRetry(userData.id)
        if (result.success && result.data) {
          const facultyData = result.data
          setFaculty(facultyData)
          const assignedStandard = facultyData.assigned_standard || '10'
          setCurrentFolderStandard(assignedStandard)
          await fetchFoldersAndMaterials(facultyData.id, assignedStandard)
        } else {
          console.error('[v0] Error fetching faculty profile:', result.error)
        }
      } catch (error) {
        console.error('[v0] Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !faculty) {
      alert('Faculty information not available')
      return
    }

    if (!folderForm.folder_name || !folderForm.standard) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const selectedStandard = folderForm.standard // Save standard before state reset
      const result = await createFolder({
        faculty_id: faculty.id,
        folder_name: folderForm.folder_name,
        parent_folder_id: currentFolderId || undefined,
        standard: selectedStandard,
        subject: faculty.subject ?? '',
      })

      if (result.success) {
        console.log('[v0] Folder created successfully:', result.data)
        alert('Folder created successfully!')
        setFolderForm({ folder_name: '', standard: '' })
        setShowFolderForm(false)
        // Use the selected standard to fetch, not the reset state value
        await fetchFoldersAndMaterials(faculty.id, selectedStandard)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('[v0] Error creating folder:', error)
      alert('Failed to create folder')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !faculty) {
      alert('Faculty information not available')
      return
    }

    if (!formData.title || !formData.file) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)

    try {
      // Upload file to Vercel Blob
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)

      const uploadResponse = await fetch('/api/upload-material', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'File upload failed' }))
        throw new Error(errorData.error || 'File upload failed')
      }

      const uploadedFile = await uploadResponse.json()
      const today = new Date().toISOString().split('T')[0]

      const result = await createStudyMaterial({
        faculty_id: faculty.id,
        title: formData.title,
        description: formData.description,
        subject: faculty.subject ?? '',
        standard: currentFolderStandard,
        file_url: uploadedFile.url,
        file_type: uploadedFile.type,
        uploaded_date: today,
        is_downloadable: formData.isDownloadable,
        folder_id: formData.parent_folder_id || undefined,
      })

      if (result.success) {
        alert('Material uploaded successfully!')
        setFormData({ title: '', description: '', file: null, isDownloadable: true, parent_folder_id: null })
        setShowForm(false)
        await fetchFoldersAndMaterials(faculty.id, currentFolderStandard)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('[v0] Error uploading material:', error)
      alert('Failed to upload material')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return

    try {
      const result = await deleteFolder(id)

      if (result.success) {
        alert('Folder deleted successfully!')
        if (faculty) {
          await fetchFoldersAndMaterials(faculty.id, folderForm.standard || '10')
        }
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('[v0] Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const handleDeleteMaterial = async (id: string, fileUrl?: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return

    try {
      const result = await deleteStudyMaterial(id, fileUrl)

      if (result.success) {
        alert('Material deleted successfully!')
        setMaterials(materials.filter((m) => m.id !== id))
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('[v0] Error deleting material:', error)
      alert('Failed to delete material')
    }
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const getFolderMaterials = (folderId: string | null) => {
    return materials.filter((m) => m.folder_id === folderId)
  }

  const findFolderById = (folderList: FolderWithChildren[], folderId: string): FolderWithChildren | null => {
    for (const folder of folderList) {
      if (folder.id === folderId) return folder
      if (folder.children) {
        const found = findFolderById(folder.children, folderId)
        if (found) return found
      }
    }
    return null
  }

  const getFolderOptions = (folderList: FolderWithChildren[], prefix = '') => {
    const options: ReactElement[] = []
    for (const folder of folderList) {
      options.push(
        <option key={folder.id} value={folder.id}>
          {prefix} {folder.folder_name} (Class {folder.standard})
        </option>
      )
      if (folder.children) {
        options.push(...getFolderOptions(folder.children, prefix + '└─'))
      }
    }
    return options
  }

  const renderFolderTree = (folderList: FolderWithChildren[], level = 0) => {
    return folderList.map((folder) => (
      <div key={folder.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded">
          <button
            onClick={() => toggleFolder(folder.id)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`}
            />
          </button>
          <Folder className="w-5 h-5 text-yellow-600" />
          <span className="flex-1 font-semibold">{folder.folder_name}</span>
          <button
            onClick={() => {
              setCurrentFolderId(folder.id)
              setCurrentFolderStandard(folder.standard)
              setFormData({ ...formData, parent_folder_id: folder.id })
            }}
            className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900"
            title="Upload to this folder"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteFolder(folder.id)}
            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {expandedFolders.has(folder.id) && (
          <div>
            {/* Render materials in this folder */}
            {getFolderMaterials(folder.id).map((material) => (
              <div key={material.id} style={{ marginLeft: `${(level + 1) * 20 + 20}px` }} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded my-2">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{material.title}</p>
                      <p className="text-xs text-muted-foreground">{material.file_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMaterial(material.id, material.file_url)}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Render subfolders */}
            {folder.children && folder.children.length > 0 && renderFolderTree(folder.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <FacultySidebar activeSection="study-materials" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background">
      <FacultySidebar activeSection="study-materials" />

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2 ml-5 md:ml-0">Study Materials</h1>
              <p className="text-muted-foreground">Upload and organize study materials for your students</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowFolderForm(true)} disabled={!faculty} variant="outline" className="gap-2">
                <FolderPlus className="w-4 h-4" />
                New Folder
              </Button>
              <Button onClick={() => setShowForm(true)} disabled={!faculty} className="gap-2">
                <Plus className="w-4 h-4" />
                Upload Material
              </Button>
            </div>
          </div>

          {/* Create Folder Form */}
          {showFolderForm && (
            <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle>Create New Folder</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateFolder} className="space-y-4">
                  <div>
                    <Label className="text-foreground font-semibold">Folder Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Chapter 1, Unit 2..."
                      value={folderForm.folder_name}
                      onChange={(e) => setFolderForm({ ...folderForm, folder_name: e.target.value })}
                      className="mt-2 bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-foreground font-semibold">Standard/Class</Label>
                    <select
                      value={folderForm.standard}
                      onChange={(e) => setFolderForm({ ...folderForm, standard: e.target.value })}
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="">Select Class</option>
                      {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((std) => (
                        <option key={std} value={std}>
                          Class {std}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentFolderId && (
                    <div className="text-sm text-muted-foreground p-2 bg-background rounded">
                      📁 Parent: {currentFolderId}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Create Folder
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowFolderForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Upload Form */}
          {showForm && (
            <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle>Upload Study Material</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-foreground font-semibold">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Material title..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-2 bg-background"
                    />
                  </div>

                  <div>
                    <Label htmlFor="parentFolder" className="text-foreground font-semibold">
                      Parent Folder (Optional)
                    </Label>
                    <select
                      id="parentFolder"
                      value={formData.parent_folder_id || ''}
                      onChange={(e) => {
                        const folderId = e.target.value
                        const folder = findFolderById(folders, folderId)
                        if (folder) {
                          setFormData({ ...formData, parent_folder_id: folderId })
                          setCurrentFolderStandard(folder.standard)
                        }
                      }}
                      className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="">Root Level</option>
                      {getFolderOptions(folders)}
                    </select>
                    {currentFolderId && (
                      <p className="text-xs text-muted-foreground mt-1">Selected for Class {currentFolderStandard}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="file" className="text-foreground font-semibold">
                      File *
                    </Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                      className="mt-2 bg-background"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-foreground font-semibold">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Provide material details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-2 bg-background border-border h-20"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
                    <input
                      id="isDownloadable"
                      type="checkbox"
                      checked={formData.isDownloadable}
                      onChange={(e) => setFormData({ ...formData, isDownloadable: e.target.checked })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <Label htmlFor="isDownloadable" className="text-foreground font-semibold cursor-pointer flex-1">
                      Allow students to download this material
                    </Label>
                  </div>

                  {currentFolderId && (
                    <div className="text-sm text-muted-foreground p-2 bg-background rounded">
                      📁 Uploading to: {currentFolderId}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? 'Uploading...' : 'Upload Material'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Folder Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Folder Structure</CardTitle>
            </CardHeader>
            <CardContent>
              {folders.length === 0 ? (
                <p className="text-muted-foreground">No folders yet. Create one to get started!</p>
              ) : (
                <div className="space-y-2">{renderFolderTree(folders)}</div>
              )}

              {/* Root level materials (not in any folder) */}
              {getFolderMaterials(null).length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <p className="font-semibold mb-3">Materials (not in any folder)</p>
                  {getFolderMaterials(null).map((material) => (
                    <div key={material.id} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded mb-2">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{material.title}</p>
                            <p className="text-xs text-muted-foreground">{material.file_type}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMaterial(material.id, material.file_url)}
                          className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
