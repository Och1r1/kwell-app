import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// GET - Dashboard statistics
export async function GET(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    // Get all tasks
    const allTasks = await prisma.task.findMany()

    // Calculate stats
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'completed').length
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length
    const pendingTasks = allTasks.filter(t => t.status === 'pending').length

    // Overdue tasks (deadline passed and not completed)
    const now = new Date()
    const overdueTasks = allTasks.filter(t =>
      t.deadline && new Date(t.deadline) < now && t.status !== 'completed'
    ).length

    // Completion percentage
    const completionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

    // Get active tasks (not completed) with details
    const activeTasks = await prisma.task.findMany({
      where: { status: { not: 'completed' } },
      include: {
        assignedTo: {
          select: { id: true, username: true }
        }
      },
      orderBy: { deadline: 'asc' },
      take: 5
    })

    // Get team member count
    const memberCount = await prisma.user.count()

    // Get recent messages count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentMessages = await prisma.message.count({
      where: { createdAt: { gte: yesterday } }
    })

    return Response.json({
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        completionPercentage,
        memberCount,
        recentMessages
      },
      activeTasks: activeTasks.map(t => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo
      }))
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
