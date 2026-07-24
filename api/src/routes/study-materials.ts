import crypto from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { getDb } from '../config/database.js'
import { ok, fail } from '../utils/response.js'
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

// All study materials — used by the mobile app list view
router.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const materials = await db.collection('study_materials').find({}).sort({ created_at: -1 }).limit(100).toArray()
    return ok(res, materials)
  } catch (err) {
    return fail(res, 'Failed to fetch materials', 500)
  }
})

// Study materials for a student (by standard/subject)
router.get('/student', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const { standard, subject } = req.query
    if (!standard) return fail(res, 'standard is required')
    const q: any = { standard }
    if (subject) q.subject = subject
    const materials = await db.collection('study_materials').find(q).sort({ created_at: -1 }).toArray()
    return ok(res, materials)
  } catch (err) {
    return fail(res, 'Failed to fetch materials', 500)
  }
})

// Study materials by faculty
router.get('/faculty/:id', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const materials = await db.collection('study_materials').find({ faculty_id: req.params.id }).sort({ created_at: -1 }).toArray()
    return ok(res, materials)
  } catch (err) {
    return fail(res, 'Failed to fetch materials', 500)
  }
})

// Upload material (faculty/admin) — expects file_url already uploaded to Cloudinary
router.post('/', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const body = req.body || {}
    if (!body.title || !body.file_url || !body.standard) {
      return fail(res, 'title, file_url and standard are required')
    }
    const material = {
      id: crypto.randomUUID(),
      faculty_id: req.user!.id,
      title: body.title,
      description: body.description || '',
      file_url: body.file_url,
      folder_id: body.folder_id || null,
      standard: body.standard,
      division: body.division || null,
      subject: body.subject || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await db.collection('study_materials').insertOne(material)
    return ok(res, material, 201)
  } catch (err) {
    return fail(res, 'Failed to add material', 500)
  }
})

router.delete('/:id', requireRole('admin', 'faculty'), async (req: AuthedRequest, res: Response) => {
  try {
    const db = await getDb()
    const r = await db.collection('study_materials').deleteOne({ id: req.params.id })
    if (r.deletedCount === 0) return fail(res, 'Material not found', 404)
    return ok(res, { deleted: true })
  } catch (err) {
    return fail(res, 'Failed to delete material', 500)
  }
})

export default router
