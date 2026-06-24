import { SignupForm } from '@/components/auth/SignupForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up for Øditr',
  description: 'Create an account to start auditing',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-[#c0ff00] hover:text-[#a0d000]">
            Log in here
          </a>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-zinc-800">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
