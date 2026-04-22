import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// GET - Get messages for a channel
export async function GET(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const channel = searchParams.get('channel')

    if (!channel) {
      return Response.json({ error: 'Channel name is required' }, { status: 400 })
    }

    // Valid channels
    const validChannels = ['general', 'coding', 'design', 'meetings']
    if (!validChannels.includes(channel)) {
      return Response.json({ error: 'Invalid channel' }, { status: 400 })
    }

    // Get messages for the channel
    const messages = await prisma.channelMessage.findMany({
      where: { channel },
      include: {
        sender: {
          select: { id: true, username: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100 // Limit to last 100 messages
    })

    return Response.json({ messages })
  } catch (error) {
    console.error('Get channel messages error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Send a message to a channel
export async function POST(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { channel, content } = body

    if (!channel || !content) {
      return Response.json({ error: 'Channel and content are required' }, { status: 400 })
    }

    // Valid channels
    const validChannels = ['general', 'coding', 'design', 'meetings']
    if (!validChannels.includes(channel)) {
      return Response.json({ error: 'Invalid channel' }, { status: 400 })
    }

    // Create message
    const message = await prisma.channelMessage.create({
      data: {
        channel,
        content,
        senderId: user.userId
      },
      include: {
        sender: {
          select: { id: true, username: true }
        }
      }
    })

    return Response.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Send channel message error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
