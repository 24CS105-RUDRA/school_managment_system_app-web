import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type TokenPayload } from '../config/auth.js'

export interface AuthedRequest extends Request {
  user?: TokenPayload
}

export async function authMiddleware(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.substring(7) : null

  if (!token) {
    return next()
  }

  const payload = await verifyToken(token)
  if (payload) {
    req.user = payload
  }
  next()
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' })
    return
  }
  next()
}

export function requireRole(...roles: TokenPayload['role'][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Access denied' })
      return
    }
    next()
  }
}
