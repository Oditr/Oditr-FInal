'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, CheckCircle2, Rocket, Code, Briefcase, ShoppingCart, Search } from 'lucide-react'

export default function OnboardingFlow() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<string>('loading')
  const [loading, setLoading] = useState(true)

  // Profile Form State
  const [roleType, setRoleType] = useState<string>('')

  // Project Form State
  const [url, setUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [businessType, setBusinessType] = useState('saas')

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/state')
      if (res.ok) {
        const data = await res.json()
        if (data.state.is_completed) {
          router.push('/dashboard')
        } else {
          setCurrentStep(data.state.current_step || 'welcome')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  const advanceStep = async (step: string, action = 'complete') => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, action })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.state.is_completed) {
          router.push('/dashboard')
        } else {
          setCurrentStep(data.state.current_step)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setLoading(true)
    try {
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_type: roleType })
      })
      setCurrentStep('project_setup') // optimistically advance
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: projectName || url, businessType })
      })
      if (res.ok) {
        await advanceStep('project_setup')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && currentStep === 'loading') {
    return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-xl">
      <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100 relative overflow-hidden">
        
        {/* Step: Welcome */}
        {currentStep === 'welcome' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Rocket className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Øditr</h2>
            <p className="text-gray-500 mb-8">
              Øditr helps you find what is slowing, breaking, blocking, or hiding your website — and what it may cost if ignored.
            </p>
            <button
              onClick={() => advanceStep('welcome')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step: User Type */}
        {currentStep === 'user_type' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">How do you plan to use Øditr?</h2>
            <p className="text-gray-500 mb-6 text-sm">This helps us tailor your recommendations and setup checklist.</p>
            
            <div className="grid grid-cols-1 gap-3 mb-6">
              {[
                { id: 'founder', label: 'Founder / Startup', icon: Rocket, desc: 'I want to optimize my own product' },
                { id: 'developer', label: 'Developer', icon: Code, desc: 'I want technical fixes and CI/CD guards' },
                { id: 'agency', label: 'Agency / Freelancer', icon: Briefcase, desc: 'I audit sites for my clients' },
                { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart, desc: 'I want to improve conversion rates' },
              ].map((role) => (
                <div
                  key={role.id}
                  onClick={() => setRoleType(role.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center gap-4
                    ${roleType === role.id ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-200'}`}
                >
                  <role.icon className={`w-5 h-5 ${roleType === role.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">{role.label}</div>
                    <div className="text-xs text-gray-500">{role.desc}</div>
                  </div>
                  {roleType === role.id && <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />}
                </div>
              ))}
            </div>
            <button
              onClick={saveProfile}
              disabled={!roleType || loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
            </button>
          </div>
        )}

        {/* Step: Project Setup */}
        {currentStep === 'project_setup' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Add your first website</h2>
            <p className="text-gray-500 mb-6 text-sm">Let&apos;s set up your first project to start finding performance and revenue-impact issues.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name (Optional)</label>
                <input
                  type="text"
                  placeholder="My awesome site"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="saas">SaaS</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="lead_gen">Lead Generation</option>
                  <option value="content">Blog / Content</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={createProject}
                disabled={!url || loading}
                className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Project'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Business Profile / Impact Inputs (Skippable) */}
        {currentStep === 'business_profile' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Estimate Business Impact</h2>
            <p className="text-gray-500 mb-4 text-sm">
              Add some rough numbers to estimate how much performance issues are costing you. 
              <br/><span className="text-blue-600 font-medium">You can skip this now and we&apos;ll use cautious assumptions.</span>
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Visitors</label>
                <input type="number" placeholder="10000" className="w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Order / Lead Value ($)</label>
                <input type="number" placeholder="50" className="w-full rounded-md border border-gray-300 px-3 py-2 sm:text-sm" />
              </div>
            </div>
            
            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={() => advanceStep('business_profile')}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Inputs
              </button>
              <button
                onClick={() => advanceStep('business_profile', 'skip')}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step: First Audit */}
        {currentStep === 'first_audit' && (
          <div className="text-center animate-in fade-in slide-in-from-bottom-4 py-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-50 mb-6">
              <Search className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Running your first audit...</h2>
            <p className="text-gray-500 mb-8 text-sm max-w-sm mx-auto">
              We are scanning Core Web Vitals, SEO, Accessibility, Security, and AI-Readiness. This may take up to 60 seconds.
            </p>
            
            {/* Simulate Progress */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-8 overflow-hidden">
              <div className="bg-blue-600 h-2 rounded-full animate-[progress_15s_ease-in-out_forwards]" style={{ width: '0%' }}></div>
            </div>

            <button
              onClick={() => advanceStep('first_audit')}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Skip waiting and go to Dashboard
            </button>
            <style jsx>{`
              @keyframes progress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 95%; }
              }
            `}</style>
          </div>
        )}

        {/* Catch-all or loading transition state */}
        {!['welcome', 'user_type', 'project_setup', 'business_profile', 'first_audit'].includes(currentStep) && !loading && (
          <div className="text-center py-8">
            <Loader2 className="animate-spin text-blue-500 w-8 h-8 mx-auto mb-4" />
            <p className="text-gray-500">Preparing your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  )
}
