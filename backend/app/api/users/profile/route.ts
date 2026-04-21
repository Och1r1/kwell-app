import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// GET - Get current user's profile
export async function GET(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        skills: true,
        createdAt: true,
        assignedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            deadline: true
          }
        }
      }
    })

    if (!profile) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json({
      ...profile,
      skills: profile.skills ? JSON.parse(profile.skills) : []
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update current user's profile
export async function PUT(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { role, status, skills } = body

    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (status !== undefined) updateData.status = status
    if (skills !== undefined) updateData.skills = JSON.stringify(skills)

    const profile = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        skills: true
      }
    })

    return Response.json({
      message: 'Profile updated successfully',
      profile: {
        ...profile,
        skills: profile.skills ? JSON.parse(profile.skills) : []
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
