import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

// All fee records with student name — used by the mobile app list view
router.get('/', requireRole('admin', 'faculty'), async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const fees = await db.collection('fees').find({}).sort({ due_date: 1 }).limit(200).toArray()
    const students = await db.collection('students').find({}).toArray()
    const nameMap = new Map(students.map((s: any) => [s.id, s.student_name]))
    const result = fees.map((f: any) => ({ ...f, student_name: nameMap.get(f.student_id) || null }))
    return ok(res, result)
  } catch (err) {
    return fail(res, 'Failed to fetch fees', 500)
  }
})

router.get('/student/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const fees = await db.collection('fees').find({ student_id: req.params.id }).sort({ due_date: 1 }).toArray()
    return ok(res, fees)
  } catch (err) {
    return fail(res, 'Failed to fetch fees', 500)
  }
})

router.get('/student-fees/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const fees = await db.collection('student_fees').find({ student_id: req.params.id }).toArray()
    return ok(res, fees)
  } catch (err) {
    return fail(res, 'Failed to fetch student fees', 500)
  }
})

// Create a fee record (admin only)
router.post('/', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    if (!body.student_id || !body.fee_type || !body.amount || !body.due_date) {
      return fail(res, 'student_id, fee_type, amount and due_date are required')
    }
    const now = new Date().toISOString()
    const fee = {
      id: crypto.randomUUID(),
      student_id: body.student_id,
      fee_type: body.fee_type,
      amount: Number(body.amount),
      due_date: body.due_date,
      paid_amount: Number(body.paid_amount || 0),
      payment_date: body.payment_date || null,
      payment_method: body.payment_method || null,
      status: body.status || 'pending',
      created_at: now,
      updated_at: now,
    }
    await db.collection('fees').insertOne(fee)
    return ok(res, fee, 201)
  } catch (err) {
    return fail(res, 'Failed to create fee', 500)
  }
})

// Record a payment (admin only)
router.post('/:id/pay', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    const fee = await db.collection('fees').findOne({ id: req.params.id })
    if (!fee) return fail(res, 'Fee not found', 404)

    const paid = Number(fee.paid_amount) + Number(body.amount || 0)
    const status = paid >= Number(fee.amount) ? 'paid' : 'partial'
    const r = await db.collection('fees').updateOne(
      { id: req.params.id },
      { $set: { paid_amount: paid, status, payment_date: new Date().toISOString(), updated_at: new Date().toISOString() } }
    )
    if (r.matchedCount === 0) return fail(res, 'Fee not found', 404)
    return ok(res, { updated: true, paid_amount: paid, status })
  } catch (err) {
    return fail(res, 'Failed to record payment', 500)
  }
})

export default router
