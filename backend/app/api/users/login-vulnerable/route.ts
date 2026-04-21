import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/jwt'

/**
 * VULNERABLE LOGIN ENDPOINT - FOR TASK 2 DEMONSTRATION ONLY
 *
 * This endpoint is intentionally vulnerable to SQL injection.
 * It uses raw SQL with string concatenation instead of parameterized queries.
 *
 * Attack example:
 *   Email: anything' OR '1'='1' --
 *   Password: anything
 *
 * This bypasses authentication because the query becomes:
 *   SELECT * FROM User WHERE email = 'anything' OR '1'='1' --' AND passwordHash = '...'
 *
 * The -- comments out the password check, and '1'='1' is always true,
 * so it returns the first user in the database.
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // ============================================================
    // VULNERABLE: Raw SQL with string concatenation
    // Never do this in production!
    // ============================================================
    const query = `SELECT * FROM User WHERE email = '${email}' AND passwordHash = '${password}'`

    console.log('[VULNERABLE SQL]:', query) // Log to show the injection

    // Execute raw SQL query
    const users: any[] = await prisma.$queryRawUnsafe(query)

    if (users.length === 0) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    })

    // Return success - attacker is now logged in!
    return Response.json({
      message: 'Login successful (VULNERABLE ENDPOINT)',
      warning: 'This endpoint is vulnerable to SQL injection!',
      injectedQuery: query, // Show the query for demo purposes
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return Response.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
