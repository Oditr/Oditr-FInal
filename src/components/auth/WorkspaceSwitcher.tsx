'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

// We define a simple UI for the Workspace Switcher.
// This typically uses a dropdown menu like Radix UI or Headless UI,
// but for simplicity we'll implement a custom dropdown here.

interface Workspace {
  id: string
  name: string
  slug: string
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Fetch workspaces from our API endpoint
    async function fetchWorkspaces() {
      try {
        const res = await fetch('/api/auth/workspaces')
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data.workspaces)
          setActiveWorkspace(data.activeWorkspace)
        }
      } catch (err) {
        console.error('Failed to load workspaces', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkspaces()
  }, [])

  const handleSwitch = async (ws: Workspace) => {
    try {
      const res = await fetch('/api/auth/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: ws.id })
      })
      
      if (res.ok) {
        setActiveWorkspace(ws)
        setIsOpen(false)
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to switch workspace', err)
    }
  }

  if (isLoading) {
    return <div className="h-10 w-48 bg-zinc-800 animate-pulse rounded-md" />
  }

  if (!activeWorkspace) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-left text-white bg-zinc-900 border border-zinc-800 rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#c0ff00]"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 bg-gradient-to-br from-[#c0ff00] to-[#80c000] rounded text-black flex items-center justify-center font-bold text-xs uppercase">
            {activeWorkspace.name.substring(0, 1)}
          </div>
          <span className="truncate">{activeWorkspace.name}</span>
        </div>
        <ChevronsUpDown className="w-4 h-4 ml-2 text-zinc-400" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute left-0 z-20 w-64 mt-2 origin-top-left bg-zinc-900 border border-zinc-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <div className="px-3 py-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Workspaces
              </div>
              
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws)}
                  className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left hover:bg-zinc-800 transition-colors ${
                    ws.id === activeWorkspace.id ? 'text-white' : 'text-zinc-400'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 flex items-center justify-center font-bold text-xs uppercase">
                      {ws.name.substring(0, 1)}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {ws.id === activeWorkspace.id && (
                    <Check className="w-4 h-4 text-[#c0ff00]" />
                  )}
                </button>
              ))}

              <div className="my-1 border-t border-zinc-800" />
              
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/dashboard/settings/workspace/new')
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                role="menuitem"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/dashboard/settings/workspace')
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                role="menuitem"
              >
                <Settings className="w-4 h-4 mr-2" />
                Workspace Settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
