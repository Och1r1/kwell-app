import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// GET - List all tasks
export async function GET(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedToId = searchParams.get('assignedTo')

    let whereClause: any = {}

    if (status) {
      whereClause.status = status
    }
    if (assignedToId) {
      whereClause.assignedToId = parseInt(assignedToId, 10)
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: {
            id: true,
            username: true,
            skills: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Parse skills JSON for each task
    const tasksWithParsedSkills = tasks.map(task => ({
      ...task,
      requiredSkills: task.requiredSkills ? JSON.parse(task.requiredSkills) : []
    }))

    return Response.json({ tasks: tasksWithParsedSkills })
  } catch (error) {
    console.error('Get tasks error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new task
export async function POST(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { title, description, deadline, estimatedHours, priority, requiredSkills, assignedToId } = body

    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        deadline: deadline ? new Date(deadline) : null,
        estimatedHours: estimatedHours || null,
        priority: priority || 'medium',
        requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : null,
        assignedToId: assignedToId || null
      },
      include: {
        assignedTo: {
          select: { id: true, username: true }
        }
      }
    })

    return Response.json(
      { message: 'Task created successfully', task },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create task error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a task
export async function PUT(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { id, title, description, deadline, estimatedHours, priority, status, requiredSkills, assignedToId } = body

    if (!id) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status
    if (requiredSkills !== undefined) updateData.requiredSkills = JSON.stringify(requiredSkills)
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, username: true }
        }
      }
    })

    return Response.json({ message: 'Task updated successfully', task })
  } catch (error) {
    console.error('Update task error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a task
export async function DELETE(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Task ID is required' }, { status: 400 })
    }

    await prisma.task.delete({
      where: { id: parseInt(id, 10) }
    })

    return Response.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
