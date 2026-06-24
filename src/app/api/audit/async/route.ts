import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, userId, teamId, projectId, strategy } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Enqueue the job
    await inngest.send({
      name: 'audit/run',
      data: {
        url,
        userId,
        teamId,
        projectId,
        strategy: strategy || 'mobile'
      }
    })

    return NextResponse.json({ success: true, message: 'Audit enqueued successfully' })
  } catch (error) {
    console.error('Async audit enqueue error:', error)
    return NextResponse.json({ error: 'Failed to enqueue audit' }, { status: 500 })
  }
}
