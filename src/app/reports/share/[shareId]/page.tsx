import React from 'react'
import { Metadata } from 'next'
import { getClientReportByShareId } from '@/lib/agency/report-builder-service'
import { PriorityFixMatrix } from '@/components/agency/PriorityFixMatrix'
import ScoreRing from '@/components/ScoreRing'

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params
  const report = await getClientReportByShareId(shareId)

  if (!report) {
    return { title: 'Report Not Found' }
  }

  const { projectInfo } = report.reportData as any
  const agencyName = report.branding?.agencyName || 'Audit Report'

  return {
    title: `${report.title || 'Website Audit'} - ${projectInfo.name} | ${agencyName}`,
    robots: 'noindex, nofollow' // Keep client reports out of search engines
  }
}

function scoreColor(score: number): string {
  if (score >= 90) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

export default async function SharedClientReportPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const report = await getClientReportByShareId(shareId)

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Unavailable</h1>
          <p className="text-gray-500">This report link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const { projectInfo, auditInfo, issues } = report.reportData as any
  const b = report.branding || {}
  const primaryColor = b.primaryColor || '#2563eb'
  
  const showSection = (id: string) => report.selectedSections.includes(id)

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900" style={{ '--print-primary': primaryColor } as any}>
      
      {/* ── Print Header (Agency Branding) ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 print:static print:border-none">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {b.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt={b.agencyName} className="h-8 object-contain" />
            ) : (
              <span className="font-bold text-lg" style={{ color: primaryColor }}>{b.agencyName || 'Agency'}</span>
            )}
          </div>
          <div className="text-right">
            <button
              onClick={() => {}}
              className="print:hidden px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-4"
              // In a real implementation this would be a client component triggering window.print()
              // For Server Component, we use a simple inline script or just instruct the user.
              // We'll wrap in a client component or just render a button that doesn't strictly work without JS.
            >
              Print / Save PDF
            </button>
            {!b.hideOditrBranding && (
              <span className="text-xs text-gray-400">Powered by Øditr</span>
            )}
          </div>
        </div>
      </header>

      {/* Basic client-side print button enabler */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelector('button.print\\\\:hidden')?.addEventListener('click', () => window.print());
      `}} />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16 print:py-0 print:space-y-8">
        
        {/* ── Cover Page ── */}
        {showSection('cover') && (
          <section className="print:h-screen print:flex print:flex-col print:justify-center">
            <div className="text-center space-y-6">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                {report.title || 'Website Intelligence Audit'}
              </h1>
              <p className="text-xl text-gray-500">Prepared for {projectInfo.clientName || projectInfo.name}</p>
              <a href={projectInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {projectInfo.url}
              </a>
              <div className="pt-8 text-sm text-gray-400">
                Generated {new Date(report.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            {b.customIntroText && (
              <div className="mt-16 bg-white p-8 rounded-xl shadow-sm border border-gray-100 italic text-gray-600">
                &quot;{b.customIntroText}&quot;
              </div>
            )}
          </section>
        )}

        {/* ── Executive Summary ── */}
        {showSection('executive_summary') && (
          <section className="print:page-break-before">
            <h2 className="text-2xl font-bold border-b-2 pb-2 mb-6" style={{ borderColor: primaryColor }}>Executive Summary</h2>
            {report.summary ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report.summary}</p>
            ) : (
              <p className="text-gray-700 leading-relaxed">
                This report outlines the technical, performance, and SEO health of {projectInfo.url}. 
                We have identified areas that may be impacting user experience, search engine visibility, and overall conversion rates.
                Please review the priority matrix below for recommended next steps.
              </p>
            )}
          </section>
        )}

        {/* ── Revenue Impact ── */}
        {showSection('revenue_impact') && auditInfo.revenueImpactSummary && (
          <section className="print:page-break-before">
            <h2 className="text-2xl font-bold border-b-2 pb-2 mb-6" style={{ borderColor: primaryColor }}>Estimated Business Impact</h2>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Monthly Revenue at Risk</h3>
                <div className="text-4xl font-bold text-red-600 mb-2">
                  {projectInfo.currency === 'USD' ? '$' : projectInfo.currency === 'INR' ? '₹' : ''}
                  {auditInfo.revenueImpactSummary.monthlyRevenueRisk.toLocaleString()}
                </div>
                <p className="text-sm text-gray-500">
                  Estimated based on current performance bottlenecks and conversion friction points.
                </p>
              </div>
              
              <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-8">
                <h4 className="font-semibold text-gray-900 mb-3">Key Risk Factors:</h4>
                <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
                  {auditInfo.revenueImpactSummary.topIssues.map((issue: any, idx: number) => (
                    <li key={idx}>{issue.title}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 italic">
              * Note: Revenue impact is an automated estimate using industry standard conversion-dropoff models based on page speed and technical blockers. It is not a financial guarantee.
            </p>
          </section>
        )}

        {/* ── Overall Score Breakdown ── */}
        {showSection('overall_score') && (
          <section className="print:page-break-before">
            <h2 className="text-2xl font-bold border-b-2 pb-2 mb-6" style={{ borderColor: primaryColor }}>Health Scores</h2>
            
            <div className="flex flex-col md:flex-row items-center gap-12 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Overall Score</h3>
                <ScoreRing score={auditInfo.overallScore} size={160} color={scoreColor(auditInfo.overallScore)} label="" />
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-6 w-full">
                {Object.values(auditInfo.categoryScores || {}).map((cat: any) => (
                  <div key={cat.label} className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="font-medium text-gray-700">{cat.category ? cat.category.replace('_', ' ') : cat.label}</span>
                    <span className="font-bold" style={{ color: scoreColor(cat.score) }}>{cat.score}/100</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Priority Fix Matrix ── */}
        {showSection('top_recommendations') && issues && (
          <section className="print:page-break-before">
            <h2 className="text-2xl font-bold border-b-2 pb-2 mb-6" style={{ borderColor: primaryColor }}>Recommended Action Plan</h2>
            <PriorityFixMatrix issues={issues} />
          </section>
        )}

        {/* ── Core Web Vitals ── */}
        {showSection('core_web_vitals') && auditInfo.cwv && (
          <section className="print:page-break-before">
            <h2 className="text-2xl font-bold border-b-2 pb-2 mb-6" style={{ borderColor: primaryColor }}>Performance Metrics (Core Web Vitals)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {['lcp', 'inp', 'cls', 'fcp', 'ttfb', 'tbt'].map(key => {
                  const metric = auditInfo.cwv[key]
                  if (!metric) return null
                  return (
                    <div key={key} className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{key}</div>
                      <div className="text-2xl font-mono font-bold" style={{ color: scoreColor(metric.score ?? 50) }}>
                        {metric.value}
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>
        )}
      </main>

      {/* ── Print Footer ── */}
      <footer className="bg-gray-900 text-white py-8 mt-16 print:mt-8 print:bg-white print:text-gray-500 print:border-t print:border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm">
          <p>{b.footerText || `Report prepared by ${b.agencyName || 'Agency'}.`}</p>
          {b.websiteUrl && (
            <p className="mt-2"><a href={b.websiteUrl} className="hover:underline">{b.websiteUrl}</a></p>
          )}
        </div>
      </footer>

      {/* Hide elements when printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:page-break-before { page-break-before: always; }
        }
      `}} />
    </div>
  )
}
