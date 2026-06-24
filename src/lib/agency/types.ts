

export interface Client {
  id: string
  userId: string
  clientName: string
  companyName: string | null
  website: string | null
  industry: string | null
  contactName: string | null
  contactEmail: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface AgencyBranding {
  id: string
  userId: string
  agencyName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  contactEmail: string | null
  websiteUrl: string | null
  footerText: string | null
  hideOditrBranding: boolean
  customIntroText: string | null
  createdAt: string
  updatedAt: string
}

export type ReportType = 'executive' | 'technical' | 'custom' | 'before_after'

export interface ClientReport {
  id: string
  projectId: string
  userId: string
  sourceAuditReportId: string
  reportType: ReportType
  selectedSections: string[]
  title: string | null
  summary: string | null
  branding: Partial<AgencyBranding> | null
  reportData: Record<string, any>
  shareId: string
  isPublic: boolean
  passwordProtected: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}
