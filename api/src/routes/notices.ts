import crypto from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const notices = await db
      .collection('notices')
      .find({ is_published: true })
      .sort({ created_at: -1 })
      .toArray()
    return ok(res, notices)
  } catch (err) {
    return fail(res, 'Failed to fetch notices', 500)
  }
})

router.get('/all', requireRole('admin', 'faculty'), async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const notices = await db.collection('notices').find({}).sort({ created_at: -1 }).toArray()
    return ok(res, notices)
  } catch (err) {
    return fail(res, 'Failed to fetch notices', 500)
  }
})

router.post('/', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    if (!body.title || !body.content) return fail(res, 'title and content are required')
    const now = new Date().toISOString()
    const notice = {
      id: crypto.randomUUID(),
      created_by: req.user!.id,
      title: body.title,
      content: body.content,
      notice_type: body.notice_type || 'general',
      priority: body.priority || 'medium',
      is_published: body.is_published ?? true,
      published_date: now,
      created_at: now,
      updated_at: now,
    }
    await db.collection('notices').insertOne(notice)
    return ok(res, notice, 201)
  } catch (err) {
    return fail(res, 'Failed to create notice', 500)
  }
})

router.put('/:id', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const set: any = { updated_at: new Date().toISOString() }
    const body = req.body || {}
    for (const f of ['title', 'content', 'notice_type', 'priority', 'is_published']) {
      if (body[f] !== undefined) set[f] = body[f]
    }
    const r = await db.collection('notices').updateOne({ id: req.params.id }, { $set: set })
    if (r.matchedCount === 0) return fail(res, 'Notice not found', 404)
    return ok(res, { updated: true })
  } catch (err) {
    return fail(res, 'Failed to update notice', 500)
  }
})

router.delete('/:id', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const r = await db.collection('notices').deleteOne({ id: req.params.id })
    if (r.deletedCount === 0) return fail(res, 'Notice not found', 404)
    return ok(res, { deleted: true })
  } catch (err) {
    return fail(res, 'Failed to delete notice', 500)
  }
})

export default router
