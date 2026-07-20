import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'

type QueryError = { message: string }

type JoinNode = {
  kind: 'join'
  output: string
  alias?: string
  key: string
  target: string
  fields: SelectNode[]
}

type FieldNode = {
  kind: 'field'
  name: string
}

type SelectNode = FieldNode | JoinNode

const mongoDbName = process.env.MONGODB_DB || 'school'

const globalMongo = globalThis as typeof globalThis & {
  __mongoClientPromise?: Promise<MongoClient>
  __mongoSetupPromise?: Promise<void>
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is required. Set it in .env.local')
  }
  return uri
}

function getMongoClientPromise(): Promise<MongoClient> {
  if (!globalMongo.__mongoClientPromise) {
    globalMongo.__mongoClientPromise = new MongoClient(getMongoUri()).connect()
  }
  return globalMongo.__mongoClientPromise
}

const relationMap: Record<string, Record<string, string>> = {
  attendance: { faculty_id: 'faculty', marked_by: 'users' },
  class_faculty_assignments: { faculty_id: 'faculty' },
  faculty: { user_id: 'users' },
  faculty_student_assignments: { student_id: 'students', faculty_id: 'faculty' },
  fees: { student_id: 'students' },
  fee_structure: { created_by: 'users' },
  student_fees: { student_id: 'students', fee_structure_id: 'fee_structure' },
  gallery_events: { created_by: 'users' },
  gallery_images: { event_id: 'gallery_events' },
  homework: { faculty_id: 'faculty' },
  homework_submissions: { homework_id: 'homework', student_id: 'students' },
  notices: { created_by: 'users' },
  students: { user_id: 'users' },
  study_materials: { faculty_id: 'faculty' },
  study_material_folders: { faculty_id: 'faculty' },
  timetable: { faculty_id: 'faculty' },
}

const upsertKeys: Record<string, string[]> = {
  attendance: ['standard', 'division', 'attendance_date', 'subject'],
  class_faculty_assignments: ['standard', 'division', 'faculty_id', 'subject'],
  faculty_student_assignments: ['student_id', 'faculty_id'],
  homework_submissions: ['homework_id', 'student_id'],
  users: ['username', 'role'],
}

const validFields: Record<string, Set<string>> = {
  students: new Set(['id', 'user_id', 'roll_number', 'standard', 'division', 'student_name', 'phone_number', 'father_mobile', 'mother_mobile', 'date_of_birth', 'created_at', 'updated_at']),
  faculty: new Set(['id', 'user_id', 'employee_id', 'department', 'subject', 'faculty_name', 'phone_number', 'assigned_standard', 'assigned_division', 'created_at', 'updated_at']),
  users: new Set(['id', 'username', 'password_hash', 'full_name', 'email', 'role', 'year_of_study', 'division', 'standard', 'created_at', 'updated_at']),
  notices: new Set(['id', 'created_by', 'title', 'content', 'notice_type', 'priority', 'is_published', 'published_date', 'created_at', 'updated_at']),
  fee_structure: new Set(['id', 'standard', 'total_amount', 'number_of_installments', 'installments', 'is_active', 'created_by', 'created_at', 'updated_at']),
  student_fees: new Set(['id', 'student_id', 'fee_structure_id', 'total_amount', 'total_paid', 'installments', 'status', 'created_at', 'updated_at']),
  attendance: new Set(['id', 'standard', 'division', 'attendance_date', 'subject', 'faculty_id', 'marked_by', 'attendance_records', 'created_at', 'updated_at']),
}

async function getDb() {
  await ensureMongoSetup()
  const client = await getMongoClientPromise()
  return client.db(mongoDbName)
}

