'use client'

import React, { useState, useEffect } from 'react'
import type { Client } from '@/lib/agency/types'

export default function ClientsDashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  // Form State
  const [newClient, setNewClient] = useState({ clientName: '', companyName: '', website: '', contactEmail: '' })

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/agency/clients')
      if (res.ok) setClients(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })
      if (res.ok) {
        const added = await res.json()
        setClients([added, ...clients])
        setNewClient({ clientName: '', companyName: '', website: '', contactEmail: '' })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your agency clients and generate white-label reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse bg-white border border-gray-200 rounded-xl">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
              <p className="text-gray-500 text-sm">Add your first client using the form.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {clients.map(client => (
                  <li key={client.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{client.clientName}</h3>
                        {client.companyName && <p className="text-sm text-gray-500">{client.companyName}</p>}
                        {client.website && (
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                            {client.website}
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Added {new Date(client.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Client</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Name *</label>
                <input
                  type="text"
                  required
                  value={newClient.clientName}
                  onChange={e => setNewClient({ ...newClient, clientName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company / Legal Name</label>
                <input
                  type="text"
                  value={newClient.companyName}
                  onChange={e => setNewClient({ ...newClient, companyName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  value={newClient.website}
                  onChange={e => setNewClient({ ...newClient, website: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://acme.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                <input
                  type="email"
                  value={newClient.contactEmail}
                  onChange={e => setNewClient({ ...newClient, contactEmail: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <button
                type="submit"
                disabled={isAdding}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-6"
              >
                {isAdding ? 'Adding...' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
