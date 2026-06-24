import { Book, Shield, Zap, Search, Activity, Code, Users } from 'lucide-react'
import Link from 'next/link'

const TOPICS = [
  {
    title: 'Getting Started',
    icon: <Book className="text-[#c0ff00]" />,
    articles: [
      { title: 'What is Øditr?', href: '/help/what-is-oditr' },
      { title: 'How to run your first audit', href: '/help/first-audit' },
      { title: 'Understanding Øditr Score', href: '/help/understanding-score' },
    ]
  },
  {
    title: 'Core Engines',
    icon: <Zap className="text-blue-400" />,
    articles: [
      { title: 'Understanding Revenue Impact', href: '/help/revenue-impact' },
      { title: 'AI-Agent Readiness Explained', href: '/help/ai-readiness' },
      { title: 'How assumptions work', href: '/help/assumptions' },
    ]
  },
  {
    title: 'Monitoring & RUM',
    icon: <Activity className="text-pink-400" />,
    articles: [
      { title: 'How to install RUM script', href: '/help/install-rum' },
      { title: 'How to set up Monitoring', href: '/help/setup-monitoring' },
      { title: 'Deployment Guard Setup', href: '/help/deployment-guard' },
    ]
  },
  {
    title: 'Agencies & Teams',
    icon: <Users className="text-purple-400" />,
    articles: [
      { title: 'How to create client reports', href: '/help/client-reports' },
      { title: 'Using white-label reports', href: '/help/white-label' },
      { title: 'Inviting team members', href: '/help/team-members' },
    ]
  },
  {
    title: 'Developers & API',
    icon: <Code className="text-orange-400" />,
    articles: [
      { title: 'How to use API tokens', href: '/help/api-tokens' },
      { title: 'Public API Documentation', href: '/help/api-docs' },
      { title: 'Configuring Webhooks', href: '/help/webhooks' },
    ]
  },
  {
    title: 'Billing & Privacy',
    icon: <Shield className="text-green-400" />,
    articles: [
      { title: 'How billing & limits work', href: '/help/billing' },
      { title: 'Privacy and data collection', href: '/help/privacy' },
      { title: 'Exporting your data', href: '/help/exporting-data' },
    ]
  }
]

export default function HelpCenterPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Help Center
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Learn how to get the most out of Øditr&apos;s intelligence engines.
        </p>
        
        <div className="mt-8 max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search for answers..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-4 pl-12 pr-6 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#c0ff00] transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {TOPICS.map((topic, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-zinc-800 rounded-lg">
                {topic.icon}
              </div>
              <h2 className="text-xl font-bold">{topic.title}</h2>
            </div>
            <ul className="space-y-3">
              {topic.articles.map((article, j) => (
                <li key={j}>
                  <Link href={article.href} className="text-zinc-400 hover:text-[#c0ff00] transition-colors flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 mr-3"></span>
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="mt-16 text-center border-t border-zinc-800 pt-16">
        <h3 className="text-2xl font-bold mb-4">Still need help?</h3>
        <p className="text-zinc-400 mb-6">Our support team is ready to assist you.</p>
        <a href="mailto:support@oditr.com" className="inline-block bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-zinc-200 transition-colors">
          Contact Support
        </a>
      </div>
    </div>
  )
}
