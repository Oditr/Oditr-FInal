// ── Discord Webhook Alerting ──
// Sends audit regression alerts to a Discord channel via a webhook URL.

export interface AlertDiscordPayload {
  webhookUrl: string
  siteUrl: string
  droppedCategories: Array<{ label: string; oldScore: number; newScore: number; delta: number }>
  overallOldScore: number
  overallNewScore: number
  dashboardUrl?: string
}

export async function sendDiscordAlert(payload: AlertDiscordPayload): Promise<{ success: boolean; error?: string }> {
  const domain = payload.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const delta = payload.overallNewScore - payload.overallOldScore
  const color = delta < -10 ? 0xef4444 : delta < -5 ? 0xf97316 : 0xfbbf24 // red / orange / yellow

  const fields = payload.droppedCategories.map(c => ({
    name: c.label,
    value: `${c.oldScore} → **${c.newScore}** (${c.delta < 0 ? '' : '+'}${c.delta})`,
    inline: true,
  }))

  const body = {
    username: 'Øditr Alerts',
    avatar_url: 'https://oditr.com/icon-192.png',
    embeds: [
      {
        title: `⚠️ Score Drop Detected — ${domain}`,
        description: `The latest automated audit detected a regression.\n\n**Overall Health Score:** ${payload.overallOldScore} → **${payload.overallNewScore}** (${delta < 0 ? '' : '+'}${delta} pts)`,
        color,
        fields,
        footer: {
          text: 'Øditr automated monitoring',
        },
        timestamp: new Date().toISOString(),
        ...(payload.dashboardUrl ? { url: payload.dashboardUrl } : {}),
      },
    ],
  }

  try {
    const res = await fetch(payload.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Discord returns 204 No Content on success
    if (res.status !== 204 && !res.ok) {
      const text = await res.text()
      console.error('[Alerting] Discord webhook error:', text)
      return { success: false, error: `Discord webhook: ${res.status} — ${text}` }
    }

    console.log(`[Alerting] Discord alert sent for ${payload.siteUrl}`)
    return { success: true }
  } catch (e) {
    console.error('[Alerting] Discord send failed:', e)
    return { success: false, error: String(e) }
  }
}
