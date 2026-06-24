import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Performance Dashboard — Øditr',
  description: 'Simulated Core Web Vitals audit with actionable recommendations. Enter a URL to see how to improve LCP, INP, and CLS scores.',
  openGraph: {
    title: 'Øditr Performance Dashboard',
    description: 'Run a simulated web vitals audit and get improvement recommendations.',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
