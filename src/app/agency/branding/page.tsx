'use client'

import React, { useState, useEffect } from 'react'
import type { AgencyBranding } from '@/lib/agency/types'

export default function AgencyBrandingSettings() {
  const [branding, setBranding] = useState<Partial<AgencyBranding>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    fetch('/api/agency/branding')
      .then(res => res.json())
      .then(data => {
        setBranding(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error(err)
        setIsLoading(false)
      })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setBranding(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setBranding(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ text: '', type: '' })

    try {
      const res = await fetch('/api/agency/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding)
      })

      if (!res.ok) throw new Error('Failed to save settings')
      const savedData = await res.json()
      setBranding(savedData)
      setMessage({ text: 'Settings saved successfully!', type: 'success' })
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading settings...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">White-Label Branding</h1>
        <p className="mt-1 text-sm text-gray-500">
          Customize the appearance of client reports to match your agency&apos;s brand identity.
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-md ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white border border-gray-200 shadow-sm rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div>
              <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700">Agency Name *</label>
              <input
                type="text"
                id="agencyName"
                name="agencyName"
                required
                value={branding.agencyName || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">Logo URL</label>
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                placeholder="https://example.com/logo.png"
                value={branding.logoUrl || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">For best results, use a transparent PNG.</p>
            </div>

            <div>
              <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">Agency Website URL</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={branding.websiteUrl || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Contact Email</label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={branding.contactEmail || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">Primary Color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={branding.primaryColor || '#2563eb'}
                    onChange={handleChange}
                    className="h-10 w-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 font-mono">{branding.primaryColor || '#2563eb'}</span>
                </div>
              </div>
              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">Secondary Color</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={branding.secondaryColor || '#1e40af'}
                    onChange={handleChange}
                    className="h-10 w-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <span className="text-sm text-gray-500 font-mono">{branding.secondaryColor || '#1e40af'}</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="customIntroText" className="block text-sm font-medium text-gray-700">Custom Report Intro</label>
              <textarea
                id="customIntroText"
                name="customIntroText"
                rows={3}
                placeholder="A customized message to display at the beginning of your client reports."
                value={branding.customIntroText || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="footerText" className="block text-sm font-medium text-gray-700">Footer Text</label>
              <input
                type="text"
                id="footerText"
                name="footerText"
                placeholder="Generated by [Agency Name]"
                value={branding.footerText || ''}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="relative flex items-start pt-4 border-t border-gray-100">
              <div className="flex items-center h-5">
                <input
                  id="hideOditrBranding"
                  name="hideOditrBranding"
                  type="checkbox"
                  checked={branding.hideOditrBranding || false}
                  onChange={handleChange}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="hideOditrBranding" className="font-medium text-gray-700">Hide Øditr Branding</label>
                <p className="text-gray-500">Remove &quot;Powered by Øditr&quot; badges from exported reports.</p>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-gray-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Brand Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
