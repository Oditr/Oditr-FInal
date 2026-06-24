import { describe, it, expect } from 'vitest'
import { generateFixSnippet } from '../lib/intelligence/fix-generation-engine'
import type { Framework } from '../lib/intelligence/types'

describe('Fix Generation Engine', () => {
  it('should generate Next.js specific fixes for image issues', () => {
    const fix = generateFixSnippet('img-large', 'nextjs')
    expect(fix).toBeDefined()
    expect(fix?.language).toBe('tsx')
    expect(fix?.code).toContain('import Image from \'next/image\'')
  })

  it('should generate React specific fixes for unused javascript', () => {
    const fix = generateFixSnippet('unused-javascript', 'react')
    expect(fix).toBeDefined()
    expect(fix?.language).toBe('jsx')
    expect(fix?.code).toContain('import React, { Suspense, lazy }')
  })

  it('should generate WordPress specific fixes for cache issues', () => {
    const fix = generateFixSnippet('uses-long-cache-ttl', 'wordpress')
    expect(fix).toBeDefined()
    expect(fix?.language).toBe('apache')
    expect(fix?.code).toContain('<IfModule mod_expires.c>')
  })

  it('should fallback to generic HTML fixes for unknown frameworks on images', () => {
    const fix = generateFixSnippet('img-large', 'unknown' as Framework)
    expect(fix).toBeDefined()
    expect(fix?.language).toBe('html')
    expect(fix?.code).toContain('loading="lazy"')
  })

  it('should return undefined for unknown issues', () => {
    const fix = generateFixSnippet('some-random-issue', 'nextjs')
    expect(fix).toBeUndefined()
  })
})
