import type { Request, Response } from 'express'

export function ok(res: Response, data: unknown, status = 200): Response {
  return res.status(status).json({ success: true, data })
}

export function fail(res: Response, error: string, status = 400): Response {
  return res.status(status).json({ success: false, error })
}

export async function getJsonBody(req: Request): Promise<any> {
  return req.body ?? {}
}
