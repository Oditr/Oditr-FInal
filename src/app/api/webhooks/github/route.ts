import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { autonomousPRFix } from '@/lib/agent/fix-pr-engine'

// Verifies the GitHub webhook signature
function verifySignature(req: Request, body: string, secret: string) {
  const signature = req.headers.get('x-hub-signature-256')
  if (!signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  const digest = `sha256=${hmac.update(body).digest('hex')}`
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const secret = process.env.GITHUB_WEBHOOK_SECRET

    if (secret && !verifySignature(req, rawBody, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = req.headers.get('x-github-event')
    const payload = JSON.parse(rawBody)

    // Trigger on issue comments like "@vitalfix run" or "opened" issues/PRs
    if (event === 'issue_comment' && payload.action === 'created') {
      const commentBody = payload.comment.body.toLowerCase()
      if (commentBody.includes('@vitalfix run')) {
        // Trigger autonomous agent asynchronously
        // In a real app we'd use Inngest or a background queue
        setTimeout(() => {
          autonomousPRFix(payload).catch(console.error)
        }, 0)
        
        return NextResponse.json({ status: 'Agent triggered' }, { status: 202 })
      }
    }

    // Example trigger: if a new release/deployment is made, we run verification
    if (event === 'deployment_status' && payload.deployment_status.state === 'success') {
      const url = payload.deployment_status.environment_url
      if (url) {
        // Trigger post-PR verification
        // verificationLoop(url, payload).catch(console.error)
      }
    }

    return NextResponse.json({ status: 'Ignored' }, { status: 200 })
  } catch (error) {
    console.error('GitHub Webhook Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
