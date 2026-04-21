import { prisma } from '@/lib/prisma'
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth'

// POST - Generate AI task delegation suggestions
export async function POST(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { taskIds, sortBy = 'workload' } = body

    // Get unassigned tasks (or specific tasks if taskIds provided)
    const tasksWhere: any = { assignedToId: null }
    if (taskIds && taskIds.length > 0) {
      tasksWhere.id = { in: taskIds }
      delete tasksWhere.assignedToId
    }

    const tasks = await prisma.task.findMany({
      where: tasksWhere,
      orderBy: { createdAt: 'desc' }
    })

    // Get all team members with their workload
    const members = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        skills: true,
        assignedTasks: {
          where: { status: { not: 'completed' } },
          select: { id: true, estimatedHours: true }
        }
      }
    })

    // Calculate workload for each member
    const membersWithWorkload = members.map(m => ({
      id: m.id,
      username: m.username,
      role: m.role || 'Member',
      status: m.status,
      skills: m.skills ? JSON.parse(m.skills) : [],
      currentTasks: m.assignedTasks.length,
      currentHours: m.assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
    }))

    // Parse tasks
    const parsedTasks = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      deadline: t.deadline,
      estimatedHours: t.estimatedHours,
      priority: t.priority,
      requiredSkills: t.requiredSkills ? JSON.parse(t.requiredSkills) : []
    }))

    // Check if we have an AI API key
    const aiApiKey = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY

    let suggestion: string
    let assignments: any[]

    if (aiApiKey && process.env.AI_PROVIDER) {
      // Use real AI API
      const result = await callAIAPI(parsedTasks, membersWithWorkload, sortBy, aiApiKey)
      suggestion = result.suggestion
      assignments = result.assignments
    } else {
      // Use mock AI response for demo
      const result = generateMockSuggestion(parsedTasks, membersWithWorkload, sortBy)
      suggestion = result.suggestion
      assignments = result.assignments
    }

    return Response.json({
      suggestion,
      assignments,
      tasks: parsedTasks,
      members: membersWithWorkload
    })
  } catch (error) {
    console.error('AI delegate error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Call real AI API (Claude/OpenAI)
async function callAIAPI(tasks: any[], members: any[], sortBy: string, apiKey: string) {
  const provider = process.env.AI_PROVIDER || 'anthropic'

  const prompt = buildPrompt(tasks, members, sortBy)

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    return parseAIResponse(data.content[0].text, tasks, members)
  } else if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    return parseAIResponse(data.choices[0].message.content, tasks, members)
  }

  // Fallback
  return generateMockSuggestion(tasks, members, sortBy)
}

function buildPrompt(tasks: any[], members: any[], sortBy: string) {
  return `You are a task delegation assistant. Analyze the following tasks and team members, then suggest optimal assignments.

TASKS TO ASSIGN:
${tasks.map(t => `- Task "${t.title}" (${t.estimatedHours || '?'}h, ${t.priority} priority, skills: ${t.requiredSkills.join(', ') || 'none specified'})`).join('\n')}

TEAM MEMBERS:
${members.map(m => `- ${m.username} (${m.role}, skills: ${m.skills.join(', ') || 'none'}, current workload: ${m.currentTasks} tasks / ${m.currentHours}h)`).join('\n')}

OPTIMIZATION PRIORITY: ${sortBy}

Respond in this JSON format:
{
  "suggestion": "Brief explanation of why these assignments make sense",
  "assignments": [
    {"taskId": 1, "memberId": 2, "reason": "Why this person"}
  ]
}

Only output valid JSON, nothing else.`
}

function parseAIResponse(text: string, tasks: any[], members: any[]) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        suggestion: parsed.suggestion || 'AI suggested these assignments based on skills and workload.',
        assignments: parsed.assignments || []
      }
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e)
  }

  // Fallback
  return generateMockSuggestion(tasks, members, 'workload')
}

// Generate mock suggestion (for demo without API key)
function generateMockSuggestion(tasks: any[], members: any[], sortBy: string) {
  const assignments: any[] = []

  // Sort members by workload (ascending)
  const sortedMembers = [...members].sort((a, b) => {
    if (sortBy === 'workload') return a.currentHours - b.currentHours
    return a.currentTasks - b.currentTasks
  })

  // Simple round-robin assignment with skill matching
  tasks.forEach((task, index) => {
    // Try to find member with matching skills
    let bestMember = sortedMembers[0]
    let bestScore = 0

    for (const member of sortedMembers) {
      let score = 0
      // Lower workload = higher score
      score += (10 - member.currentTasks)
      // Skill match = bonus
      if (task.requiredSkills.length > 0) {
        const matchedSkills = task.requiredSkills.filter((s: string) =>
          member.skills.some((ms: string) => ms.toLowerCase().includes(s.toLowerCase()))
        )
        score += matchedSkills.length * 5
      }
      if (score > bestScore) {
        bestScore = score
        bestMember = member
      }
    }

    assignments.push({
      taskId: task.id,
      taskTitle: task.title,
      memberId: bestMember.id,
      memberName: bestMember.username,
      reason: `Best skill match and balanced workload`
    })

    // Update workload for next iteration
    bestMember.currentTasks++
    bestMember.currentHours += task.estimatedHours || 1
  })

  // Generate human-readable suggestion
  const suggestionParts = assignments.map(a =>
    `${a.memberName} should take "${a.taskTitle}"`
  )

  return {
    suggestion: suggestionParts.join(', ') + '.',
    assignments
  }
}

// PUT - Apply AI suggestions (assign tasks)
export async function PUT(request: Request) {
  const user = authenticateRequest(request)
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { assignments } = body

    if (!assignments || !Array.isArray(assignments)) {
      return Response.json({ error: 'Assignments array required' }, { status: 400 })
    }

    // Apply each assignment
    const results = await Promise.all(
      assignments.map(async (a: { taskId: number, memberId: number }) => {
        return prisma.task.update({
          where: { id: a.taskId },
          data: { assignedToId: a.memberId }
        })
      })
    )

    return Response.json({
      message: 'Tasks assigned successfully',
      updated: results.length
    })
  } catch (error) {
    console.error('Apply assignments error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
