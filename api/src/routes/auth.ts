import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../config/database.js'
import { signToken, type TokenPayload } from '../config/auth.js'
import { ok, fail } from '../utils/response.js'
import { sanitizePhoneNumber, validatePhoneNumber } from '../lib/validations.js'

interface LoginBody {
  username?: string
  password?: string
  role?: 'student' | 'faculty' | 'admin'
}

const MAX_ATTEMPTS = 5
const lockoutMap = new Map<string, { count: number; lockedUntil?: number }>()

function isLocked(key: string): boolean {
  const rec = lockoutMap.get(key)
  if (!rec?.lockedUntil) return false
  if (Date.now() < rec.lockedUntil) return true
  lockoutMap.delete(key)
  return false
}

function recordFail(key: string): void {
  const rec = lockoutMap.get(key) || { count: 0 }
  rec.count += 1
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + 60_000
  }
  lockoutMap.set(key, rec)
}

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = (req.body || {}) as LoginBody

    if (!username || !password || !role) {
      return fail(res, 'Username, password and role are required')
    }

    const key = `${role}:${username}`
    if (isLocked(key)) {
      return fail(res, 'Too many attempts. Try again later.', 429)
    }

    const sanitized =
      role === 'admin' ? username.trim() : sanitizePhoneNumber(username)

    if (role !== 'admin') {
      const v = validatePhoneNumber(sanitized, { required: true })
      if (!v.isValid) {
        return fail(res, 'Please enter a valid 10-digit mobile number')
      }
    }

    const db = await getDb()
    const user = await db.collection('users').findOne({ username: sanitized, role })

    if (!user) {
      recordFail(key)
      return fail(res, 'Invalid credentials', 401)
    }

    const match = await bcrypt.compare(password, user.password_hash as string)
    if (!match) {
      recordFail(key)
      return fail(res, 'Invalid credentials', 401)
    }

    lockoutMap.delete(key)

    const payload: TokenPayload = {
      id: user.id as string,
      username: user.username as string,
      role: user.role as TokenPayload['role'],
      email: (user.email as string) || '',
      full_name: user.full_name as string,
      standard: user.standard as string | undefined,
      division: user.division as string | undefined,
    }

    const token = await signToken(payload)

    return ok(res, {
      user: {
        id: payload.id,
        username: payload.username,
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role,
        standard: payload.standard,
        division: payload.division,
      },
      token,
    })
  } catch (err) {
    console.error('[API] Login error:', err)
    return fail(res, 'Login failed', 500)
  }
})

router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.substring(7) : null
  if (!token) return fail(res, 'Authentication required', 401)

  const { verifyToken } = await import('../config/auth.js')
  const payload = await verifyToken(token)
  if (!payload) return fail(res, 'Invalid or expired token', 401)

  return ok(res, {
    id: payload.id,
    username: payload.username,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    standard: payload.standard,
    division: payload.division,
  })
})

export default router
