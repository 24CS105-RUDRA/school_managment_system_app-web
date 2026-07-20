'use server'

import { createClient } from '@/lib/supabase'

const supabase = createClient()

export interface ClassFacultyAssignment {
  id: string
  standard: string
  division: string
  faculty_id: string
  faculty_name: string
  phone_number: string
  subject: string
  created_at: string
  updated_at: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; code?: string; details?: string; hint?: string }
    if (maybeError.message) return maybeError.message
    const parts = [maybeError.code, maybeError.details, maybeError.hint].filter(Boolean)
    if (parts.length > 0) return parts.join(' | ')
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

async function getClassFacultyFallback(standard: string, division: string) {
  const { data, error } = await supabase
    .from('faculty')
    .select('id, faculty_name, phone_number, subject, assigned_standard, assigned_division')
    .eq('assigned_standard', standard)
    .eq('assigned_division', division)

  if (error) {
    const message = getErrorMessage(error)
    console.warn('[v0] Fallback faculty query failed:', message)
    return { success: false, error: message }
  }

  const transformedData = (data || []).map((faculty: any) => ({
    id: `${faculty.id}-${standard}-${division}`,
    standard,
    division,
    faculty_id: faculty.id,
    faculty_name: faculty.faculty_name || 'Unknown',
    phone_number: faculty.phone_number || '',
    subject: faculty.subject || 'General',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  return { success: true, data: transformedData }
}

// Get all faculty for a specific class
export async function getClassFaculty(standard: string, division: string) {
  try {
    console.log('[v0] Fetching faculty for class:', standard, division)
    
    const { data, error } = await supabase
      .from('class_faculty_assignments')
      .select('id, standard, division, faculty_id, subject, created_at, updated_at')
      .eq('standard', standard)
      .eq('division', division)

    if (error) {
      const message = getErrorMessage(error)
      console.warn('[v0] class_faculty_assignments unavailable, using fallback:', message)
      console.log('[v0] Trying fallback query using faculty.assigned_standard/assigned_division')
      return await getClassFacultyFallback(standard, division)
    }

    console.log('[v0] Assignments found:', data?.length || 0)

    // Now get faculty details for each assignment
    if (!data || data.length === 0) {
      console.log('[v0] No faculty assigned to this class')
      return { success: true, data: [] }
    }

    // Fetch faculty details for each assignment
    const facultyIds = data.map((item: any) => item.faculty_id)
    const { data: facultyData, error: facultyError } = await supabase
      .from('faculty')
      .select('id, faculty_name, phone_number')
      .in('id', facultyIds)

    if (facultyError) {
      const message = getErrorMessage(facultyError)
      console.warn('[v0] Error fetching faculty details:', message)
      return { success: false, error: message }
    }

    // Map faculty details to assignments
    const facultyMap = new Map<string, any>(facultyData?.map((f: any) => [f.id, f]) || [])
    const transformedData = data.map((item: any) => ({
      id: item.id,
      standard: item.standard,
      division: item.division,
      faculty_id: item.faculty_id,
      faculty_name: facultyMap.get(item.faculty_id)?.faculty_name || 'Unknown',
      phone_number: facultyMap.get(item.faculty_id)?.phone_number || '',
      subject: item.subject,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    console.log('[v0] Faculty fetched for class:', transformedData.length)
    return { success: true, data: transformedData }
  } catch (error) {
    const message = getErrorMessage(error)
    console.warn('[v0] Error fetching class faculty:', message)
    console.log('[v0] Retrying with fallback after exception')
    const fallbackResult = await getClassFacultyFallback(standard, division)
    if (fallbackResult.success) {
      return fallbackResult
    }
    return { success: false, error: message || 'Failed to fetch class faculty' }
  }
}

// Add faculty to class with subject
export async function assignFacultyToClass(data: {
  standard: string
  division: string
  faculty_id: string
  subject: string
}) {
  try {
    console.log('[v0] Assigning faculty to class:', data)
    
    const { data: result, error } = await supabase
      .from('class_faculty_assignments')
      .insert([
        {
          faculty_id: data.faculty_id,
          standard: data.standard,
          division: data.division,
          subject: data.subject,
        }
      ])
      .select()

    if (error) {
      console.error('[v0] Error assigning faculty:', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] Faculty assigned successfully')
    return { success: true, data: result }
  } catch (error) {
    console.error('[v0] Error assigning faculty:', error)
    return { success: false, error: 'Failed to assign faculty' }
  }
}

// Remove faculty from class
export async function removeFacultyFromClass(assignmentId: string) {
  try {
    console.log('[v0] Removing faculty assignment:', assignmentId)
    
    const { error } = await supabase
      .from('class_faculty_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) {
      console.error('[v0] Error removing faculty:', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] Faculty removed successfully')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error removing faculty:', error)
    return { success: false, error: 'Failed to remove faculty' }
  }
}

// Get all faculty for assignment dropdown
export async function getAllFacultyForAssignment() {
  try {
    console.log('[v0] Fetching all faculty for assignment')
    
    const { data, error } = await supabase
      .from('faculty')
      .select('id, faculty_name, phone_number')
      .order('faculty_name', { ascending: true })

    if (error) {
      console.error('[v0] Error fetching faculty:', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] Faculty fetched:', data?.length || 0)
    return { success: true, data }
  } catch (error) {
    console.error('[v0] Error fetching faculty:', error)
    return { success: false, error: 'Failed to fetch faculty' }
  }
}

// Update faculty assignment (change subject)
export async function updateFacultyAssignment(
  assignmentId: string,
  updates: { subject: string }
) {
  try {
    console.log('[v0] Updating faculty assignment:', assignmentId, updates)
    
    const { data, error } = await supabase
      .from('class_faculty_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()

    if (error) {
      console.error('[v0] Error updating assignment:', error)
      return { success: false, error: error.message }
    }

    console.log('[v0] Faculty assignment updated successfully')
    return { success: true, data }
  } catch (error) {
    console.error('[v0] Error updating assignment:', error)
    return { success: false, error: 'Failed to update assignment' }
  }
}
