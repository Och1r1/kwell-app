import { prisma } from '@/lib/prisma'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET user by ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const userId = parseInt(id, 10)

    if (isNaN(userId)) {
      return Response.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        publicKey: true,
        createdAt: true
      }
    })

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return Response.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET all users (for listing)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const userId = parseInt(id, 10)
    const body = await request.json()
    const { publicKey } = body

    if (isNaN(userId)) {
      return Response.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Update user's public key (for E2EE)
    const user = await prisma.user.update({
      where: { id: userId },
      data: { publicKey },
      select: {
        id: true,
        username: true,
        email: true,
        publicKey: true,
        createdAt: true
      }
    })

    return Response.json({
      message: 'User updated successfully',
      user
    })
  } catch (error) {
    console.error('Update user error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
