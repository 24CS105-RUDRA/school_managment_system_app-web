import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

// All timetable entries — used by the mobile app list view
router.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const entries = await db.collection('timetable').find({}).sort({ day_of_week: 1 }).limit(200).toArray()
    return ok(res, entries)
  } catch (err) {
    return fail(res, 'Failed to fetch timetable', 500)
  }
})

// Timetable for a class (students/faculty/admin)
router.get('/class', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const { standard, division } = req.query
    if (!standard) return fail(res, 'standard is required')
    const q: any = { standard }
    if (division) q.division = division
    const entries = await db.collection('timetable').find(q).sort({ day_of_week: 1 }).toArray()
    return ok(res, entries)
  } catch (err) {
    return fail(res, 'Failed to fetch timetable', 500)
  }
})

// Timetable for a faculty member
router.get('/faculty/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const entries = await db.collection('timetable').find({ faculty_id: req.params.id }).sort({ day_of_week: 1 }).toArray()
    return ok(res, entries)
  } catch (err) {
    return fail(res, 'Failed to fetch timetable', 500)
  }
})

// Create timetable entry (admin only)
router.post('/', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    const { faculty_id, standard, division, subject, day_of_week, start_time, end_time, room } = body
    if (!faculty_id || !standard || !subject || day_of_week === undefined || !start_time || !end_time) {
      return fail(res, 'faculty_id, standard, subject, day_of_week, start_time, end_time are required')
    }
    const entry = {
      id: crypto.randomUUID(),
      faculty_id, standard, division: division || null, subject,
      day_of_week: Number(day_of_week), start_time, end_time, room: room || null,
      created_at: new Date().toISOString(),
    }
    await db.collection('timetable').insertOne(entry)
    return ok(res, entry, 201)
  } catch (err) {
    return fail(res, 'Failed to create timetable entry', 500)
  }
})

export default router
