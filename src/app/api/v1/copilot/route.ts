import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

export const runtime = 'edge'

const SYSTEM_PROMPT = `You are Oditr Copilot — an expert web performance consultant embedded inside the Oditr Intelligence Platform.

## Your Role
You help developers and site owners understand their performance audit results and take action to improve their Core Web Vitals and overall site health.

## Rules
1. **Only reference data from the audit context provided.** Never invent metrics, scores, or issues that aren't in the report.
2. When the user asks "why is my site slow?", cite specific issues from the prioritized list (fix-first, fix-next, optional).
3. Reference exact metric values (LCP, INP, CLS, FCP, TTFB, TBT, SI) when available.
4. When recommending fixes, use the framework detected in the report (e.g., Next.js, React, WordPress) to give framework-specific advice.
5. Use plain language first, then follow up with technical details. Assume the user might not be deeply technical.
6. If the report includes a Oditr Health Score, reference it naturally (e.g., "Your health score is 42 out of 100, mainly dragged down by speed…").
7. Keep responses concise and actionable. Use markdown formatting (headers, lists, code blocks) for clarity.
8. If asked about something NOT in the audit data, say so honestly: "That information wasn't captured in this audit."
9. When discussing business impact, use the businessSummary narratives from the report.
10. If there are no issues (totalIssues === 0), congratulate the user and suggest monitoring strategies.

## Response Style
- Lead with the most impactful insight
- Use bullet points for multiple items
- Include code snippets in fenced blocks when relevant
- Keep responses under 400 words unless the user asks for detail
`

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'AI Copilot is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY in your .env file.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Build the context block from the intelligence report
    let contextBlock = ''
    if (context) {
      contextBlock = `\n\n## Current Audit Context\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n`
    }

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT + contextBlock,
      messages,
      maxOutputTokens: 1500,
      temperature: 0.4,
    })

    return result.toTextStreamResponse()
  } catch (err: any) {
    console.error('[Copilot API] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
