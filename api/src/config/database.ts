import crypto from 'node:crypto'
import { MongoClient, Db, ClientSession } from 'mongodb'
import { getEnv } from './environment.js'
import bcrypt from 'bcryptjs'

const env = getEnv()

let client: MongoClient | null = null
let db: Db | null = null

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined
}

function getClientPromise(): Promise<MongoClient> {
  if (!global.__mongoClientPromise) {
    global.__mongoClientPromise = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
    }).connect()
  }
  return global.__mongoClientPromise
}

export async function connectDB(): Promise<Db> {
  if (db) return db
  client = await getClientPromise()
  db = client.db(env.MONGODB_DB)
  await createIndexes(db)
  await seedAdmin(db)
  await seedMissingUsers(db)
  return db
}

export async function getDb(): Promise<Db> {
  if (!db) return connectDB()
  return db
}

async function createIndexes(database: Db): Promise<void> {
  const users = database.collection('users')
  const students = database.collection('students')
  const faculty = database.collection('faculty')
  const attendance = database.collection('attendance')
  const homework = database.collection('homework')
  const notices = database.collection('notices')
  const fees = database.collection('fees')
  const timetable = database.collection('timetable')
  const gallery = database.collection('gallery_events')

  const indexes: Array<Promise<unknown>> = [
    users.createIndex({ username: 1, role: 1 }, { unique: true, sparse: true }),
    users.createIndex({ email: 1 }, { unique: true, sparse: true }),
    students.createIndex({ user_id: 1 }, { unique: true, sparse: true }),
    students.createIndex({ roll_number: 1, standard: 1, division: 1 }, { unique: true, sparse: true }),
    students.createIndex({ phone_number: 1 }, { unique: true, sparse: true }),
    faculty.createIndex({ user_id: 1 }, { unique: true, sparse: true }),
    faculty.createIndex({ phone_number: 1 }, { unique: true, sparse: true }),
    attendance.createIndex({ standard: 1, division: 1, attendance_date: 1, subject: 1 }, { unique: true }),
    attendance.createIndex({ attendance_date: 1 }),
    homework.createIndex({ faculty_id: 1 }),
    homework.createIndex({ standard: 1, division: 1, created_at: -1 }),
    notices.createIndex({ created_at: -1 }),
    fees.createIndex({ student_id: 1 }),
    timetable.createIndex({ standard: 1, division: 1, day_of_week: 1 }),
    gallery.createIndex({ created_at: -1 }),
  ]

  // Ignore "already exists" / key-conflict errors so the API can
  // start against a database already seeded by the Next.js app.
  await Promise.all(
    indexes.map((p) =>
      p.catch((err) => {
        if (err?.codeName === 'IndexKeySpecsConflict' || err?.code === 86 || err?.codeName === 'IndexOptionsConflict') {
          return
        }
        throw err
      })
    )
  )
}

async function seedAdmin(database: Db): Promise<void> {
  const existing = await database.collection('users').findOne({ username: 'admin', role: 'admin' })
  if (existing) return

  const now = new Date().toISOString()
  await database.collection('users').insertOne({
    id: crypto.randomUUID(),
    username: 'admin',
    password_hash: await bcrypt.hash('admin123', 10),
    full_name: 'Administrator',
    email: 'admin@school.com',
    role: 'admin',
    year_of_study: null,
    division: null,
    standard: null,
    created_at: now,
    updated_at: now,
  })
}

async function seedMissingUsers(database: Db): Promise<void> {
  const now = new Date().toISOString()

  const students = await database.collection('students').find({}).toArray()
  for (const s of students) {
    const exists = await database.collection('users').findOne({ id: s.user_id })
    if (exists) continue
    const phone = String(s.phone_number || '')
    const last4 = phone.slice(-4)
    await database.collection('users').insertOne({
      id: s.user_id,
      username: phone,
      password_hash: await bcrypt.hash(`${last4}@School`, 10),
      full_name: s.student_name || '',
      email: '',
      role: 'student',
      year_of_study: s.standard || null,
      division: s.division || null,
      standard: s.standard || null,
      created_at: now,
      updated_at: now,
    })
  }

  const faculty = await database.collection('faculty').find({}).toArray()
  for (const f of faculty) {
    const exists = await database.collection('users').findOne({ id: f.user_id })
    if (exists) continue
    const phone = String(f.phone_number || '')
    const last4 = phone.slice(-4)
    await database.collection('users').insertOne({
      id: f.user_id,
      username: phone,
      password_hash: await bcrypt.hash(`${last4}@Faculty`, 10),
      full_name: f.faculty_name || '',
      email: '',
      role: 'faculty',
      year_of_study: null,
      division: f.assigned_division || null,
      standard: f.assigned_standard || null,
      created_at: now,
      updated_at: now,
    })
  }
}

export async function withTransaction<T>(cb: (session: ClientSession) => Promise<T>): Promise<T> {
  const c = await getClientPromise()
  const session = c.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await cb(session)
    })
    return result as T
  } finally {
    await session.endSession()
  }
}

