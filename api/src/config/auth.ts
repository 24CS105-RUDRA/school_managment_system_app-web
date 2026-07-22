import crypto from 'node:crypto'
import { getEnv } from './environment.js'

const env = getEnv()

export interface TokenPayload {
  id: string
  username: string
  role: 'student' | 'faculty' | 'admin'
  email: string
  full_name: string
  standard?: string
  division?: string
}

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url')
}

function hmacSign(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest()
}

const ALG = 'HS256'

export async function signToken(payload: TokenPayload): Promise<string> {
  const header = { alg: ALG, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = {
    ...payload,
    iat: now,
    exp: now + 86400,
  }

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)))
  const bodyB64 = base64url(Buffer.from(JSON.stringify(body)))
  const signingInput = `${headerB64}.${bodyB64}`

  const secret = Buffer.from(env.JWT_SECRET, 'utf-8')
  const sig = hmacSign(secret, Buffer.from(signingInput, 'utf-8'))
  const sigB64 = base64url(sig)

  return `${signingInput}.${sigB64}`
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, bodyB64, sigB64] = parts

    // Verify signature
    const signingInput = `${headerB64}.${bodyB64}`
    const secret = Buffer.from(env.JWT_SECRET, 'utf-8')
    const expectedSig = hmacSign(secret, Buffer.from(signingInput, 'utf-8'))
    const actualSig = base64urlDecode(sigB64)

    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null

    // Decode body
    const body = JSON.parse(base64urlDecode(bodyB64).toString('utf-8'))

    // Check expiry
    if (body.exp && Date.now() / 1000 > body.exp) return null

    if (
      typeof body.id === 'string' &&
      typeof body.username === 'string' &&
      typeof body.role === 'string' &&
      typeof body.email === 'string' &&
      typeof body.full_name === 'string'
    ) {
      return {
        id: body.id,
        username: body.username,
        role: body.role as TokenPayload['role'],
        email: body.email,
        full_name: body.full_name,
        standard: body.standard as string | undefined,
        division: body.division as string | undefined,
      }
    }
    return null
  } catch {
    return null
  }
}
