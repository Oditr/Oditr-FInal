// ── PDF Report Export ──
// Client-side PDF generation using jsPDF.
// Generates a branded Oditr audit report from AuditResult.

import { jsPDF } from 'jspdf'
import type { AuditResult } from '@/app/dashboard/types'
import type { RevenueImpactResult } from '@/lib/revenue-impact'

// ── Color Helpers ──

function scoreHex(score: number): string {
  if (score >= 90) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '₹', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$',
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`
  return `${symbol}${Math.round(amount)}`
}

// ── Main Export Function ──

export function generatePdfReport(result: AuditResult, revenueReport?: RevenueImpactResult): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = margin

  // Helper to add header to a new page
  function addPageHeader(title: string) {
    doc.addPage()
    y = margin
    doc.setFillColor(15, 15, 25)
    doc.rect(0, 0, pageW, 30, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Oditr — ${title}`, margin, 18)
    
    const displayUrl = result.url.length > 50 ? result.url.slice(0, 47) + '...' : result.url
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 170, 190)
    doc.text(displayUrl, pageW - margin, 18, { align: 'right' })
    y = 40
  }

  // ── Header Bar ──
  doc.setFillColor(15, 15, 25)
  doc.rect(0, 0, pageW, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Oditr', margin, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 170, 190)
  doc.text('Web Performance Audit Report', margin, 23)

  doc.setFontSize(8)
  doc.text(new Date(result.fetchedAt).toLocaleString(), pageW - margin, 16, { align: 'right' })
  doc.text(`Strategy: ${result.strategy === 'mobile' ? 'Mobile' : 'Desktop'}`, pageW - margin, 23, { align: 'right' })

  // URL bar
  doc.setFillColor(25, 25, 40)
  doc.rect(0, 30, pageW, 8, 'F')
  doc.setTextColor(129, 140, 248)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const displayUrl = result.url.length > 70 ? result.url.slice(0, 67) + '...' : result.url
  doc.text(displayUrl, margin, 35.5)

  y = 48

  // ── Health Score ──
  const healthScore = result.healthScore ?? 0
  const healthColor = hexToRgb(scoreHex(healthScore))
  doc.setFillColor(healthColor[0], healthColor[1], healthColor[2])
  doc.roundedRect(margin, y, 36, 28, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(`${healthScore}`, margin + 18, y + 14, { align: 'center' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('HEALTH SCORE', margin + 18, y + 22, { align: 'center' })

  // ── Lighthouse Scores (4 boxes) ──
  if (result.scores) {
    const cats = [
      { label: 'Performance', score: result.scores.performance },
      { label: 'Accessibility', score: result.scores.accessibility },
      { label: 'Best Practices', score: result.scores.bestPractices },
      { label: 'SEO', score: result.scores.seo },
    ]

    const boxW = (contentW - 36 - 4 * 3) / 4
    cats.forEach((cat, i) => {
      const bx = margin + 36 + 4 + i * (boxW + 3)
      const c = hexToRgb(scoreHex(cat.score))

      doc.setFillColor(28, 28, 45)
      doc.roundedRect(bx, y, boxW, 28, 2, 2, 'F')

      doc.setTextColor(c[0], c[1], c[2])
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`${cat.score}`, bx + boxW / 2, y + 13, { align: 'center' })

      doc.setTextColor(140, 150, 170)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text(cat.label, bx + boxW / 2, y + 22, { align: 'center' })
    })
  }

  y += 36

  // ── Custom Site Audit Score ──
  if (result.customAudit) {
    doc.setFillColor(28, 28, 45)
    doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F')

    doc.setTextColor(140, 150, 170)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Custom Site Audit Score', margin + 6, y + 6)

    const auditColor = hexToRgb(scoreHex(result.customAudit.overallScore))
    doc.setTextColor(auditColor[0], auditColor[1], auditColor[2])
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`${result.customAudit.overallScore}/100`, pageW - margin - 6, y + 9, { align: 'right' })

    const findingSummary = [
      result.customAudit.critical > 0 ? `${result.customAudit.critical} critical` : null,
      result.customAudit.moderate > 0 ? `${result.customAudit.moderate} moderate` : null,
      result.customAudit.minor > 0 ? `${result.customAudit.minor} minor` : null,
    ].filter(Boolean).join(' · ')
    if (findingSummary) {
      doc.setTextColor(160, 170, 190)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(`${result.customAudit.totalFindings} findings: ${findingSummary}`, margin + 6, y + 12.5)
    }
    y += 22
  }

  // ── Core Web Vitals ──
  if (result.cwv) {
    doc.setTextColor(200, 210, 230)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Core Web Vitals', margin, y + 4)
    y += 10

    const metrics = [
      { key: 'lcp', label: 'LCP (Largest Contentful Paint)' },
      { key: 'inp', label: 'INP (Interaction to Next Paint)' },
      { key: 'cls', label: 'CLS (Cumulative Layout Shift)' },
      { key: 'fcp', label: 'FCP (First Contentful Paint)' },
      { key: 'ttfb', label: 'TTFB (Time to First Byte)' },
      { key: 'tbt', label: 'TBT (Total Blocking Time)' },
      { key: 'si', label: 'SI (Speed Index)' },
    ]

    let rowIdx = 0
    metrics.forEach(m => {
      const metric = (result.cwv as Record<string, { value: string; score: number }>)?.[m.key]
      if (!metric) return

      const rowY = y + rowIdx * 8
      doc.setFillColor(rowIdx % 2 === 0 ? 22 : 18, rowIdx % 2 === 0 ? 22 : 18, rowIdx % 2 === 0 ? 36 : 30)
      doc.rect(margin, rowY - 1, contentW, 8, 'F')

      doc.setTextColor(160, 170, 190)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(m.label, margin + 4, rowY + 4)

      const valColor = hexToRgb(scoreHex(metric.score * 100))
      doc.setTextColor(valColor[0], valColor[1], valColor[2])
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(metric.value, pageW - margin - 4, rowY + 4, { align: 'right' })

      rowIdx++
    })

    y += rowIdx * 8 + 8
  }

  // ── Field Data ──
  if (result.fieldData) {
    doc.setFillColor(28, 28, 45)
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F')

    doc.setTextColor(140, 150, 170)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Real User Experience (CrUX)', margin + 4, y + 6.5)

    const catColor = result.fieldData.overallCategory === 'FAST' ? '#34d399'
      : result.fieldData.overallCategory === 'AVERAGE' ? '#fbbf24' : '#f87171'
    const rgb = hexToRgb(catColor)
    doc.setTextColor(rgb[0], rgb[1], rgb[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(result.fieldData.overallCategory, pageW - margin - 4, y + 6.5, { align: 'right' })

    y += 16
  }

  // ── Top Opportunities ──
  if (result.opportunities && result.opportunities.length > 0) {
    if (y > 230) addPageHeader('Audit Opportunities')

    doc.setTextColor(200, 210, 230)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Opportunities', margin, y + 4)
    y += 10

    const topOps = result.opportunities.slice(0, 8)
    topOps.forEach((op, i) => {
      if (y > 265) return // near bottom of page, stop

      doc.setFillColor(i % 2 === 0 ? 22 : 18, i % 2 === 0 ? 22 : 18, i % 2 === 0 ? 36 : 30)
      doc.rect(margin, y - 1, contentW, 8, 'F')

      doc.setTextColor(200, 210, 230)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const title = op.title.length > 55 ? op.title.slice(0, 52) + '...' : op.title
      doc.text(title, margin + 4, y + 4)

      if (op.displayValue) {
        doc.setTextColor(129, 140, 248)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text(op.displayValue, pageW - margin - 4, y + 4, { align: 'right' })
      }

      y += 8
    })
    y += 4
  }

  // ── Custom Audit Category Breakdown ──
  if (result.customAudit && result.customAudit.categories.length > 0) {
    if (y > 240) addPageHeader('Audit Breakdown')

    doc.setTextColor(200, 210, 230)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Site Audit Breakdown', margin, y + 4)
    y += 10

    result.customAudit.categories.forEach((cat, i) => {
      if (y > 270) return

      doc.setFillColor(i % 2 === 0 ? 22 : 18, i % 2 === 0 ? 22 : 18, i % 2 === 0 ? 36 : 30)
      doc.rect(margin, y - 1, contentW, 8, 'F')

      doc.setTextColor(180, 190, 210)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(cat.label, margin + 4, y + 4)

      const sc = hexToRgb(scoreHex(cat.score))
      doc.setTextColor(sc[0], sc[1], sc[2])
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`${cat.score}/100`, pageW - margin - 30, y + 4, { align: 'right' })

      doc.setTextColor(140, 150, 170)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text(`${cat.passed}✓ ${cat.failed}✗`, pageW - margin - 4, y + 4, { align: 'right' })

      y += 8
    })
  }

  // ── REVENUE IMPACT SECTION ──
  if (revenueReport && revenueReport.issueImpacts.length > 0) {
    addPageHeader('Revenue Impact Analysis')
    
    // Total Revenue at Risk Box
    doc.setFillColor(28, 28, 45)
    doc.roundedRect(margin, y, contentW, 26, 2, 2, 'F')
    
    doc.setTextColor(140, 150, 170)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Estimated Revenue at Risk (Monthly)', margin + 6, y + 8)
    
    doc.setTextColor(248, 113, 113) // #f87171 red
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(revenueReport.totalEstimatedRevenueAtRisk, revenueReport.currency), margin + 6, y + 18)
    
    // Confidence indicator
    doc.setTextColor(140, 150, 170)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Confidence: ${revenueReport.overallConfidence.toUpperCase()}`, pageW - margin - 6, y + 8, { align: 'right' })
    
    y += 34
    
    // Top Priority Issues List
    doc.setTextColor(200, 210, 230)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Top Revenue Risks', margin, y + 4)
    y += 10
    
    const topImpacts = revenueReport.issueImpacts
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 15) // Top 15 to fit on a page
      
    topImpacts.forEach((impact, i) => {
      if (y > 270) {
        addPageHeader('Revenue Impact Analysis (Cont.)')
      }
      
      doc.setFillColor(i % 2 === 0 ? 22 : 18, i % 2 === 0 ? 22 : 18, i % 2 === 0 ? 36 : 30)
      doc.rect(margin, y - 1, contentW, 10, 'F')
      
      // Issue Title
      doc.setTextColor(200, 210, 230)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      const title = impact.issueTitle.length > 55 ? impact.issueTitle.slice(0, 52) + '...' : impact.issueTitle
      doc.text(title, margin + 4, y + 5.5)
      
      // Revenue Amount
      doc.setTextColor(248, 113, 113)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(impact.estimatedRevenueAtRisk, revenueReport.currency), pageW - margin - 35, y + 5.5, { align: 'right' })
      
      // Priority label
      doc.setTextColor(140, 150, 170)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text(impact.priorityLabel.replace(' Revenue Risk', ''), pageW - margin - 4, y + 5.5, { align: 'right' })
      
      y += 10
    })
  }

  // ── Footer (last page only) ──
  const footerY = doc.internal.pageSize.getHeight() - 12
  doc.setFillColor(15, 15, 25)
  doc.rect(0, footerY - 4, pageW, 16, 'F')

  doc.setTextColor(100, 110, 130)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Generated by Oditr — oditr.com', margin, footerY + 2)
  doc.text('© ' + new Date().getFullYear() + ' Oditr', pageW - margin, footerY + 2, { align: 'right' })

  // ── Save ──
  const slug = result.url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)
  const date = new Date(result.fetchedAt).toISOString().slice(0, 10)
  doc.save(`oditr-report-${slug}-${date}.pdf`)
}
