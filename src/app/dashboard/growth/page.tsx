'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, Users, Zap, AlertTriangle, Star, ChevronRight,
  BarChart3, Target, Shield, RefreshCw
} from 'lucide-react'

interface FunnelStep { step: string; label: string; count: number; conversionRate: number }
interface Feature { feature: string; label: string; totalEvents: number; uniqueUsers: number }
interface Insight { insightType: string; title: string; description: string; metric?: any; recommendation?: string; severity: string }
interface NpsData { score: number; count: number; promoters: number; detractors: number }

export default function GrowthDashboard() {
  const [funnels,   setFunnels]   = useState<{ activation: { steps: FunnelStep[] } | null; upgrade: { steps: FunnelStep[] } | null } | null>(null)
  const [features,  setFeatures]  = useState<{ adoption: { features: Feature[] } | null; triggers: { triggers: { feature: string; count: number }[] } | null } | null>(null)
  const [growth,    setGrowth]    = useState<{ insights: Insight[]; nps: NpsData | null; churnSignals: number } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'activation' | 'upgrade' | 'features' | 'insights'>('activation')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [f, feat, g] = await Promise.all([
        fetch('/api/analytics/funnels').then(r => r.ok ? r.json() : null),
        fetch('/api/analytics/features').then(r => r.ok ? r.json() : null),
        fetch('/api/analytics/growth-insights').then(r => r.ok ? r.json() : null),
      ])
      setFunnels(f)
      setFeatures(feat)
      setGrowth(g)
    } finally {
      setLoading(false)
    }
  }

  const regenerateInsights = async () => {
    setRefreshing(true)
    await fetch('/api/analytics/growth-insights', { method: 'POST' })
    await fetchAll()
    setRefreshing(false)
  }

  useEffect(() => { fetchAll() }, [])

  const severityColor = (s: string) => ({
    critical: 'border-red-500/40 bg-red-500/5',
    warning:  'border-yellow-500/40 bg-yellow-500/5',
    info:     'border-zinc-700 bg-zinc-900',
  }[s] || 'border-zinc-700')

  const severityBadge = (s: string) => ({
    critical: 'bg-red-500/20 text-red-400',
    warning:  'bg-yellow-500/20 text-yellow-400',
    info:     'bg-zinc-700 text-zinc-400',
  }[s] || 'bg-zinc-700 text-zinc-400')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#c0ff00]" />
              Growth Intelligence
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Product analytics, activation funnels, and growth insights
            </p>
          </div>
          <button
            onClick={regenerateInsights}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-zinc-700 hover:border-zinc-500 rounded-lg text-zinc-400 hover:text-white transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Insights
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* NPS + Churn Summary Row */}
        {growth && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                <Star className="w-3.5 h-3.5" />
                NPS Score
              </div>
              <div className="text-3xl font-bold text-white">
                {growth.nps ? growth.nps.score : '—'}
              </div>
              {growth.nps && (
                <div className="text-xs text-zinc-500 mt-1">{growth.nps.count} responses</div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                <Users className="w-3.5 h-3.5" />
                Promoters
              </div>
              <div className="text-3xl font-bold text-[#c0ff00]">
                {growth.nps ? growth.nps.promoters : '—'}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Score 9–10</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Churn Signals
              </div>
              <div className={`text-3xl font-bold ${growth.churnSignals > 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                {growth.churnSignals}
              </div>
              <div className="text-xs text-zinc-500 mt-1">At-risk users</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                <Zap className="w-3.5 h-3.5" />
                Growth Insights
              </div>
              <div className="text-3xl font-bold text-white">
                {growth.insights.length}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Auto-generated</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          {([
            { key: 'activation', label: 'Activation Funnel', icon: Target },
            { key: 'upgrade',    label: 'Upgrade Funnel',    icon: TrendingUp },
            { key: 'features',   label: 'Feature Adoption',  icon: BarChart3 },
            { key: 'insights',   label: 'Insights',          icon: Zap },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === key
                  ? 'bg-[#c0ff00] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#c0ff00] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Activation Funnel */}
            {activeTab === 'activation' && funnels?.activation && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#c0ff00]" /> Activation Funnel
                </h2>
                <div className="space-y-3">
                  {funnels.activation.steps.map((step, i) => (
                    <div key={step.step}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                          <span className="text-sm text-zinc-300">{step.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">{step.count.toLocaleString()} users</span>
                          <span className={`text-xs font-semibold ${step.conversionRate >= 60 ? 'text-[#c0ff00]' : step.conversionRate >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {step.conversionRate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${step.conversionRate >= 60 ? 'bg-[#c0ff00]' : step.conversionRate >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${step.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {funnels.activation.steps.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-8">Not enough data yet. Start tracking events first.</p>
                )}
              </div>
            )}

            {/* Upgrade Funnel */}
            {activeTab === 'upgrade' && funnels?.upgrade && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#c0ff00]" /> Upgrade Funnel
                </h2>
                <div className="space-y-3">
                  {funnels.upgrade.steps.map((step, i) => (
                    <div key={step.step}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                          <span className="text-sm text-zinc-300">{step.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">{step.count.toLocaleString()}</span>
                          <span className={`text-xs font-semibold ${step.conversionRate >= 50 ? 'text-[#c0ff00]' : step.conversionRate >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {step.conversionRate}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${step.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top upgrade triggers */}
                {features?.triggers?.triggers && features.triggers.triggers.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-zinc-800">
                    <h3 className="text-xs font-medium text-zinc-400 mb-3">Top Upgrade Triggers (Limit Reached)</h3>
                    <div className="space-y-2">
                      {features.triggers.triggers.slice(0, 5).map(t => (
                        <div key={t.feature} className="flex items-center justify-between">
                          <span className="text-sm text-zinc-300">{t.feature}</span>
                          <span className="text-xs text-zinc-500">{t.count} times</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feature Adoption */}
            {activeTab === 'features' && features?.adoption && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#c0ff00]" /> Feature Adoption
                </h2>
                <div className="space-y-3">
                  {features.adoption.features
                    .sort((a, b) => b.totalEvents - a.totalEvents)
                    .map(feat => (
                      <div key={feat.feature} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                        <div>
                          <div className="text-sm text-white font-medium">{feat.label}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{feat.uniqueUsers} unique users</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[#c0ff00]">{feat.totalEvents.toLocaleString()}</div>
                          <div className="text-xs text-zinc-500">events</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Growth Insights */}
            {activeTab === 'insights' && growth && (
              <div className="space-y-3">
                {growth.insights.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
                    <Shield className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">Not enough data yet.</p>
                    <p className="text-zinc-600 text-sm mt-1">Insights will appear once users start using Øditr.</p>
                    <button
                      onClick={regenerateInsights}
                      className="mt-4 px-4 py-2 text-sm border border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      Run analysis
                    </button>
                  </div>
                ) : (
                  growth.insights.map((insight, i) => (
                    <div key={i} className={`border rounded-2xl p-5 ${severityColor(insight.severity)}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadge(insight.severity)}`}>
                              {insight.severity}
                            </span>
                            <span className="text-xs text-zinc-500">{insight.insightType}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                          <p className="text-xs text-zinc-400 mt-1">{insight.description}</p>
                          {insight.recommendation && (
                            <div className="mt-3 flex items-start gap-2 bg-zinc-800/50 rounded-lg p-3">
                              <ChevronRight className="w-3.5 h-3.5 text-[#c0ff00] mt-0.5 shrink-0" />
                              <p className="text-xs text-zinc-300">{insight.recommendation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
