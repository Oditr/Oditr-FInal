import { getUserProfile } from './profile-service'
import { getOnboardingState } from './state-service'

export type ActionRecommendation = {
  id: string
  title: string
  description: string
  ctaText: string
  ctaLink: string
  priority: 'high' | 'medium' | 'low'
  icon: string
}

export async function getNextBestActions(userId: string): Promise<ActionRecommendation[]> {
  const profile = await getUserProfile(userId)
  const state = await getOnboardingState(userId)
  
  const actions: ActionRecommendation[] = []

  // If they haven't finished onboarding
  if (!state.is_completed && !state.completed_steps.includes('first_audit')) {
    actions.push({
      id: 'run_audit',
      title: 'Run your first audit',
      description: 'Find what is slowing, breaking, or hiding your website.',
      ctaText: 'Run Audit',
      ctaLink: '/onboarding',
      priority: 'high',
      icon: 'zap'
    })
    return actions
  }

  // Tailored recommendations based on role
  if (profile?.role_type === 'founder') {
    actions.push({
      id: 'add_revenue_inputs',
      title: 'Estimate Business Impact',
      description: 'Add traffic and conversion data to see what performance issues are costing you.',
      ctaText: 'Add Business Inputs',
      ctaLink: '/dashboard/settings',
      priority: 'high',
      icon: 'bar-chart'
    })
    actions.push({
      id: 'enable_monitoring',
      title: 'Enable Monitoring',
      description: 'Catch regressions before your users do.',
      ctaText: 'Set Up Monitoring',
      ctaLink: '/monitoring',
      priority: 'medium',
      icon: 'activity'
    })
  } else if (profile?.role_type === 'developer') {
    actions.push({
      id: 'deployment_guard',
      title: 'Set up Deployment Guard',
      description: 'Block bad deployments automatically in CI/CD.',
      ctaText: 'Configure CI/CD',
      ctaLink: '/monitoring/guard',
      priority: 'high',
      icon: 'shield'
    })
    actions.push({
      id: 'enable_monitoring',
      title: 'Schedule Daily Audits',
      description: 'Keep a constant eye on Core Web Vitals and accessibility.',
      ctaText: 'Set Up Monitoring',
      ctaLink: '/monitoring',
      priority: 'medium',
      icon: 'clock'
    })
  } else if (profile?.role_type === 'agency') {
    actions.push({
      id: 'white_label_report',
      title: 'Create a Client Report',
      description: 'Generate a white-labeled audit report to share with your clients.',
      ctaText: 'View Reports',
      ctaLink: '/reports',
      priority: 'high',
      icon: 'file-text'
    })
  } else {
    // Default recommendations
    actions.push({
      id: 'enable_monitoring',
      title: 'Enable Monitoring',
      description: 'Catch regressions before your users do.',
      ctaText: 'Set Up Monitoring',
      ctaLink: '/monitoring',
      priority: 'high',
      icon: 'activity'
    })
    actions.push({
      id: 'install_rum',
      title: 'Install Real-User Monitoring',
      description: 'Measure what actual visitors experience on your site.',
      ctaText: 'Get RUM Snippet',
      ctaLink: '/dashboard/rum',
      priority: 'medium',
      icon: 'globe'
    })
  }

  return actions
}
