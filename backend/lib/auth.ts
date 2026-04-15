import { extractToken, verifyToken, JWTPayload } from './jwt'

/**
 * Authenticate a request using JWT token from Authorization header
 * Returns the user payload if authenticated, null otherwise
 */
export function authenticateRequest(request: Request): JWTPayload | null {
  const authHeader = request.headers.get('Authorization')
  const token = extractToken(authHeader)

  if (!token) {
    return null
  }

  return verifyToken(token)
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return Response.json(
    { error: message },
    { status: 401 }
  )
}

/**
 * Higher-order function to protect API routes
 * Wraps a handler and ensures the user is authenticated
 */
export function withAuth<T>(
  handler: (request: Request, user: JWTPayload, ...args: T[]) => Promise<Response>
) {
  return async (request: Request, ...args: T[]): Promise<Response> => {
    const user = authenticateRequest(request)

    if (!user) {
      return unauthorizedResponse('Invalid or missing authentication token')
    }

    return handler(request, user, ...args)
  }
}
