import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// GET - Contribution statistics for all team members
export async function GET(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    // Get all users with their tasks and messages
    const members = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        skills: true,
        status: true,
        createdAt: true,
        assignedTasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            estimatedHours: true
          }
        },
        sentMessages: {
          select: { id: true }
        }
      }
    })

    // Calculate total completed tasks for percentage calculation
    const totalCompletedTasks = members.reduce((sum, m) =>
      sum + m.assignedTasks.filter(t => t.status === 'completed').length, 0
    )

    // Calculate stats for each member
    const memberStats = members.map(member => {
      const completedTasks = member.assignedTasks.filter(t => t.status === 'completed').length
      const activeTasks = member.assignedTasks.filter(t => t.status !== 'completed').length
      const totalTasks = member.assignedTasks.length
      const messagesSent = member.sentMessages.length

      // Contribution percentage (based on completed tasks)
      const contributionPercent = totalCompletedTasks > 0
        ? Math.round((completedTasks / totalCompletedTasks) * 100)
        : 0

      // Total hours worked (estimated)
      const totalHours = member.assignedTasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.estimatedHours || 0), 0)

      return {
        id: member.id,
        username: member.username,
        email: member.email,
        role: member.role || 'Member',
        skills: member.skills ? JSON.parse(member.skills) : [],
        status: member.status,
        stats: {
          completedTasks,
          activeTasks,
          totalTasks,
          messagesSent,
          contributionPercent,
          totalHours
        }
      }
    })

    // Sort by contribution (highest first)
    memberStats.sort((a, b) => b.stats.contributionPercent - a.stats.contributionPercent)

    return Response.json({
      members: memberStats,
      summary: {
        totalMembers: members.length,
        totalCompletedTasks,
        totalMessages: members.reduce((sum, m) => sum + m.sentMessages.length, 0)
      }
    })
  } catch (error) {
    console.error('Contribution stats error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
