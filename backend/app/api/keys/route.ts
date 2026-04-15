import { prisma } from '@/lib/prisma'
import { generateKeyPair } from '@/lib/crypto'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

/**
 * POST /api/keys - Generate a new key pair for the authenticated user
 *
 * The server generates the key pair and:
 * - Stores the PUBLIC key in the database (for other users to encrypt messages to you)
 * - Returns the PRIVATE key to the client (MUST be stored securely client-side)
 *
 * IMPORTANT: The private key is returned ONCE and never stored on the server!
 */
export async function POST(request: Request) {
  // Authenticate the request
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    // Generate new RSA key pair
    const { publicKey, privateKey } = generateKeyPair()

    // Store ONLY the public key in the database
    await prisma.user.update({
      where: { id: user.userId },
      data: { publicKey }
    })

    // Return both keys to the client
    // IMPORTANT: Client must securely store the private key!
    return Response.json({
      message: 'Key pair generated successfully',
      publicKey,
      privateKey,
      warning: 'Store your private key securely! It will NOT be stored on the server.'
    }, { status: 201 })

  } catch (error) {
    console.error('Key generation error:', error)
    return Response.json(
      { error: 'Failed to generate key pair' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/keys?userId=X - Get a user's public key
 * Used to encrypt messages TO that user
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return Response.json(
      { error: 'userId query parameter is required' },
      { status: 400 }
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: {
        id: true,
        username: true,
        publicKey: true
      }
    })

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.publicKey) {
      return Response.json(
        { error: 'User has not generated a key pair yet' },
        { status: 404 }
      )
    }

    return Response.json({
      userId: user.id,
      username: user.username,
      publicKey: user.publicKey
    })

  } catch (error) {
    console.error('Get public key error:', error)
    return Response.json(
      { error: 'Failed to get public key' },
      { status: 500 }
    )
  }
}
