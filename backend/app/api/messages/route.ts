import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// POST - Send a new message (requires authentication)
export async function POST(request: Request) {
  // Get sender from JWT token
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { receiverId, content } = body

    // Sender ID comes from JWT token
    const senderId = user.userId

    // Validate input
    if (!receiverId || !content) {
      return Response.json(
        { error: 'receiverId and content are required' },
        { status: 400 }
      )
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } })

    if (!receiver) {
      return Response.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    // Create the message
    // Note: In E2EE, the content would already be encrypted by the client
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true
          }
        }
      }
    })

    return Response.json(
      { message: 'Message sent successfully', data: message },
      { status: 201 }
    )
  } catch (error) {
    console.error('Send message error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get messages for authenticated user
// ?type=received - messages received by current user
// ?type=sent - messages sent by current user
// ?withUser=X - messages between current user and user X
export async function GET(request: Request) {
  // Get current user from JWT token
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const withUserId = searchParams.get('withUser')

    let whereClause: any = {}

    // If chatting with specific user
    if (withUserId) {
      const otherUserId = parseInt(withUserId, 10)
      if (isNaN(otherUserId)) {
        return Response.json({ error: 'Invalid user ID' }, { status: 400 })
      }
      whereClause = {
        OR: [
          { senderId: user.userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: user.userId }
        ]
      }
    } else if (type === 'received') {
      whereClause = { receiverId: user.userId }
    } else if (type === 'sent') {
      whereClause = { senderId: user.userId }
    } else {
      // All messages for this user
      whereClause = {
        OR: [
          { senderId: user.userId },
          { receiverId: user.userId }
        ]
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, username: true }
        },
        receiver: {
          select: { id: true, username: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    })

    return Response.json({ messages })

  } catch (error) {
    console.error('Get messages error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