async function ensureMongoSetup() {
  if (globalMongo.__mongoSetupPromise) {
    return globalMongo.__mongoSetupPromise
  }

  globalMongo.__mongoSetupPromise = (async () => {
    const db = (await getMongoClientPromise()).db(mongoDbName)

    await Promise.all([
      db.collection('users').createIndex({ username: 1, role: 1 }, { unique: true }),
      db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
      db.collection('students').createIndex({ user_id: 1 }, { unique: true }),
      db.collection('students').createIndex({ roll_number: 1, standard: 1, division: 1 }, { unique: true, sparse: true }),
      db.collection('students').createIndex({ phone_number: 1 }, { unique: true, sparse: true }),
      db.collection('faculty').createIndex({ user_id: 1 }, { unique: true }),
      db.collection('faculty').createIndex({ phone_number: 1 }, { unique: true, sparse: true }),
      db.collection('attendance').createIndex({ standard: 1, division: 1, attendance_date: 1, subject: 1 }, { unique: true }),
      db.collection('attendance').createIndex({ attendance_date: 1 }),
      db.collection('homework_submissions').createIndex({ homework_id: 1, student_id: 1 }, { unique: true }),
      db.collection('faculty_student_assignments').createIndex({ student_id: 1, faculty_id: 1 }, { unique: true }),
      db.collection('class_faculty_assignments').createIndex({ standard: 1, division: 1, faculty_id: 1, subject: 1 }, { unique: true }),
      db.collection('fee_structure').createIndex({ standard: 1 }, { unique: true }),
      db.collection('fee_structure').createIndex({ is_active: 1 }),
      db.collection('student_fees').createIndex({ student_id: 1 }, { unique: true }),
      db.collection('student_fees').createIndex({ fee_structure_id: 1 }),
    ])

    const admin = await db.collection('users').findOne({ username: 'admin', role: 'admin' })
    if (!admin) {
      const now = new Date().toISOString()
      await db.collection('users').insertOne({
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
  })()

  return globalMongo.__mongoSetupPromise
}

function splitTopLevel(input: string): string[] {
  const items: string[] = []
  let depth = 0
  let current = ''

  for (const char of input) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1

    if (char === ',' && depth === 0) {
      const value = current.trim()
      if (value) items.push(value)
      current = ''
      continue
    }

    current += char
  }

  const value = current.trim()
  if (value) items.push(value)
  return items
}

function singularize(name: string): string {
  return name.endsWith('s') ? name.slice(0, -1) : name
}

function inferTargetTable(sourceTable: string, key: string, joinName: string): string {
  return relationMap[sourceTable]?.[key] || relationMap[sourceTable]?.[joinName] || joinName
}

function parseSelect(selectClause: string, sourceTable: string): SelectNode[] {
  const clause = (selectClause || '*').trim()
  if (clause === '*') {
    return [{ kind: 'field', name: '*' }]
  }

  return splitTopLevel(clause).map((token) => {
    const joinMatch = token.match(/^([a-zA-Z0-9_]+(?::[a-zA-Z0-9_]+)?)\s*\((.*)\)$/s)
    if (!joinMatch) {
      return { kind: 'field', name: token } as FieldNode
    }

    const ref = joinMatch[1].trim()
    const inner = joinMatch[2].trim()

    let alias: string | undefined
    let key = ref

    if (ref.includes(':')) {
      const [left, right] = ref.split(':')
      alias = left.trim()
      key = right.trim()
    }

    if (!key.endsWith('_id') && !relationMap[sourceTable]?.[key]) {
      const candidate = `${singularize(key)}_id`
      if (relationMap[sourceTable]?.[candidate] || key.endsWith('s')) {
        key = candidate
      }
    }

    const target = inferTargetTable(sourceTable, key, ref.includes(':') ? ref.split(':')[0].trim() : ref)

    const output = alias || (ref.includes(':') ? ref.split(':')[0].trim() : ref)

    return {
      kind: 'join',
      output,
      alias,
      key,
      target,
      fields: parseSelect(inner, target),
    } as JoinNode
  })
}

function toSerializable<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item)) as T
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, any>
    const output: Record<string, any> = {}

    Object.keys(input).forEach((key) => {
      if (key !== '_id') {
        output[key] = toSerializable(input[key])
      }
    })

    return output as T
  }

  return value
}

async function projectDocument(document: Record<string, any>, sourceTable: string, fields: SelectNode[]) {
  const db = await getDb()
  const hasStar = fields.some((f) => f.kind === 'field' && f.name === '*')
  const output: Record<string, any> = hasStar ? { ...document } : {}

  for (const field of fields) {
    if (field.kind === 'field') {
      if (field.name !== '*') {
        output[field.name] = document[field.name]
      }
      continue
    }

    const fkValue = document[field.key]
    const joinProp = field.output

    if (fkValue === null || fkValue === undefined) {
      output[joinProp] = null
      continue
    }

    const related = await db.collection(field.target).findOne({ id: fkValue })
    output[joinProp] = related ? await projectDocument(related, field.target, field.fields) : null
  }

  return toSerializable(output)
}

