import jwt, { SignOptions } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export interface JWTPayload {
  userId: number
  username: string
  email: string
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any)
}

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Extract token from Authorization header
 * Expected format: "Bearer <token>"
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7) // Remove "Bearer " prefix
}
