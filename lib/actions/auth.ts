'use server'

import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { sanitizePhoneNumber, validatePhoneNumber, validatePassword } from '@/lib/validations'
import { setSessionTokens, clearSession } from '@/lib/middleware/session'
import type { TokenPayload } from '@/lib/middleware/auth'

const supabase = createClient()

interface LoginCredentials {
  username: string
  password: string
  role: 'student' | 'faculty' | 'admin'
}

interface LoginResponse {
  success: boolean
  data?: {
    id: string
    username: string
    full_name: string
    email: string
    role: string
    year_of_study?: string
    division?: string
    standard?: string
  }
  error?: string
}

const MAX_LOGIN_ATTEMPTS = 5
const FIRST_LOCKOUT_DURATION_MS = 1 * 60 * 1000
const SUBSEQUENT_LOCKOUT_DURATION_MS = 5 * 60 * 1000
const loginAttempts = new Map<string, { count: number; lockedUntil?: number; lockoutCount: number }>()

function isAccountLocked(username: string): boolean {
  const attempts = loginAttempts.get(username)
  if (!attempts) return false
  
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    return true
  }
  
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    loginAttempts.delete(username)
    return false
  }
  
  return false
}

function recordFailedAttempt(username: string): void {
  const attempts = loginAttempts.get(username) || { count: 0, lockoutCount: 0 }
  attempts.count++

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const lockoutDuration = attempts.lockoutCount === 0 
      ? FIRST_LOCKOUT_DURATION_MS 
      : SUBSEQUENT_LOCKOUT_DURATION_MS
    attempts.lockedUntil = Date.now() + lockoutDuration
    attempts.lockoutCount++
  }

  loginAttempts.set(username, attempts)
}

function clearFailedAttempts(username: string): void {
  loginAttempts.delete(username)
}

function getRemainingAttempts(username: string): number {
  const attempts = loginAttempts.get(username)
  if (!attempts) return MAX_LOGIN_ATTEMPTS
  return Math.max(0, MAX_LOGIN_ATTEMPTS - attempts.count)
}

export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const { username, password, role } = credentials

    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required',
      }
    }

    const sanitizedUsername = role === 'admin' 
      ? username.trim() 
      : sanitizePhoneNumber(username)

    if (role !== 'admin' && !validatePhoneNumber(sanitizedUsername, { required: true }).isValid) {
      return {
        success: false,
        error: 'Please enter a valid 10-digit mobile number',
      }
    }

    if (isAccountLocked(sanitizedUsername)) {
      const attempts = loginAttempts.get(sanitizedUsername)
      const remainingMinutes = attempts?.lockedUntil 
        ? Math.ceil((attempts.lockedUntil - Date.now()) / 60000) 
        : 15
      return {
        success: false,
        error: `Account temporarily locked. Please try again in ${remainingMinutes} minutes.`,
      }
    }

    console.log('[v0] Auth: Querying user with username:', sanitizedUsername, 'role:', role)

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', sanitizedUsername)
      .eq('role', role)
      .maybeSingle()

    console.log('[v0] Auth: Query result - user found:', !!user, 'error:', userError)

    if (userError) {
      console.error('[v0] Database error:', userError)
      return {
        success: false,
        error: 'Login failed. Please try again.',
      }
    }

    if (!user) {
      console.log('[v0] Auth: No user found with username:', sanitizedUsername, 'and role:', role)
      recordFailedAttempt(sanitizedUsername)
      const remaining = getRemainingAttempts(sanitizedUsername)
      return {
        success: false,
        error: `Invalid credentials. ${remaining} attempts remaining.`,
      }
    }

    console.log('[v0] Auth: Verifying password for user:', sanitizedUsername)
    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    console.log('[v0] Auth: Password match result:', passwordMatch)

    if (!passwordMatch) {
      recordFailedAttempt(sanitizedUsername)
      const remaining = getRemainingAttempts(sanitizedUsername)
      return {
        success: false,
        error: `Invalid credentials. ${remaining} attempts remaining.`,
      }
    }

    clearFailedAttempts(sanitizedUsername)

    console.log('[v0] Auth: Login successful for user:', sanitizedUsername)

    const sessionUser: TokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      full_name: user.full_name,
      year_of_study: user.year_of_study ?? undefined,
      division: user.division ?? undefined,
      standard: user.standard ?? undefined,
    }

    await setSessionTokens(sessionUser)

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        year_of_study: user.year_of_study,
        division: user.division,
        standard: user.standard,
      },
    }
  } catch (error) {
    console.error('[v0] Login error:', error)
    return {
      success: false,
      error: 'Login failed. Please try again.',
    }
  }
}

export async function registerUser(userData: {
  username: string
  password: string
  full_name: string
  email: string
  role: 'student' | 'faculty'
  year_of_study?: string
  division?: string
  standard?: string
}): Promise<LoginResponse> {
  try {
    const passwordHash = await bcrypt.hash(userData.password, 10)

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        password_hash: passwordHash,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        year_of_study: userData.year_of_study,
        division: userData.division,
        standard: userData.standard,
      })
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        year_of_study: user.year_of_study,
        division: user.division,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'Registration failed. Please try again.',
    }
  }
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!oldPassword || !newPassword) {
      return { success: false, error: 'Current password and new password are required' }
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return { success: false, error: passwordValidation.errors.join(', ') }
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .maybeSingle()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash)
    if (!passwordMatch) {
      return { success: false, error: 'Current password is incorrect' }
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Password change failed' }
  }
}

export async function seedDemoUsers(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if admin user already exists
    const { data: adminUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .eq('role', 'admin')
      .maybeSingle()

    if (adminUser) {
      return { success: true, message: 'Admin user already exists' }
    }

    // Create admin user only
    const adminPassword = await bcrypt.hash('admin123', 10)

    const { data: insertedUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        password_hash: adminPassword,
        full_name: 'Administrator',
        email: 'admin@school.com',
        role: 'admin',
        year_of_study: null,
        division: null,
        standard: null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[v0] Seed error:', insertError)
      return { success: false, message: `Failed to seed admin user: ${insertError.message}` }
    }

    return { success: true, message: 'Admin user created successfully' }
  } catch (error) {
    console.error('[v0] Seed function error:', error)
    return { success: false, message: 'Failed to seed admin user' }
  }
}

export async function logoutUser(): Promise<{ success: boolean }> {
  await clearSession()
  return { success: true }
}