function buildQuery(filters: Array<{ op: string; column: string; value: any }>, orClauses: string[]) {
  const query: Record<string, any> = {}

  for (const filter of filters) {
    if (filter.op === 'eq') query[filter.column] = filter.value
    if (filter.op === 'neq') query[filter.column] = { ...(query[filter.column] || {}), $ne: filter.value }
    if (filter.op === 'gte') query[filter.column] = { ...(query[filter.column] || {}), $gte: filter.value }
    if (filter.op === 'lte') query[filter.column] = { ...(query[filter.column] || {}), $lte: filter.value }
    if (filter.op === 'in') query[filter.column] = { ...(query[filter.column] || {}), $in: filter.value }
    if (filter.op === 'not-is') query[filter.column] = { ...(query[filter.column] || {}), $ne: filter.value }
  }

  if (orClauses.length > 0) {
    query.$or = orClauses
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [column, op, value] = part.split('.')
        if (op === 'is' && value === 'null') {
          return { [column]: null }
        }
        if (op === 'eq') {
          return { [column]: value }
        }
        return {}
      })
      .filter((entry) => Object.keys(entry).length > 0)
  }

  return query
}

async function cascadeDelete(table: string, ids: string[]) {
  if (ids.length === 0) return
  const db = await getDb()

  if (table === 'users') {
    const [students, faculty] = await Promise.all([
      db.collection('students').find({ user_id: { $in: ids } }).toArray(),
      db.collection('faculty').find({ user_id: { $in: ids } }).toArray(),
    ])

    const studentIds = students.map((item: any) => item.id)
    const facultyIds = faculty.map((item: any) => item.id)

    await Promise.all([
      db.collection('students').deleteMany({ user_id: { $in: ids } }),
      db.collection('faculty').deleteMany({ user_id: { $in: ids } }),
      cascadeDelete('students', studentIds),
      cascadeDelete('faculty', facultyIds),
    ])
    return
  }

  if (table === 'students') {
    await Promise.all([
      db.collection('attendance').deleteMany({ student_id: { $in: ids } }),
      db.collection('fees').deleteMany({ student_id: { $in: ids } }),
      db.collection('student_fees').deleteMany({ student_id: { $in: ids } }),
      db.collection('homework_submissions').deleteMany({ student_id: { $in: ids } }),
      db.collection('faculty_student_assignments').deleteMany({ student_id: { $in: ids } }),
    ])
    return
  }

  if (table === 'faculty') {
    const homework = await db.collection('homework').find({ faculty_id: { $in: ids } }).toArray()
    await Promise.all([
      db.collection('attendance').deleteMany({ faculty_id: { $in: ids } }),
      db.collection('class_faculty_assignments').deleteMany({ faculty_id: { $in: ids } }),
      db.collection('faculty_student_assignments').deleteMany({ faculty_id: { $in: ids } }),
      db.collection('homework').deleteMany({ faculty_id: { $in: ids } }),
      db.collection('study_materials').deleteMany({ faculty_id: { $in: ids } }),
      db.collection('timetable').deleteMany({ faculty_id: { $in: ids } }),
      cascadeDelete('homework', homework.map((item: any) => item.id)),
    ])
    return
  }

  if (table === 'homework') {
    await db.collection('homework_submissions').deleteMany({ homework_id: { $in: ids } })
    return
  }

  if (table === 'gallery_events') {
    await db.collection('gallery_images').deleteMany({ event_id: { $in: ids } })
  }
}

class MongoSupabaseQueryBuilder {
  private readonly table: string
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private selectClause = '*'
  private returnSelectClause: string | null = null
  private payload: any = null
  private filters: Array<{ op: string; column: string; value: any }> = []
  private orClauses: string[] = []
  private orderBy: { column: string; ascending: boolean } | null = null

  constructor(table: string) {
    this.table = table
  }

  select(columns = '*') {
    if (this.action === 'select') {
      this.selectClause = columns
    } else {
      this.returnSelectClause = columns
    }
    return this
  }

  insert(payload: any) {
    this.action = 'insert'
    this.payload = payload
    return this
  }

