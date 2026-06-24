'use client'

import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export type ChecklistItem = {
  id: string
  label: string
  href: string
  isComplete: boolean
}

interface ActivationChecklistProps {
  score: number
  items: ChecklistItem[]
}

export default function ActivationChecklist({ score, items }: ActivationChecklistProps) {
  if (score >= 100) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Setup Guide</h3>
          <span className="text-sm font-medium text-blue-600">{score}% Complete</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${score}%` }}></div>
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                {item.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 group-hover:text-gray-400" />
                )}
                <span className={`text-sm ${item.isComplete ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                  {item.label}
                </span>
              </div>
              {!item.isComplete && <ChevronRight className="h-4 w-4 text-gray-400" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
