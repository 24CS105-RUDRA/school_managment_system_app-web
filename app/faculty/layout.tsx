import { requireRole } from '@/lib/auth-guard'

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  await requireRole('faculty')
  return <>{children}</>
}
