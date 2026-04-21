import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// GET - List all team members with skills and workload
export async function GET(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    // Get all users with their assigned tasks
    const members = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        skills: true,
        assignedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
            deadline: true
          }
        }
      }
    })

    // Calculate workload for each member
    const membersWithWorkload = members.map(member => {
      const activeTasks = member.assignedTasks.filter(t => t.status !== 'completed')
      const completedTasks = member.assignedTasks.filter(t => t.status === 'completed')
      const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)

      return {
        id: member.id,
        username: member.username,
        email: member.email,
        role: member.role || 'Member',
        status: member.status,
        skills: member.skills ? JSON.parse(member.skills) : [],
        workload: {
          activeTasks: activeTasks.length,
          completedTasks: completedTasks.length,
          totalEstimatedHours: totalHours
        },
        tasks: member.assignedTasks
      }
    })

    return Response.json({ members: membersWithWorkload })
  } catch (error) {
    console.error('Get team error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
