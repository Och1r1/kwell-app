import { prisma } from '@/lib/prisma'

// GET all users (for listing/searching)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        publicKey: true,
        createdAt: true
      },
      orderBy: {
        username: 'asc'
      }
    })

    return Response.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
