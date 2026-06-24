import { describe, it, expect } from 'vitest'
import { detectFramework } from '@/lib/intelligence/framework-detector'
import { generateMetricNarratives } from '@/lib/intelligence/business-impact-engine'
import { generateFixSnippet } from '@/lib/intelligence/fix-generation-engine'

describe('Sprint 2: Intelligence Engine Expansion', () => {
  describe('Framework Detector Versioning', () => {
    it('detects Next.js App Router', () => {
      const html = '<script>self.__next_f.push([1,""])</script>'
      const headers = { 'x-powered-by': 'Next.js' }
      const result = detectFramework(html, headers, 'https://example.com')
      
      expect(result.framework).toBe('nextjs')
      expect(result.version).toBe('app-router')
    })

    it('detects Next.js Pages Router', () => {
      const html = '<script id="__NEXT_DATA__" type="application/json">{}</script>'
      const headers = { 'x-powered-by': 'Next.js' }
      const result = detectFramework(html, headers, 'https://example.com')
      
      expect(result.framework).toBe('nextjs')
      expect(result.version).toBe('pages-router')
    })

    it('detects React 18', () => {
      const html = '<script src="react@18.0.0/umd/react.production.min.js"></script>'
      const result = detectFramework(html, {}, 'https://example.com')
      
      expect(result.framework).toBe('react')
      expect(result.version).toBe('18')
    })
  })

  describe('Business Impact Engine - E-commerce', () => {
    it('calculates conversion drop for e-commerce with severe delay', () => {
      const cwv = {
        lcp: { numericValue: 4000, value: '4 s', score: 20 },
      } as any

      const narratives = generateMetricNarratives(cwv, 'ecommerce')
      const lcpNarrative = narratives.find(n => n.metric === 'LCP')

      expect(lcpNarrative).toBeDefined()
      // 4000ms - 2500ms = 1500ms excess delay
      // 1500 / 100 * 0.7 = 10.5%
      expect(lcpNarrative?.contextualNote).toContain('10.5% drop in conversion')
    })

    it('does not calculate conversion drop for non-ecommerce', () => {
      const cwv = {
        lcp: { numericValue: 4000, value: '4 s', score: 20 },
      } as any

      const narratives = generateMetricNarratives(cwv, 'blog')
      const lcpNarrative = narratives.find(n => n.metric === 'LCP')

      expect(lcpNarrative?.contextualNote).not.toContain('drop in conversion')
    })
  })

  describe('Fix Generation Engine - SEO & Best Practices', () => {
    it('generates meta-description snippet for Next.js', () => {
      const snippet = generateFixSnippet('meta-description', 'nextjs')
      expect(snippet).toBeDefined()
      expect(snippet?.language).toBe('tsx')
      expect(snippet?.code).toContain('export const metadata')
    })

    it('generates image-alt snippet generally', () => {
      const snippet = generateFixSnippet('image-alt', 'react')
      expect(snippet).toBeDefined()
      expect(snippet?.language).toBe('html')
      expect(snippet?.code).toContain('alt=')
    })
  })
})
