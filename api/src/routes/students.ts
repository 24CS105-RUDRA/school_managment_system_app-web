import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'
import { validateStandard, validateDivision } from '../lib/validations.js'

const router = Router()

// List students (optionally filtered by standard/division)
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    let query: any = {}
    const { standard, division } = req.query
    if (standard) query.standard = standard
    if (division) query.division = division

    const students = await db
      .collection('students')
      .find(query)
      .sort({ standard: 1, division: 1, roll_number: 1 })
      .toArray()

    return ok(res, students)
  } catch (err) {
    console.error('[API] students list:', err)
    return fail(res, 'Failed to fetch students', 500)
  }
})

// Get a single student
router.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const student = await db.collection('students').findOne({ id: req.params.id })
    if (!student) return fail(res, 'Student not found', 404)
    return ok(res, student)
  } catch (err) {
    return fail(res, 'Failed to fetch student', 500)
  }
})

// Create a student (admin only)
router.post('/', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}

    const std = validateStandard(body.standard || '')
    if (!std.isValid) return fail(res, std.errors[0] || 'Invalid class')
    if (body.division) {
      const dv = validateDivision(body.division, body.standard)
      if (!dv.isValid) return fail(res, dv.errors[0] || 'Invalid division')
    }

    const username = body.phone_number ? String(body.phone_number).replace(/\D/g, '') : ''
    if (!username) return fail(res, 'Phone number is required')

    const existing = await db.collection('users').findOne({ username, role: 'student' })
    if (existing) return fail(res, 'Phone number already registered', 409)

    const password = body.password || `${username.slice(-4)}@School`
    const passwordHash = await (await import('bcryptjs')).default.hash(password, 10)
    const now = new Date().toISOString()

    const userId = crypto.randomUUID()
    await db.collection('users').insertOne({
      id: userId,
      username,
      password_hash: passwordHash,
      full_name: body.full_name || '',
      email: body.email || '',
      role: 'student',
      year_of_study: body.standard || null,
      division: body.division || null,
      standard: body.standard || null,
      created_at: now,
      updated_at: now,
    })

    const studentId = crypto.randomUUID()
    const student = {
      id: studentId,
      user_id: userId,
      roll_number: body.roll_number || '',
      standard: body.standard,
      division: body.division || '',
      student_name: body.full_name || '',
      phone_number: username,
      father_mobile: body.father_mobile || null,
      mother_mobile: body.mother_mobile || null,
      date_of_birth: body.date_of_birth || null,
      created_at: now,
      updated_at: now,
    }
    await db.collection('students').insertOne(student)

    return ok(res, { ...student, password }, 201)
  } catch (err) {
    console.error('[API] create student:', err)
    return fail(res, 'Failed to create student', 500)
  }
})

// Update a student (admin only)
router.put('/:id', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const updates = req.body || {}
    const set: any = { updated_at: new Date().toISOString() }
    for (const f of ['roll_number', 'standard', 'division', 'student_name', 'phone_number', 'father_mobile', 'mother_mobile', 'date_of_birth']) {
      if (updates[f] !== undefined) set[f] = updates[f]
    }
    const r = await db.collection('students').updateOne({ id: req.params.id }, { $set: set })
    if (r.matchedCount === 0) return fail(res, 'Student not found', 404)
    if (updates.full_name !== undefined) {
      await db.collection('users').updateOne(
        { id: (await db.collection('students').findOne({ id: req.params.id }))?.user_id },
        { $set: { full_name: updates.full_name } }
      )
    }
    return ok(res, { updated: true })
  } catch (err) {
    return fail(res, 'Failed to update student', 500)
  }
})

// Delete a student (admin only) — cascade via users delete
router.delete('/:id', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const student = await db.collection('students').findOne({ id: req.params.id })
    if (!student) return fail(res, 'Student not found', 404)
    await db.collection('users').deleteOne({ id: student.user_id })
    return ok(res, { deleted: true })
  } catch (err) {
    return fail(res, 'Failed to delete student', 500)
  }
})

export default router
