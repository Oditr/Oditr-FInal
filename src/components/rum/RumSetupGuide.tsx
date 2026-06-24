'use client'

import React, { useState } from 'react'
import { CopyIcon, CheckIcon } from 'lucide-react'

export function RumSetupGuide({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false)

  // Determine the base URL dynamically based on where the app is running
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://oditr.app'
  
  const snippet = `<script
  async
  src="${baseUrl}/rum/oditr-rum.js"
  data-project-id="${projectId}">
</script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Install Tracking Snippet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Add this snippet to your website to start measuring real user performance. We recommend placing it just before the closing <code>&lt;/body&gt;</code> tag. The script is extremely lightweight, privacy-first, and never blocks your page load.
      </p>

      <div className="relative bg-gray-50 rounded-lg border border-gray-200 p-4 font-mono text-sm overflow-x-auto text-gray-800">
        <pre>{snippet}</pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 transition-colors text-gray-500 hover:text-gray-900"
          title="Copy snippet"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">Copy the snippet</h4>
          <p className="text-xs text-gray-500 mt-1">Click the copy button above.</p>
        </div>
      </div>
      
      <div className="mt-4 flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">Add to your website</h4>
          <p className="text-xs text-gray-500 mt-1">Paste it into your website&apos;s global footer or HTML template.</p>
        </div>
      </div>
      
      <div className="mt-4 flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">3</div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">Publish and verify</h4>
          <p className="text-xs text-gray-500 mt-1">Deploy your site and visit a page. Data will appear here within seconds.</p>
        </div>
      </div>
    </div>
  )
}
