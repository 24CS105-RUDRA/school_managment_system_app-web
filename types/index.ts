export interface User {
  id: string
  username: string
  password_hash: string
  full_name: string
  email: string
  role: 'student' | 'faculty' | 'admin'
  year_of_study?: string | null
  division?: string | null
  standard?: string | null
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  roll_number: string
  standard: string
  division: string
  student_name?: string
  phone_number?: string
  father_mobile?: string | null
  mother_mobile?: string | null
  date_of_birth?: string | null
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
    username: string
  }
}

export interface FacultyProfile {
  id: string
  user_id: string
  employee_id: string
  department: string
  subject: string
  faculty_name?: string
  phone_number?: string
  assigned_standard?: string | null
  assigned_division?: string | null
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
    username: string
  }
}

export interface AttendanceRecord {
  id: string
  student_id: string
  faculty_id: string
  attendance_date: string
  subject: string
  status: 'present' | 'absent' | 'late'
  remarks?: string
  created_at: string
}

export interface Homework {
  id: string
  faculty_id: string
  standard: string
  division: string
  subject: string
  title: string
  description?: string
  due_date: string
  created_at: string
  updated_at: string
}

export interface HomeworkSubmission {
  id: string
  homework_id: string
  student_id: string
  submission_date: string
  file_url?: string
  content?: string
  grade?: string
  feedback?: string
  status: 'submitted' | 'graded' | 'late'
}

export interface Notice {
  id: string
  created_by: string
  title: string
  content: string
  notice_type: 'academic' | 'event' | 'general' | 'urgent'
  priority: 'low' | 'medium' | 'high'
  is_published: boolean
  published_date: string
  created_at: string
  updated_at?: string
}

export interface Installment {
  installment_number: number
  amount: number
  due_date: string
  paid_date?: string
  paid_amount: number
  status: 'pending' | 'partial' | 'paid' | 'overdue'
}

export interface FeeStructure {
  id: string
  standard: string
  total_amount: number
  number_of_installments: number
  installments: Installment[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface StudentFee {
  id: string
  student_id: string
  fee_structure_id: string
  total_amount: number
  total_paid: number
  installments: Installment[]
  status: 'pending' | 'partial' | 'paid'
  created_at: string
  updated_at: string
}

export interface Fee {
  id: string
  student_id: string
  fee_type: string
  amount: number
  due_date: string
  paid_amount: number
  payment_date?: string
  payment_method?: string
  status: 'pending' | 'partial' | 'paid'
  created_at: string
  updated_at: string
}

export interface TimetableEntry {
  id: string
  faculty_id: string
  standard: string
  division: string
  subject: string
  day_of_week: number
  start_time: string
  end_time: string
  room?: string
  created_at: string
}

export interface StudyMaterial {
id: string
faculty_id: string
title: string
description?: string
file_url?: string
folder_id?: string
standard?: string
division?: string
subject?: string
created_at: string
updated_at: string
}

export interface StudyMaterialFolder {
id: string
faculty_id: string
folder_name: string
parent_folder_id?: string
standard: string
subject: string
created_at: string
}

export interface FacultyStudentAssignment {
id: string
student_id: string
faculty_id: string
assigned_date?: string
}

export interface GalleryEvent {
  id: string
  title: string
  description?: string
  event_date: string
  created_by: string
  created_at: string
}

export interface GalleryImage {
  id: string
  event_id: string
  image_url: string
  caption?: string
  created_at: string
}

export interface ClassFacultyAssignment {
  id: string
  faculty_id: string
  standard: string
  division: string
  subject: string
  is_class_teacher?: boolean
  created_at: string
}

export interface CreateStudentData {
  password: string
  full_name: string
  email?: string
  roll_number: string
  standard: string
  division: string
  phone_number?: string
  father_mobile?: string
  mother_mobile?: string
  date_of_birth?: string
}

export interface CreateFacultyData {
  password: string
  full_name: string
  email: string
  employee_id: string
  department: string
  subject: string
  phone_number?: string
  assigned_standard?: string
  assigned_division?: string
}

export interface AuthResult {
  success: boolean
  data?: User & { student?: StudentProfile; faculty?: FacultyProfile }
  error?: string
  remainingAttempts?: number
  lockedUntil?: string
}

export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export type UserRole = 'student' | 'faculty' | 'admin'
export type AttendanceStatus = 'present' | 'absent' | 'late'
export type PaymentStatus = 'pending' | 'partial' | 'paid'
export type NoticeType = 'academic' | 'event' | 'general' | 'urgent'
export type Priority = 'low' | 'medium' | 'high'
