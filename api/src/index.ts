import 'dotenv/config'
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectDB } from './config/database.js'
import { getEnv } from './config/environment.js'
import { authMiddleware } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
import facultyRoutes from './routes/faculty.js'
import attendanceRoutes from './routes/attendance.js'
import homeworkRoutes from './routes/homework.js'
import noticeRoutes from './routes/notices.js'
import feeRoutes from './routes/fees.js'
import timetableRoutes from './routes/timetable.js'
import studyMaterialRoutes from './routes/study-materials.js'
import galleryRoutes from './routes/gallery.js'

const env = getEnv()

async function start(): Promise<void> {
  await connectDB()

  const app = express()
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '25mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan('dev'))
  app.use(authMiddleware)

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'School Management API is running' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/students', studentRoutes)
  app.use('/api/faculty', facultyRoutes)
  app.use('/api/attendance', attendanceRoutes)
  app.use('/api/homework', homeworkRoutes)
  app.use('/api/notices', noticeRoutes)
  app.use('/api/fees', feeRoutes)
  app.use('/api/timetable', timetableRoutes)
  app.use('/api/study-materials', studyMaterialRoutes)
  app.use('/api/gallery', galleryRoutes)

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' })
  })

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API] Unhandled error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  })

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 School Management API running on http://0.0.0.0:${env.PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start API:', err)
  process.exit(1)
})
