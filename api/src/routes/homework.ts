import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

// All homework (newest first) — used by the mobile app list view
router.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const hw = await db.collection('homework').find({}).sort({ due_date: -1 }).limit(100).toArray()
    return ok(res, hw)
  } catch (err) {
    return fail(res, 'Failed to fetch homework', 500)
  }
})

// Homework for a student (by student's standard/division)
router.get('/student/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const student = await db.collection('students').findOne({ id: req.params.id })
    if (!student) return fail(res, 'Student not found', 404)
    const hw = await db
      .collection('homework')
      .find({ standard: student.standard, $or: [{ division: student.division }, { division: null }] })
      .sort({ due_date: -1 })
      .toArray()
    return ok(res, hw)
  } catch (err) {
    return fail(res, 'Failed to fetch homework', 500)
  }
})

// Homework by faculty
router.get('/faculty/:id', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const hw = await db.collection('homework').find({ faculty_id: req.params.id }).sort({ created_at: -1 }).toArray()
    return ok(res, hw)
  } catch (err) {
    return fail(res, 'Failed to fetch homework', 500)
  }
})

// Create homework (faculty/admin)
router.post('/', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    const { standard, division, subject, title, description, due_date } = body
    if (!standard || !subject || !title || !due_date) {
      return fail(res, 'standard, subject, title and due_date are required')
    }
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const hw = {
      id, faculty_id: req.user!.id, standard, division: division || null,
      subject, title, description: description || '', due_date,
      created_at: now, updated_at: now,
    }
    await db.collection('homework').insertOne(hw)
    return ok(res, hw, 201)
  } catch (err) {
    return fail(res, 'Failed to create homework', 500)
  }
})

// Submit homework (student)
router.post('/submit', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    if (!body.homework_id || !body.student_id) {
      return fail(res, 'homework_id and student_id are required')
    }
    const now = new Date().toISOString()
    await db.collection('homework_submissions').updateOne(
      { homework_id: body.homework_id, student_id: body.student_id },
      {
        $set: {
          homework_id: body.homework_id, student_id: body.student_id,
          submission_date: now, status: 'submitted',
          content: body.content || '', file_url: body.file_url || null,
        },
      },
      { upsert: true }
    )
    return ok(res, { submitted: true }, 201)
  } catch (err) {
    return fail(res, 'Failed to submit homework', 500)
  }
})

export default router
