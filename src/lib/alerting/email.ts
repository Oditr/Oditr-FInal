// ── Email Alerting (Resend) ──
// Sends audit regression alerts via Resend email API.
// Requires RESEND_API_KEY environment variable.

export interface AlertEmailPayload {
  to: string
  siteUrl: string
  droppedCategories: Array<{ label: string; oldScore: number; newScore: number; delta: number }>
  overallOldScore: number
  overallNewScore: number
  dashboardUrl?: string
}

export async function sendEmailAlert(payload: AlertEmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Alerting] RESEND_API_KEY not set — email alerts skipped.')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  const fromEmail = process.env.ODITR_ALERT_FROM_EMAIL || 'alerts@oditr.com'
  const domain = payload.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const delta = payload.overallNewScore - payload.overallOldScore

  const droppedRows = payload.droppedCategories
    .map(c => `<tr>
      <td style="padding:6px 12px;font-size:13px;color:#e2e8f0;">${c.label}</td>
      <td style="padding:6px 12px;text-align:center;font-size:13px;color:#94a3b8;">${c.oldScore}</td>
      <td style="padding:6px 12px;text-align:center;font-size:13px;color:#f87171;font-weight:700;">${c.newScore}</td>
      <td style="padding:6px 12px;text-align:center;font-size:13px;color:#f87171;font-weight:700;">${c.delta > 0 ? '+' : ''}${c.delta}</td>
    </tr>`)
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 24px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
      <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Øditr</span>
      <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3);">ALERT</span>
    </div>
    
    <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 8px;">Score drop detected for ${domain}</h1>
    <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;">
      The latest automated audit detected a regression in your site's health score.
    </p>

    <div style="background:#1e2130;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid rgba(248,113,113,0.2);">
      <div style="display:flex;gap:24px;margin-bottom:16px;">
        <div>
          <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Previous Score</div>
          <div style="font-size:28px;font-weight:800;color:#94a3b8;">${payload.overallOldScore}</div>
        </div>
        <div style="display:flex;align-items:center;color:#64748b;font-size:20px;">→</div>
        <div>
          <div style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Current Score</div>
          <div style="font-size:28px;font-weight:800;color:#f87171;">${payload.overallNewScore} <span style="font-size:16px;">(${delta})</span></div>
        </div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Dropped Categories</div>
      <table style="width:100%;border-collapse:collapse;background:#1e2130;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Category</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Before</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">After</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;">Change</th>
          </tr>
        </thead>
        <tbody>${droppedRows}</tbody>
      </table>
    </div>

    ${payload.dashboardUrl ? `<a href="${payload.dashboardUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">View Full Audit →</a>` : ''}

    <p style="margin-top:32px;font-size:11px;color:#374151;">
      You're receiving this because you have monitoring alerts enabled in Øditr. 
      To manage your alert preferences, visit your dashboard settings.
    </p>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject: `⚠️ Score drop detected for ${domain} (${delta} pts)`,
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[Alerting] Resend API error:', text)
      return { success: false, error: `Resend API: ${res.status}` }
    }

    console.log(`[Alerting] Email alert sent to ${payload.to} for ${payload.siteUrl}`)
    return { success: true }
  } catch (e) {
    console.error('[Alerting] Email send failed:', e)
    return { success: false, error: String(e) }
  }
}
