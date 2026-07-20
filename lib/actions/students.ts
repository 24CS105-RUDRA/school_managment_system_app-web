'use server'

import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import {
sanitizePhoneNumber,
validatePhoneNumber,
validateEmail,
validateName,
validateRollNumber,
} from '@/lib/validations'
import type { StudentProfile, CreateStudentData, ActionResult } from '@/types'

const supabase = createClient()

function normalizeOptional(value?: string): string | null {
if (value === undefined || value === null) return null
const trimmed = value.trim()
return trimmed.length > 0 ? trimmed : null
}

function trimInput(value: string): string {
return value?.trim() || ''
}

export async function createStudent(data: CreateStudentData): Promise<{
  success: boolean
  data?: StudentProfile
  error?: string
}> {
  try {
    const sanitizedPhone = sanitizePhoneNumber(data.phone_number || '')
    
    if (!sanitizedPhone) {
      return { success: false, error: 'Phone number is required for student registration' }
    }
    
    const phoneValidation = validatePhoneNumber(sanitizedPhone, { required: true })
    if (!phoneValidation.isValid) {
      return { success: false, error: phoneValidation.errors.join(', ') }
    }
    
  const sanitizedName = trimInput(data.full_name)
    const nameValidation = validateName(sanitizedName, 'Full name')
    if (!nameValidation.isValid) {
      return { success: false, error: nameValidation.errors.join(', ') }
    }
    
    const sanitizedRollNumber = trimInput(data.roll_number)
    const rollValidation = validateRollNumber(sanitizedRollNumber)
    if (!rollValidation.isValid) {
      return { success: false, error: rollValidation.errors.join(', ') }
    }
    
    if (!data.standard || !data.division) {
      return { success: false, error: 'Class and division are required' }
    }
    
    if (data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' }
    }
    
    const username = sanitizedPhone
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingUser) {
    return { success: false, error: `Phone number '${sanitizedPhone}' is already registered. Please use a different phone number.` }
  }

  const { data: existingRollNumber } = await supabase
      .from('students')
      .select('id')
      .eq('roll_number', sanitizedRollNumber)
      .eq('standard', data.standard)
      .eq('division', data.division)
      .maybeSingle()

    if (existingRollNumber) {
      return { success: false, error: `Roll number '${sanitizedRollNumber}' already exists in Class ${data.standard}-${data.division}. Please use a different roll number.` }
    }
    
    const { data: existingPhone } = await supabase
      .from('students')
      .select('id')
      .eq('phone_number', sanitizedPhone)
      .maybeSingle()

    if (existingPhone) {
      return { success: false, error: `Phone number '${sanitizedPhone}' is already registered.` }
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      username: username,
      password_hash: passwordHash,
      full_name: sanitizedName,
      role: 'student',
      year_of_study: data.standard,
      division: data.division,
      standard: data.standard,
    })
    .select()
    .single()

    if (userError) {
      console.log('[v0] User creation error:', userError)
      return { success: false, error: userError.message }
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: user.id,
        roll_number: sanitizedRollNumber,
        standard: data.standard,
        division: data.division,
        student_name: sanitizedName,
        phone_number: sanitizedPhone,
        father_mobile: data.father_mobile ? sanitizePhoneNumber(data.father_mobile) : null,
        mother_mobile: data.mother_mobile ? sanitizePhoneNumber(data.mother_mobile) : null,
        date_of_birth: normalizeOptional(data.date_of_birth),
      })
      .select()
      .single()

    if (studentError) {
      console.log('[v0] Student creation error:', studentError)
      return { success: false, error: studentError.message }
    }

return {
success: true,
data: student as StudentProfile,
}
  } catch (error) {
    console.log('[v0] Create student exception:', error)
    return { success: false, error: 'Failed to create student' }
  }
}

export async function getStudentsByClass(
  standard: string,
  division?: string
): Promise<{
  success: boolean
  data?: StudentProfile[]
  error?: string
}> {
  try {
    let query = supabase
      .from('students')
      .select(
        `
        *,
        user_id (
          full_name,
          email,
          username
        )
      `
      )
      .eq('standard', standard)

    if (division) {
      query = query.eq('division', division)
    }

    const { data: students, error } = await query.order('roll_number')

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: students }
  } catch (error) {
    return { success: false, error: 'Failed to fetch students' }
  }
}

export async function getStudentProfile(studentId: string): Promise<{
  success: boolean
  data?: StudentProfile
  error?: string
}> {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select(
        `
        *,
        user_id (
          full_name,
          email,
          username
        )
      `
      )
      .eq('id', studentId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: student as StudentProfile }
  } catch (error) {
    return { success: false, error: 'Failed to fetch student profile' }
  }
}

export async function updateStudent(
  studentId: string,
  updates: Partial<CreateStudentData>
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get student first
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', studentId)
      .single()

    if (fetchError) {
      return { success: false, error: 'Student not found' }
    }

    // Update student profile
    const studentUpdates: any = {}
    if (updates.roll_number !== undefined) studentUpdates.roll_number = updates.roll_number
    if (updates.phone_number !== undefined) studentUpdates.phone_number = normalizeOptional(updates.phone_number)
    if (updates.father_mobile !== undefined) studentUpdates.father_mobile = normalizeOptional(updates.father_mobile)
    if (updates.mother_mobile !== undefined) studentUpdates.mother_mobile = normalizeOptional(updates.mother_mobile)
    if (updates.date_of_birth !== undefined) studentUpdates.date_of_birth = normalizeOptional(updates.date_of_birth)
    if (updates.standard !== undefined) studentUpdates.standard = updates.standard
    if (updates.division !== undefined) studentUpdates.division = updates.division

    if (Object.keys(studentUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('students')
        .update(studentUpdates)
        .eq('id', studentId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    }

  // Update user profile if needed
  const userUpdates: any = {}
  if (updates.full_name !== undefined) userUpdates.full_name = updates.full_name
  if (updates.email !== undefined) userUpdates.email = updates.email

  if (Object.keys(userUpdates).length > 0) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', student.user_id)

      if (userUpdateError) {
        return { success: false, error: userUpdateError.message }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update student' }
  }
}

export async function deleteStudent(studentId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get student user_id
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', studentId)
      .single()

    if (fetchError) {
      return { success: false, error: 'Student not found' }
    }

    // Delete user (cascade will delete student)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', student.user_id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete student' }
  }
}

export async function getAllStudents(): Promise<{
  success: boolean
  data?: StudentProfile[]
  error?: string
}> {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select(
        `
        *,
        user_id (
          full_name,
          email,
          username
        )
        `
      )
      .order('standard')
      .order('division')
      .order('roll_number')

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: students }
  } catch (error) {
    return { success: false, error: 'Failed to fetch students' }
  }
}

export async function getStudentByUserId(userId: string): Promise<{
  success: boolean
  data?: StudentProfile
  error?: string
}> {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select(
        `
        *,
        user_id (
          full_name,
          email,
          username,
          date_of_birth
        )
        `
      )
      .eq('user_id', userId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: student as StudentProfile }
  } catch (error) {
    return { success: false, error: 'Failed to fetch student profile' }
  }
}
