// ── Scheduler Service ──
// Finds projects with monitoring due and runs scans.
// Designed to be called from a Vercel cron endpoint.

import type { MonitoredProject, RegressionReport } from './types'
import { getDueProjects, markScanComplete } from './project-service'
import { auditResultToSnapshot, saveAuditSnapshot, getLatestTwoSnapshots } from './audit-history-service'
import { detectRegression } from './regression-service'
import { dispatchAlert } from './alert-service'

interface SchedulerResult {
  projectId: string
  projectName: string
  url: string
  success: boolean
  reportId?: string
  regressionSeverity?: string
  error?: string
}

/**
 * Run scheduled monitoring scans for all due projects.
 * Runs each project sequentially to respect PSI rate limits.
 * Errors in one project do not crash the scheduler.
 */
export async function runScheduledScans(
  userId: string,
  auditFn: (url: string) => Promise<any>
): Promise<SchedulerResult[]> {
  const dueProjects = await getDueProjects(userId)

  if (dueProjects.length === 0) {
    console.log('[scheduler] No projects due for scanning.')
    return []
  }

  console.log(`[scheduler] ${dueProjects.length} project(s) due for scanning.`)
  const results: SchedulerResult[] = []

  for (const project of dueProjects) {
    const result = await runSingleProjectScan(project, userId, auditFn)
    results.push(result)

    // Small delay between projects to be respectful to PSI rate limits
    if (dueProjects.indexOf(project) < dueProjects.length - 1) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  return results
}

/**
 * Run a single monitoring scan for one project.
 */
export async function runSingleProjectScan(
  project: MonitoredProject,
  userId: string,
  auditFn: (url: string) => Promise<any>
): Promise<SchedulerResult> {
  const baseResult: SchedulerResult = {
    projectId: project.id,
    projectName: project.name,
    url: project.url,
    success: false,
  }

  try {
    console.log(`[scheduler] Scanning: ${project.name} (${project.url})`)

    // Run the audit using the provided audit function
    const auditResponse = await auditFn(project.url)

    // Convert to snapshot and save
    const snapshot = auditResultToSnapshot(project.id, auditResponse)
    await saveAuditSnapshot(snapshot, userId)

    // Mark project as scanned
    await markScanComplete(
      project.id,
      snapshot.id,
      snapshot.overallScore,
      project.monitoringFrequency,
      userId
    )

    // Compare with previous report
    const { previous } = await getLatestTwoSnapshots(project.id, userId)
    let regression: RegressionReport | null = null

    if (previous) {
      regression = detectRegression(previous, snapshot)

      // Dispatch alert if significant regression
      if (regression.alertPayload) {
        await dispatchAlert(regression.alertPayload).catch(e => {
          console.error(`[scheduler] Alert dispatch failed for ${project.name}:`, e)
        })
      }
    }

    console.log(`[scheduler] ✅ ${project.name}: score=${snapshot.overallScore}, regression=${regression?.severity || 'first-scan'}`)

    return {
      ...baseResult,
      success: true,
      reportId: snapshot.id,
      regressionSeverity: regression?.severity,
    }
  } catch (error: any) {
    console.error(`[scheduler] ❌ ${project.name} scan failed:`, error?.message)
    return {
      ...baseResult,
      error: error?.message || 'Unknown error',
    }
  }
}

/**
 * Calculate next scan time from frequency.
 */
export function getNextScanTime(
  frequency: 'daily' | 'weekly' | 'monthly',
  from: Date = new Date()
): Date {
  const next = new Date(from)
  if (frequency === 'daily') next.setDate(next.getDate() + 1)
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7)
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  return next
}
