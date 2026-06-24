import { LoginForm } from '@/components/auth/LoginForm'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Log in to Øditr',
  description: 'Log in to your account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight">
          Log in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Or{' '}
          <a href="/signup" className="font-medium text-[#c0ff00] hover:text-[#a0d000]">
            start your 14-day free trial
          </a>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-zinc-800">
          <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
