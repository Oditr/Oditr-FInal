// ── Slack Webhook Alerting ──
// Sends audit regression alerts to a Slack channel via an incoming webhook.

export interface AlertSlackPayload {
  webhookUrl: string
  siteUrl: string
  droppedCategories: Array<{ label: string; oldScore: number; newScore: number; delta: number }>
  overallOldScore: number
  overallNewScore: number
  dashboardUrl?: string
}

export async function sendSlackAlert(payload: AlertSlackPayload): Promise<{ success: boolean; error?: string }> {
  const domain = payload.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const delta = payload.overallNewScore - payload.overallOldScore

  const droppedFields = payload.droppedCategories.map(c => ({
    type: 'mrkdwn',
    text: `*${c.label}*\n${c.oldScore} → *${c.newScore}* (${c.delta < 0 ? '' : '+'}${c.delta})`,
  }))

  const body = {
    text: `⚠️ *Score drop detected for ${domain}*`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⚠️ Øditr — Score Regression Alert', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `A score regression was detected for *${domain}*.\n\n*Overall Health Score:* ${payload.overallOldScore} → *${payload.overallNewScore}* (${delta < 0 ? '' : '+'}${delta} pts)`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Dropped Categories:*' },
        fields: droppedFields.slice(0, 10), // Slack supports max 10 fields per section
      },
      ...(payload.dashboardUrl ? [{
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'View Full Audit →', emoji: true },
          url: payload.dashboardUrl,
          style: 'primary',
        }],
      }] : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: 'Sent by *Øditr* automated monitoring' }],
      },
    ],
  }

  try {
    const res = await fetch(payload.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[Alerting] Slack webhook error:', text)
      return { success: false, error: `Slack webhook: ${res.status} — ${text}` }
    }

    console.log(`[Alerting] Slack alert sent for ${payload.siteUrl}`)
    return { success: true }
  } catch (e) {
    console.error('[Alerting] Slack send failed:', e)
    return { success: false, error: String(e) }
  }
}
