// ── Alerting Orchestrator ──
// Dispatches score regression alerts to all configured channels.

import { sendEmailAlert, type AlertEmailPayload } from './email'
import { sendSlackAlert, type AlertSlackPayload } from './slack'
import { sendDiscordAlert, type AlertDiscordPayload } from './discord'

export interface MonitoringAlertConfig {
  // Email
  emailEnabled: boolean
  emailTo?: string
  // Slack
  slackEnabled: boolean
  slackWebhookUrl?: string
  // Discord
  discordEnabled: boolean
  discordWebhookUrl?: string
  // Sensitivity
  scoreDropThreshold: number // minimum drop in points to trigger alert (default: 5)
  // Dashboard link
  dashboardUrl?: string
}

export interface ScoreSnapshot {
  categoryId: string
  label: string
  score: number
}

export interface AlertResult {
  triggered: boolean
  reason?: string
  channelResults: Record<string, { success: boolean; error?: string }>
}

/**
 * Compares old and new category scores and dispatches alerts
 * to all configured channels if a regression is detected.
 */
export async function dispatchRegressionAlerts(
  siteUrl: string,
  oldSnapshot: ScoreSnapshot[],
  newSnapshot: ScoreSnapshot[],
  config: MonitoringAlertConfig,
): Promise<AlertResult> {
  const threshold = config.scoreDropThreshold ?? 5

  // Build score maps
  const oldMap = new Map(oldSnapshot.map(s => [s.categoryId, s]))
  const newMap = new Map(newSnapshot.map(s => [s.categoryId, s]))

  // Find dropped categories
  const droppedCategories: Array<{ label: string; oldScore: number; newScore: number; delta: number }> = []

  for (const [id, newItem] of Array.from(newMap)) {
    const oldItem = oldMap.get(id)
    if (!oldItem) continue
    const delta = newItem.score - oldItem.score
    if (delta <= -threshold) {
      droppedCategories.push({
        label: newItem.label,
        oldScore: oldItem.score,
        newScore: newItem.score,
        delta,
      })
    }
  }

  // No significant regression — no alert needed
  if (droppedCategories.length === 0) {
    return { triggered: false, reason: `No category dropped by ≥${threshold} points.`, channelResults: {} }
  }

  // Calculate overall score delta (average across all categories)
  const oldAvg = Math.round(oldSnapshot.reduce((sum, s) => sum + s.score, 0) / (oldSnapshot.length || 1))
  const newAvg = Math.round(newSnapshot.reduce((sum, s) => sum + s.score, 0) / (newSnapshot.length || 1))

  const basePayload = {
    siteUrl,
    droppedCategories,
    overallOldScore: oldAvg,
    overallNewScore: newAvg,
    dashboardUrl: config.dashboardUrl,
  }

  const channelResults: AlertResult['channelResults'] = {}
  const tasks: Promise<void>[] = []

  // Email
  if (config.emailEnabled && config.emailTo) {
    tasks.push(
      sendEmailAlert({ ...basePayload, to: config.emailTo })
        .then(r => { channelResults['email'] = r })
    )
  }

  // Slack
  if (config.slackEnabled && config.slackWebhookUrl) {
    tasks.push(
      sendSlackAlert({ ...basePayload, webhookUrl: config.slackWebhookUrl })
        .then(r => { channelResults['slack'] = r })
    )
  }

  // Discord
  if (config.discordEnabled && config.discordWebhookUrl) {
    tasks.push(
      sendDiscordAlert({ ...basePayload, webhookUrl: config.discordWebhookUrl })
        .then(r => { channelResults['discord'] = r })
    )
  }

  await Promise.allSettled(tasks)

  console.log(`[Alerting] Regression alerts dispatched for ${siteUrl}:`, channelResults)
  return { triggered: true, channelResults }
}
