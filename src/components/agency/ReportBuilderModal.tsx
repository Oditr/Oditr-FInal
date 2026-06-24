'use client'

import React, { useState } from 'react'

interface Props {
  projectId: string
  auditReportId: string
  onClose: () => void
}

export function ReportBuilderModal({ projectId, auditReportId, onClose }: Props) {
  const [reportType, setReportType] = useState('executive')
  const [selectedSections, setSelectedSections] = useState<string[]>([
    'cover', 'executive_summary', 'revenue_impact', 'overall_score', 'top_recommendations'
  ])
  const [title, setTitle] = useState('Website Audit Report')
  const [summary, setSummary] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [error, setError] = useState('')

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setReportType(val)
    if (val === 'executive') {
      setSelectedSections(['cover', 'executive_summary', 'revenue_impact', 'overall_score', 'top_recommendations'])
    } else if (val === 'technical') {
      setSelectedSections(['cover', 'overall_score', 'core_web_vitals', 'technical_issues', 'ai_readiness'])
    } else if (val === 'custom') {
      // keep current or reset
    }
  }

  const toggleSection = (sec: string) => {
    setReportType('custom') // switch to custom if they manually edit sections
    setSelectedSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${auditReportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          reportType,
          selectedSections,
          title,
          summary
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate report')
      }

      const report = await res.json()
      const url = `${window.location.origin}/reports/share/${report.shareId}`
      setShareUrl(url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Generate Client Report
                </h3>
                <div className="mt-4 space-y-4">
                  {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}
                  
                  {!shareUrl ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Report Title</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Report Template</label>
                        <select
                          value={reportType}
                          onChange={handleTypeChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="executive">Executive Summary</option>
                          <option value="technical">Technical Developer Report</option>
                          <option value="custom">Custom Configuration</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Included Sections</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'cover', label: 'Cover Page' },
                            { id: 'executive_summary', label: 'Executive Summary' },
                            { id: 'revenue_impact', label: 'Revenue Impact' },
                            { id: 'overall_score', label: 'Score Breakdown' },
                            { id: 'core_web_vitals', label: 'Core Web Vitals' },
                            { id: 'technical_issues', label: 'Technical Issues' },
                            { id: 'ai_readiness', label: 'AI-Agent Readiness' },
                            { id: 'top_recommendations', label: 'Top Recommendations' }
                          ].map(sec => (
                            <label key={sec.id} className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                              <input
                                type="checkbox"
                                checked={selectedSections.includes(sec.id)}
                                onChange={() => toggleSection(sec.id)}
                                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <span>{sec.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Executive Summary Text (Optional)</label>
                        <textarea
                          rows={3}
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Provide a custom summary for the client..."
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-6 bg-green-50 rounded-lg text-center">
                      <h4 className="text-lg font-medium text-green-900 mb-2">Report Generated Successfully!</h4>
                      <p className="text-sm text-green-800 mb-4">Share this link with your client or open it to print as a PDF.</p>
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareUrl)
                            alert('Copied to clipboard!')
                          }}
                          className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Copy
                        </button>
                      </div>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        Open Report
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {!shareUrl && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || selectedSections.length === 0}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Share Link'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {shareUrl ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
