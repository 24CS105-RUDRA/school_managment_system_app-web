import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const faculty = await db.collection('faculty').find({}).sort({ faculty_name: 1 }).toArray()
    return ok(res, faculty)
  } catch (err) {
    return fail(res, 'Failed to fetch faculty', 500)
  }
})

router.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const faculty = await db.collection('faculty').findOne({ id: req.params.id })
    if (!faculty) return fail(res, 'Faculty not found', 404)
    return ok(res, faculty)
  } catch (err) {
    return fail(res, 'Failed to fetch faculty', 500)
  }
})

// Create faculty (admin only)
router.post('/', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    const username = body.phone_number ? String(body.phone_number).replace(/\D/g, '') : ''
    if (!username) return fail(res, 'Phone number is required')

    const existing = await db.collection('users').findOne({ username, role: 'faculty' })
    if (existing) return fail(res, 'Phone number already registered', 409)

    const password = body.password || `${username.slice(-4)}@Faculty`
    const bcrypt = (await import('bcryptjs')).default
    const passwordHash = await bcrypt.hash(password, 10)
    const now = new Date().toISOString()

    const userId = crypto.randomUUID()
    await db.collection('users').insertOne({
      id: userId,
      username,
      password_hash: passwordHash,
      full_name: body.full_name || '',
      email: body.email || '',
      role: 'faculty',
      standard: body.assigned_standard || null,
      division: body.assigned_division || null,
      created_at: now,
      updated_at: now,
    })

    const facultyId = crypto.randomUUID()
    const faculty = {
      id: facultyId,
      user_id: userId,
      employee_id: body.employee_id || '',
      department: body.department || '',
      subject: body.subject || '',
      faculty_name: body.full_name || '',
      phone_number: username,
      assigned_standard: body.assigned_standard || null,
      assigned_division: body.assigned_division || null,
      created_at: now,
      updated_at: now,
    }
    await db.collection('faculty').insertOne(faculty)
    return ok(res, { ...faculty, password }, 201)
  } catch (err) {
    console.error('[API] create faculty:', err)
    return fail(res, 'Failed to create faculty', 500)
  }
})

router.delete('/:id', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const faculty = await db.collection('faculty').findOne({ id: req.params.id })
    if (!faculty) return fail(res, 'Faculty not found', 404)
    await db.collection('users').deleteOne({ id: faculty.user_id })
    return ok(res, { deleted: true })
  } catch (err) {
    return fail(res, 'Failed to delete faculty', 500)
  }
})

export default router
