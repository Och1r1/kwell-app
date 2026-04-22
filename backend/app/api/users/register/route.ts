import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { generateKeyPair } from '@/lib/crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, email, password } = body

    // Validate input
    if (!username || !email || !password) {
      return Response.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    })

    if (existingUser) {
      return Response.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      )
    }

    // ============================================================
    // SECURE VERSION - bcrypt
    // ============================================================
    const salt = crypto.randomBytes(16).toString('hex')
    const saltedPassword = salt + password
    const passwordHash = await bcrypt.hash(saltedPassword, 12) // 12 rounds

    // ============================================================
    // VULNERABLE VERSION - MD5 (for Task 2 demonstration only)
    // Uncomment below and comment above to demo weak password storage
    // ============================================================
    // const salt = 'not-used-in-vulnerable-version'
    // const passwordHash = crypto.createHash('md5').update(password).digest('hex')

    // Auto-generate E2EE key pair for the user
    const { publicKey, privateKey } = generateKeyPair()

    // Create the user with public key
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        salt,
        publicKey // Store public key on server
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    })

    // Return user info AND private key (client must store this!)
    return Response.json(
      {
        message: 'User registered successfully',
        user,
        privateKey, // IMPORTANT: Client must save this securely!
        warning: 'Save your private key! It will not be stored on the server.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
