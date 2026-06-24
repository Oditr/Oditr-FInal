// ── Product Analytics Event Taxonomy ──
// Canonical event names used across the entire Øditr product.
// Keep in sync with the frontend useProductAnalytics hook.

export const ProductEvents = {
  // ── Auth ──
  USER_SIGNED_UP:               'user.signed_up',
  USER_LOGGED_IN:               'user.logged_in',
  USER_LOGGED_OUT:              'user.logged_out',
  USER_PASSWORD_RESET:          'user.password_reset_requested',

  // ── Workspace ──
  WORKSPACE_CREATED:            'workspace.created',
  WORKSPACE_SWITCHED:           'workspace.switched',
  WORKSPACE_MEMBER_INVITED:     'workspace.member_invited',
  WORKSPACE_MEMBER_JOINED:      'workspace.member_joined',

  // ── Onboarding ──
  ONBOARDING_STARTED:           'onboarding.started',
  ONBOARDING_STEP_COMPLETED:    'onboarding.step_completed',
  ONBOARDING_SKIPPED:           'onboarding.skipped',
  ONBOARDING_COMPLETED:         'onboarding.completed',
  ONBOARDING_FIRST_PROJECT:     'onboarding.first_project_created',
  ONBOARDING_FIRST_AUDIT_START: 'onboarding.first_audit_started',
  ONBOARDING_FIRST_AUDIT_DONE:  'onboarding.first_audit_completed',

  // ── Project ──
  PROJECT_CREATED:              'project.created',
  PROJECT_UPDATED:              'project.updated',
  PROJECT_DELETED:              'project.deleted',
  PROJECT_MONITORING_ENABLED:   'project.monitoring_enabled',
  PROJECT_MONITORING_DISABLED:  'project.monitoring_disabled',

  // ── Audit ──
  AUDIT_STARTED:                'audit.started',
  AUDIT_COMPLETED:              'audit.completed',
  AUDIT_FAILED:                 'audit.failed',
  AUDIT_REPORT_VIEWED:          'audit.report_viewed',
  AUDIT_ISSUE_OPENED:           'audit.issue_opened',
  AUDIT_FIX_COPIED:             'audit.fix_snippet_copied',
  AUDIT_RECHECK_CLICKED:        'audit.recheck_clicked',

  // ── Revenue Impact ──
  REVENUE_PROFILE_CREATED:      'revenue.profile_created',
  REVENUE_PROFILE_UPDATED:      'revenue.profile_updated',
  REVENUE_IMPACT_CALCULATED:    'revenue.impact_calculated',
  REVENUE_RISK_VIEWED:          'revenue.risk_issue_viewed',
  REVENUE_MATRIX_VIEWED:        'revenue.priority_matrix_viewed',

  // ── AI Readiness ──
  AI_READINESS_VIEWED:          'ai_readiness.viewed',
  AI_LLMS_COPIED:               'ai_readiness.llms_template_copied',
  AI_ROBOTS_VIEWED:             'ai_readiness.robots_analysis_viewed',
  AI_SCHEMA_COPIED:             'ai_readiness.schema_snippet_copied',

  // ── Monitoring ──
  MONITORING_ENABLED:           'monitoring.enabled',
  MONITORING_SCAN_DONE:         'monitoring.scan_completed',
  MONITORING_REGRESSION:        'monitoring.regression_detected',
  MONITORING_ALERT_VIEWED:      'monitoring.alert_viewed',

  // ── Deployment Guard ──
  DEPLOY_GUARD_CONFIGURED:      'deployment_guard.configured',
  DEPLOY_GUARD_RUN:             'deployment_guard.check_run',
  DEPLOY_GUARD_PASSED:          'deployment_guard.check_passed',
  DEPLOY_GUARD_WARNED:          'deployment_guard.check_warned',
  DEPLOY_GUARD_FAILED:          'deployment_guard.check_failed',
  DEPLOY_GUARD_SNIPPET_COPIED:  'deployment_guard.github_snippet_copied',

  // ── RUM ──
  RUM_SETUP_VIEWED:             'rum.setup_viewed',
  RUM_SNIPPET_COPIED:           'rum.snippet_copied',
  RUM_FIRST_EVENT:              'rum.first_event_received',
  RUM_DASHBOARD_VIEWED:         'rum.dashboard_viewed',

  // ── Agency ──
  CLIENT_CREATED:               'client.created',
  CLIENT_REPORT_GENERATED:      'client_report.generated',
  CLIENT_REPORT_SHARED:         'client_report.shared',
  CLIENT_REPORT_EXPORTED:       'client_report.exported',
  WHITE_LABEL_UPDATED:          'white_label.branding_updated',

  // ── Billing ──
  BILLING_PRICING_VIEWED:       'billing.pricing_viewed',
  BILLING_UPGRADE_CLICKED:      'billing.upgrade_clicked',
  BILLING_CHECKOUT_STARTED:     'billing.checkout_started',
  BILLING_CHECKOUT_DONE:        'billing.checkout_completed',
  BILLING_CHECKOUT_FAILED:      'billing.checkout_failed',
  BILLING_LIMIT_REACHED:        'billing.limit_reached',
  BILLING_FEATURE_LOCKED:       'billing.feature_locked_viewed',
  BILLING_PLAN_CHANGED:         'billing.plan_changed',
  BILLING_CANCELLED:            'billing.subscription_cancelled',

  // ── Feedback ──
  FEEDBACK_SUBMITTED:           'feedback.submitted',
  FEATURE_REQUEST_SUBMITTED:    'feature_request.submitted',
  BUG_REPORT_SUBMITTED:         'bug_report.submitted',
  NPS_SUBMITTED:                'nps.submitted',

  // ── Errors ──
  APP_ERROR:                    'app.error_occurred',
  AUDIT_ERROR:                  'audit.error_occurred',
  BILLING_ERROR:                'billing.error_occurred',
  RUM_ERROR:                    'rum.error_occurred',
} as const

export type ProductEventName = typeof ProductEvents[keyof typeof ProductEvents]

export interface ProductEventPayload {
  eventName: ProductEventName | string
  userId?: string | null
  workspaceId?: string | null
  projectId?: string | null
  sessionId?: string | null
  properties?: Record<string, string | number | boolean | null>
}

// ── Sensitive field names — never log these in properties ──
const SENSITIVE_FIELDS = new Set([
  'password', 'token', 'secret', 'apiKey', 'api_key', 'key',
  'cardNumber', 'card_number', 'cvv', 'ssn', 'privateKey',
  'stripe_secret', 'supabase_key', 'service_role',
])

export function sanitizeProperties(
  props: Record<string, any> = {}
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(props)) {
    if (SENSITIVE_FIELDS.has(k.toLowerCase())) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      // Truncate overly long strings
      clean[k] = typeof v === 'string' ? v.slice(0, 500) : v
    }
  }
  return clean
}
