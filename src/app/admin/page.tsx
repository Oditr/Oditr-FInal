'use client'

import { useEffect, useState } from 'react'
import { Users, Briefcase, FileText, Activity, Star, MessageSquare } from 'lucide-react'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(res => res.json())
      .then(data => {
        if (data.overview) setStats(data.overview)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-zinc-400">Loading system overview...</div>
  }

  if (!stats) {
    return <div className="text-red-400">Failed to load stats.</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<Users />} label="Total Users" value={stats.totalUsers} />
        <StatCard icon={<Briefcase />} label="Workspaces" value={stats.totalWorkspaces} />
        <StatCard icon={<FileText />} label="Total Reports" value={stats.totalReports} />
        <StatCard icon={<Activity />} label="Total Projects" value={stats.totalProjects} />
        <StatCard icon={<Star className="text-yellow-400" />} label="Pro/Enterprise Subs" value={stats.proSubscriptions} />
        <StatCard icon={<MessageSquare />} label="Unhandled Feedback" value={stats.unhandledFeedback} />
      </div>

      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Admin functionality is currently restricted. Connect to the Supabase dashboard to modify user data, manage plans, or process feedback.
        </p>
        <div className="flex space-x-4">
          <a href="https://supabase.com/dashboard/project/_/auth/users" target="_blank" rel="noreferrer" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors">
            Manage Users
          </a>
          <a href="https://supabase.com/dashboard/project/_/editor" target="_blank" rel="noreferrer" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors">
            Database Editor
          </a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex items-start space-x-4">
      <div className="p-3 bg-zinc-800 rounded-lg text-zinc-300">
        {icon}
      </div>
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}
