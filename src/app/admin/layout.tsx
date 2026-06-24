import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isSystemAdmin } from '@/lib/admin/admin-service'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const isAdmin = await isSystemAdmin(user.id)
  if (!isAdmin) {
    redirect('/dashboard') // Or a 403 page
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-[#c0ff00]">Øditr Admin</h1>
        <a href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Return to App
        </a>
      </header>
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
