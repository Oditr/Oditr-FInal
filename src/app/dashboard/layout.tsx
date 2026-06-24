import { Metadata } from 'next'
import { FeedbackWidget } from '@/components/analytics/FeedbackWidget'

export const metadata: Metadata = {
  title: 'Dashboard — Øditr',
  description: 'Øditr performance audit dashboard.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget />
    </>
  )
}
