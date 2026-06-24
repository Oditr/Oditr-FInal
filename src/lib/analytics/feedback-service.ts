// ── Feedback & NPS Service ──

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type FeedbackType =
  | 'general'
  | 'bug'
  | 'feature_request'
  | 'pricing'
  | 'onboarding'
  | 'report_quality'

export interface FeedbackPayload {
  userId: string
  workspaceId?: string
  type: FeedbackType
  message: string
  rating?: number
  page?: string
}

export interface FeatureRequestPayload {
  userId: string
  workspaceId?: string
  title: string
  description: string
  useCase?: string
  importance?: string
}

export interface BugReportPayload {
  userId: string
  workspaceId?: string
  whatHappened: string
  expectedBehavior?: string
  page?: string
  browserInfo?: string
  errorId?: string
}

export interface NpsPayload {
  userId: string
  workspaceId?: string
  score: number
  reason?: string
}

// ── Submit general feedback ──
export async function submitFeedback(payload: FeedbackPayload) {
  if (!payload.message?.trim()) throw new Error('Feedback message is required')
  if (payload.rating !== undefined && (payload.rating < 1 || payload.rating > 5)) {
    throw new Error('Rating must be between 1 and 5')
  }

  const supabase = getServiceClient()
  if (!supabase) throw new Error('Database unavailable')

  const { error } = await supabase.from('feedback').insert({
    user_id:      payload.userId,
    workspace_id: payload.workspaceId || null,
    type:         payload.type,
    message:      payload.message.slice(0, 5000),
    rating:       payload.rating || null,
    page:         payload.page || null,
    status:       'new',
  })

  if (error) throw error
  return true
}

// ── Submit feature request (maps to feedback with type=feature_request) ──
export async function submitFeatureRequest(payload: FeatureRequestPayload) {
  if (!payload.title?.trim()) throw new Error('Feature title is required')
  if (!payload.description?.trim()) throw new Error('Description is required')

  const message = [
    `**Feature:** ${payload.title}`,
    `**Description:** ${payload.description}`,
    payload.useCase ? `**Use Case:** ${payload.useCase}` : '',
    payload.importance ? `**Importance:** ${payload.importance}` : '',
  ].filter(Boolean).join('\n')

  const supabase = getServiceClient()
  if (!supabase) throw new Error('Database unavailable')

  const { error } = await supabase.from('feedback').insert({
    user_id:      payload.userId,
    workspace_id: payload.workspaceId || null,
    type:         'feature_request',
    message:      message.slice(0, 5000),
    status:       'new',
  })

  if (error) throw error
  return true
}

// ── Submit bug report ──
export async function submitBugReport(payload: BugReportPayload) {
  if (!payload.whatHappened?.trim()) throw new Error('Bug description is required')

  const message = [
    `**What Happened:** ${payload.whatHappened}`,
    payload.expectedBehavior ? `**Expected:** ${payload.expectedBehavior}` : '',
    payload.page ? `**Page:** ${payload.page}` : '',
    payload.browserInfo ? `**Browser:** ${payload.browserInfo}` : '',
    payload.errorId ? `**Error ID:** ${payload.errorId}` : '',
  ].filter(Boolean).join('\n')

  const supabase = getServiceClient()
  if (!supabase) throw new Error('Database unavailable')

  const { error } = await supabase.from('feedback').insert({
    user_id:      payload.userId,
    workspace_id: payload.workspaceId || null,
    type:         'bug',
    message:      message.slice(0, 5000),
    status:       'new',
  })

  if (error) throw error
  return true
}

// ── Submit NPS response ──
export async function submitNps(payload: NpsPayload) {
  if (payload.score < 0 || payload.score > 10) throw new Error('NPS score must be 0-10')

  const supabase = getServiceClient()
  if (!supabase) throw new Error('Database unavailable')

  const { error } = await supabase.from('nps_responses').insert({
    user_id:      payload.userId,
    workspace_id: payload.workspaceId || null,
    score:        payload.score,
    reason:       payload.reason ? payload.reason.slice(0, 1000) : null,
  })

  if (error) throw error
  return true
}

// ── Get feedback inbox (admin/owner only) ──
export async function getFeedbackInbox(
  opts: { type?: FeedbackType; status?: string; limit?: number } = {}
) {
  const supabase = getServiceClient()
  if (!supabase) return []

  let query = supabase
    .from('feedback')
    .select('id, type, message, rating, page, status, created_at, user_id, workspace_id')
    .order('created_at', { ascending: false })
    .limit(opts.limit || 50)

  if (opts.type) query = query.eq('type', opts.type)
  if (opts.status) query = query.eq('status', opts.status)

  const { data } = await query
  return data || []
}

// ── Get average NPS ──
export async function getAverageNps(): Promise<{ score: number; count: number; promoters: number; detractors: number } | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('nps_responses')
    .select('score')
    .order('created_at', { ascending: false })
    .limit(500)

  if (!data || data.length === 0) return null

  const promoters = data.filter(r => r.score >= 9).length
  const detractors = data.filter(r => r.score <= 6).length
  const score = Math.round(((promoters - detractors) / data.length) * 100)

  return { score, count: data.length, promoters, detractors }
}
