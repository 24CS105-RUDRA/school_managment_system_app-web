import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/middleware/auth'
import type { UserRole } from '@/lib/middleware/rbac'

/**
 * Server-side guard for protected pages. Call at the top of a page/layout
 * (server component) to enforce authentication and role. If the session
 * cookie is missing or the role does not match, the user is redirected.
 *
 * This closes the previous security hole where pages only checked
 * `localStorage` client-side and could be bypassed by visiting a URL directly.
 */
export async function requireRole(role: UserRole): Promise<{
  id: string
  username: string
  full_name: string
  email: string
  role: UserRole
  standard?: string
  division?: string
}> {
  const cookieStore = await cookies()
  const token = cookieStore.get('accessToken')?.value

  if (!token) {
    redirect('/login')
  }

  const payload = await verifyToken(token)

  if (!payload || payload.role !== role) {
    redirect('/login')
  }

  return {
    id: payload.id,
    username: payload.username,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    standard: payload.standard,
    division: payload.division,
  }
}
