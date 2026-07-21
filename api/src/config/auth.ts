import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { getEnv } from './environment.js'

const env = getEnv()
const secret = new TextEncoder().encode(env.JWT_SECRET)
const ALG = 'HS256'

export interface TokenPayload {
  id: string
  username: string
  role: 'student' | 'faculty' | 'admin'
  email: string
  full_name: string
  standard?: string
  division?: string
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (
      typeof payload.id === 'string' &&
      typeof payload.username === 'string' &&
      typeof payload.role === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.full_name === 'string'
    ) {
      return {
        id: payload.id,
        username: payload.username,
        role: payload.role as TokenPayload['role'],
        email: payload.email,
        full_name: payload.full_name,
        standard: payload.standard as string | undefined,
        division: payload.division as string | undefined,
      }
    }
    return null
  } catch {
    return null
  }
}
