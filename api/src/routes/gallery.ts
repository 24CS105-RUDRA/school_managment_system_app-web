import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

// All published gallery events — used by the mobile app list view
router.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const events = await db.collection('gallery_events').find({ is_published: { $ne: false } }).sort({ event_date: -1 }).toArray()
    return ok(res, events)
  } catch (err) {
    return fail(res, 'Failed to fetch gallery events', 500)
  }
})

router.get('/events', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const events = await db.collection('gallery_events').find({ is_published: { $ne: false } }).sort({ event_date: -1 }).toArray()
    return ok(res, events)
  } catch (err) {
    return fail(res, 'Failed to fetch gallery events', 500)
  }
})

router.get('/events/all', requireRole('admin', 'faculty'), async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const events = await db.collection('gallery_events').find({}).sort({ event_date: -1 }).toArray()
    return ok(res, events)
  } catch (err) {
    return fail(res, 'Failed to fetch gallery events', 500)
  }
})

router.get('/images/:eventId', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const images = await db.collection('gallery_images').find({ event_id: req.params.eventId }).toArray()
    return ok(res, images)
  } catch (err) {
    return fail(res, 'Failed to fetch images', 500)
  }
})

// Create event (admin/faculty)
router.post('/events', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    if (!body.title || !body.event_date) return fail(res, 'title and event_date are required')
    const now = new Date().toISOString()
    const event = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description || '',
      event_date: body.event_date,
      cover_image_url: body.cover_image_url || '',
      created_by: req.user!.id,
      is_published: body.is_published ?? true,
      created_at: now,
    }
    await db.collection('gallery_events').insertOne(event)
    return ok(res, event, 201)
  } catch (err) {
    return fail(res, 'Failed to create event', 500)
  }
})

// Add image to event
router.post('/images', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    if (!body.event_id || !body.image_url) return fail(res, 'event_id and image_url are required')
    const image = {
      id: crypto.randomUUID(),
      event_id: body.event_id,
      image_url: body.image_url,
      caption: body.caption || '',
      created_at: new Date().toISOString(),
    }
    await db.collection('gallery_images').insertOne(image)
    return ok(res, image, 201)
  } catch (err) {
    return fail(res, 'Failed to add image', 500)
  }
})

router.delete('/events/:id', requireRole('admin'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const r = await db.collection('gallery_events').deleteOne({ id: req.params.id })
    if (r.deletedCount === 0) return fail(res, 'Event not found', 404)
    await db.collection('gallery_images').deleteMany({ event_id: req.params.id })
    return ok(res, { deleted: true })
  } catch (err) {
    return fail(res, 'Failed to delete event', 500)
  }
})

export default router
