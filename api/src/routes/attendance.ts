import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

// Recent class attendance docs — used by the mobile app list view
router.get('/', requireRole('admin', 'faculty'), async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const docs = await db.collection('attendance').find({}).sort({ attendance_date: -1 }).limit(100).toArray()
    return ok(res, docs)
  } catch (err) {
    return fail(res, 'Failed to fetch attendance', 500)
  }
})

// Get attendance for a student (history)
router.get('/student/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const student = await db.collection('students').findOne({ id: req.params.id })
    if (!student) return fail(res, 'Student not found', 404)

    const docs = await db
      .collection('attendance')
      .find({ standard: student.standard, division: student.division })
      .sort({ attendance_date: -1 })
      .toArray()

    const result = docs.map((doc: any) => {
      const rec = (doc.attendance_records || []).find((r: any) => r.student_id === req.params.id)
      return {
        id: doc.id,
        attendance_date: doc.attendance_date,
        status: rec?.status || 'no_record',
      }
    })
    return ok(res, result)
  } catch (err) {
    return fail(res, 'Failed to fetch attendance', 500)
  }
})

// Get class attendance for a date (faculty/admin)
router.get('/class', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const { date, standard, division } = req.query
    if (!date) return fail(res, 'date is required')
    const q: any = { attendance_date: date as string }
    if (standard) q.standard = standard
    if (division) q.division = division
    const docs = await db.collection('attendance').find(q).toArray()
    return ok(res, docs)
  } catch (err) {
    return fail(res, 'Failed to fetch class attendance', 500)
  }
})

// Mark attendance (faculty/admin)
router.post('/', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    const { standard, division, attendance_date, subject, attendance_records } = body
    if (!standard || !division || !attendance_date || !Array.isArray(attendance_records)) {
      return fail(res, 'standard, division, attendance_date and attendance_records are required')
    }

    const now = new Date().toISOString()
    const docId = crypto.randomUUID()
    const r = await db.collection('attendance').updateOne(
      { standard, division, attendance_date, subject: subject || 'General' },
      {
        $set: {
          standard, division, attendance_date, subject: subject || 'General',
          faculty_id: req.user!.id, marked_by: req.user!.id,
          attendance_records, updated_at: now,
        },
        $setOnInsert: { id: docId, created_at: now },
      },
      { upsert: true }
    )
    return ok(res, { upserted: r.upsertedCount > 0 || r.modifiedCount > 0 }, 201)
  } catch (err) {
    console.error('[API] mark attendance:', err)
    return fail(res, 'Failed to mark attendance', 500)
  }
})

export default router