  update(payload: any) {
    this.action = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  upsert(payload: any) {
    this.action = 'upsert'
    this.payload = payload
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ op: 'eq', column, value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ op: 'neq', column, value })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ op: 'gte', column, value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ op: 'lte', column, value })
    return this
  }

  in(column: string, value: any[]) {
    this.filters.push({ op: 'in', column, value })
    return this
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is') {
      this.filters.push({ op: 'not-is', column, value })
    }
    return this
  }

  or(expression: string) {
    this.orClauses.push(...splitTopLevel(expression))
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = {
      column,
      ascending: options?.ascending ?? true,
    }
    return this
  }

  async single(): Promise<{ data: any; error: QueryError | null }> {
    const result = await this.execute()
    if (result.error) return result
    const rows = Array.isArray(result.data) ? result.data : []
    if (rows.length === 0) return { data: null, error: { message: 'No rows found' } }
    return { data: rows[0], error: null }
  }

  async maybeSingle(): Promise<{ data: any; error: QueryError | null }> {
    const result = await this.execute()
    if (result.error) return result
    const rows = Array.isArray(result.data) ? result.data : []
    return { data: rows.length > 0 ? rows[0] : null, error: null }
  }

  async execute(): Promise<{ data: any; error: QueryError | null }> {
    try {
      const db = await getDb()
      const collection = db.collection(this.table)
      const query = buildQuery(this.filters, this.orClauses)

      if (this.action === 'select') {
        let cursor = collection.find(query)
        if (this.orderBy) {
          cursor = cursor.sort({ [this.orderBy.column]: this.orderBy.ascending ? 1 : -1 })
        }

        const rows = await cursor.toArray()
        const fields = parseSelect(this.selectClause, this.table)
        const projected = await Promise.all(rows.map((row) => projectDocument(row as any, this.table, fields)))
        return { data: projected, error: null }
      }

      if (this.action === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload]
        const now = new Date().toISOString()
        const withMeta = items.map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || now,
          updated_at: item.updated_at || now,
        }))

        await collection.insertMany(withMeta)
        const fields = parseSelect(this.returnSelectClause || '*', this.table)
        const projected = await Promise.all(withMeta.map((row) => projectDocument(row, this.table, fields)))
        return { data: projected, error: null }
      }

      if (this.action === 'update') {
        const matched = await collection.find(query).toArray()
        await collection.updateMany(query, {
          $set: {
            ...this.payload,
            updated_at: new Date().toISOString(),
          },
        })

        if (!this.returnSelectClause) {
          return { data: null, error: null }
        }

        const ids = matched.map((item: any) => item.id)
        const rows = ids.length > 0 ? await collection.find({ id: { $in: ids } }).toArray() : []
        const fields = parseSelect(this.returnSelectClause, this.table)
        const projected = await Promise.all(rows.map((row) => projectDocument(row as any, this.table, fields)))
        return { data: projected, error: null }
      }

      if (this.action === 'delete') {
        const matched = await collection.find(query).toArray()
        await collection.deleteMany(query)
        await cascadeDelete(this.table, matched.map((item: any) => item.id))
        return { data: null, error: null }
      }

      const items = Array.isArray(this.payload) ? this.payload : [this.payload]
      const uniqueKeys = upsertKeys[this.table] || ['id']
      const updatedRows: any[] = []

      for (const item of items) {
        const now = new Date().toISOString()
        const base = {
          ...item,
          id: item.id || crypto.randomUUID(),
          updated_at: now,
        }

        const filter: Record<string, any> = {}
        for (const key of uniqueKeys) {
          if (item[key] !== undefined) {
            filter[key] = item[key]
          }
        }

        if (Object.keys(filter).length === 0) {
          filter.id = base.id
        }

        const existing = await collection.findOne(filter)
        if (existing) {
          await collection.updateOne({ id: existing.id }, { $set: base })
          updatedRows.push({ ...existing, ...base })
        } else {
          const toInsert = {
            ...base,
            created_at: item.created_at || now,
          }
          await collection.insertOne(toInsert)
          updatedRows.push(toInsert)
        }
      }

      const fields = parseSelect(this.returnSelectClause || '*', this.table)
      const projected = await Promise.all(updatedRows.map((row) => projectDocument(row, this.table, fields)))
      return { data: projected, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database operation failed'
      return { data: null, error: { message } as QueryError }
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: QueryError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any)
  }
}

class MongoSupabaseClient {
  from(table: string) {
    return new MongoSupabaseQueryBuilder(table)
  }
}

export function createClient(_url?: string, _key?: string) {
  return new MongoSupabaseClient()
}

export const supabase = createClient()
export const supabaseAdmin = createClient()
