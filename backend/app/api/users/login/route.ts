import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // ============================================================
    // VULNERABLE VERSION - MD5 (for Task 2 demonstration)
    // ============================================================
    const inputHash = crypto.createHash('md5').update(password).digest('hex')
    const isPasswordValid = inputHash === user.passwordHash

    // ============================================================
    // SECURE VERSION - bcrypt (comment out above, uncomment below)
    // ============================================================
    // const saltedPassword = user.salt + password
    // const isPasswordValid = await bcrypt.compare(saltedPassword, user.passwordHash)

    if (!isPasswordValid) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    })

    // Return user info with JWT token
    return Response.json({
      message: 'Login successful',
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
