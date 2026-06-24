'use client'

import { Zap, BarChart, Shield, Clock, FileText, Globe } from 'lucide-react'
import Link from 'next/link'
import type { ActionRecommendation } from '@/lib/onboarding/recommendation-service'

const iconMap: Record<string, any> = {
  'zap': Zap,
  'bar-chart': BarChart,
  'shield': Shield,
  'clock': Clock,
  'file-text': FileText,
  'globe': Globe
}

export default function NextBestActionCard({ action }: { action: ActionRecommendation }) {
  const Icon = iconMap[action.icon] || Zap

  return (
    <div className={`rounded-xl shadow-sm border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all
      ${action.priority === 'high' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100' : 'bg-white border-gray-200'}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${action.priority === 'high' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{action.title}</h4>
            {action.priority === 'high' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{action.description}</p>
        </div>
      </div>
      
      <Link
        href={action.ctaLink}
        className={`shrink-0 inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors
          ${action.priority === 'high' 
            ? 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent' 
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'}`}
      >
        {action.ctaText}
      </Link>
    </div>
  )
}
